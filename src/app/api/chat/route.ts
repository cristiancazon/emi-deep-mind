import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { findRelevantTopic, saveTopicMemory } from "@/lib/memory";
import { listCalendarEvents } from "@/lib/tools/calendar";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(idToken);
        } catch {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { message, userId, language, googleAccessToken } = await req.json();

        if (!message || !userId) {
            return NextResponse.json({ error: "Missing message or userId" }, { status: 400 });
        }

        // Verify token matches requested userId to prevent spoofing
        if (decodedToken.uid !== userId) {
            return NextResponse.json({ error: "Forbidden: Token mismatch" }, { status: 403 });
        }

        const userName = decodedToken.name || decodedToken.email?.split('@')[0] || "Usuario";

        // Fetch User Profile (Explicit Config)
        const userConfigRef = adminDb.collection("users").doc(userId).collection("config").doc("profile");
        const userConfigSnap = await userConfigRef.get();
        const userConfig = userConfigSnap.exists ? userConfigSnap.data() : {};

        const preferredLanguage = userConfig?.language || language || 'es'; // Prioritize saved config
        const userLocation = userConfig?.location || "Unknown";
        const userTags = userConfig?.tags && Array.isArray(userConfig.tags) ? userConfig.tags.join(', ') : "None";

        // Fetch User Profile (Implicit Memory)
        const userProfileRef = adminDb.collection("users").doc(userId);
        const userProfileSnap = await userProfileRef.get();
        const userProfileData = userProfileSnap.exists ? userProfileSnap.data() : {};
        const learnedMemory = userProfileData?.memory ? JSON.stringify(userProfileData.memory) : "None yet.";

        // Fetch Chat History
        const userRef = doc(db, "conversations", userId);
        const userSnap = await getDoc(userRef);

        let history: { role: string; parts: { text: string }[] }[] = [];

        if (userSnap.exists()) {
            const data = userSnap.data();
            const storedMessages = data.messages || [];
            history = storedMessages.map((msg: any) => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));
        } else {
            await setDoc(userRef, { messages: [] });
        }

        // --- TOPIC MEMORY RETRIEVAL ---
        const relevantTopic = await findRelevantTopic(userId, message);
        let memoryContext = "";

        if (relevantTopic) {
            console.log(`Topic '${relevantTopic.name}' found for query: ${message}`);
            memoryContext = `\nRECUERDO DEL TEMA '${relevantTopic.name}':\n${relevantTopic.summary}\n(Úsalo para dar continuidad a lo que ya sabes sobre esto).`;
        } else {
            console.log("No specific topic found for query:", message);
        }
        // -----------------------------

        // Calendar Tool Declaration
        const calendarTool = {
            name: "list_calendar_events",
            description: "Lists upcoming events from the user's Google Calendar. Use this to answer questions about the user's schedule, appointments, and what they have planned.",
            parameters: {
                type: SchemaType.OBJECT,
                properties: {
                    maxResults: {
                        type: SchemaType.NUMBER,
                        description: "Maximum number of events to return. Default is 10."
                    }
                }
            }
        };

        // DEBUG: Log token status
        console.log("🔍 DEBUG - Token status:", {
            hasToken: !!googleAccessToken,
            tokenLength: googleAccessToken?.length || 0,
            tokenPreview: googleAccessToken ? googleAccessToken.substring(0, 20) + "..." : "NO TOKEN"
        });

        // Use Gemini 2.5 Flash
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `Eres ${userConfig?.agentConfig?.name || 'Emi'}, un asistente personal altamente capaz.
            Estás hablando con: ${userName} (${decodedToken.email}).
            
            PERSONALIDAD:
            - Nombre: ${userConfig?.agentConfig?.name || 'Emi'}
            - Tono: ${userConfig?.agentConfig?.tone || 'Amigable'}
            - Instrucciones Extra: ${userConfig?.agentConfig?.customInstructions || 'Ninguna'}
            
            CONTEXTO ACTUAL DEL USUARIO:
            - Idioma preferido: ${preferredLanguage}
            - Ubicación: ${userLocation}
            - Etiquetas y Preferencias (Tags): ${userTags}
            
            MEMORIA A LARGO PLAZO (General):
            ${learnedMemory}
            ${memoryContext}

            ACCESO A HERRAMIENTAS:
            - Tienes acceso al calendario de Google del usuario a través de la herramienta list_calendar_events. Úsala para responder preguntas sobre su agenda, citas y eventos próximos.
            - IMPORTANTE: Siempre intenta usar la herramienta cuando te pregunten sobre el calendario, incluso si en conversaciones pasadas hubo problemas de permisos. La memoria puede estar desactualizada.
            - Cuando respondas sobre eventos del calendario, SIEMPRE incluye al final un link a Google Calendar: https://calendar.google.com

            TU OBJETIVO:
            1. Responde de forma útil, cercana y personalizada.
            2. Si las etiquetas dicen "Experto...", adapta el nivel técnico.
            3. Si encontraste un "RECUERDO DEL TEMA", demustra que recuerdas lo anterior.
            4. Al mostrar eventos del calendario, incluye el link de Google Calendar para que el usuario pueda acceder directamente.`,
            tools: googleAccessToken ? [{ functionDeclarations: [calendarTool as any] }] : undefined
        });

        // DEBUG: Log tool registration
        console.log("🔍 DEBUG - Tools registered:", googleAccessToken ? "YES (calendar tool included)" : "NO (no token, no tools)");

        // Inject context into every message
        const contextualizedMessage = `[System Context: User=${userName}, Email=${decodedToken.email}, Language=${language}, Memory=${learnedMemory}]. ${message}`;

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(contextualizedMessage);
        const response = await result.response;

        // Check if model wants to call a function
        const functionCall = response.functionCalls()?.[0];
        let text = "";

        if (functionCall && functionCall.name === "list_calendar_events") {
            console.log("Calendar tool called with args:", functionCall.args);

            if (!googleAccessToken) {
                text = "Lo siento, necesito que inicies sesión con Google para acceder a tu calendario.";
            } else {
                try {
                    // Execute the calendar function
                    const events = await listCalendarEvents(
                        googleAccessToken,
                        (functionCall.args as any).maxResults || 10
                    );

                    console.log("Calendar events retrieved:", events);

                    // Send function response back to model
                    const functionResponse = {
                        functionResponse: {
                            name: "list_calendar_events",
                            response: { events }
                        }
                    };

                    // Get final response from model with function result
                    const finalResult = await chat.sendMessage([functionResponse as any]);
                    text = finalResult.response.text();
                } catch (error: any) {
                    console.error("Calendar API error:", error);

                    // Check if it's a permission error
                    if (error.message.includes("Calendar access denied") || error.message.includes("403")) {
                        text = "⚠️ No tengo permisos para acceder a tu calendario.\n\n" +
                            "**Solución**: Necesitas cerrar sesión y volver a iniciar sesión con Google para otorgar permisos de calendario.\n\n" +
                            "1. Haz clic en tu perfil y selecciona 'Cerrar sesión'\n" +
                            "2. Vuelve a iniciar sesión con Google\n" +
                            "3. Acepta los permisos de calendario cuando Google te lo pida\n" +
                            "4. Intenta nuevamente";
                    } else {
                        text = `Error al acceder al calendario: ${error.message}`;
                    }
                }
            }
        } else {
            text = response.text();
        }

        // Check for Memory Updates
        const memoryMatch = text.match(/\[\[UPDATE_MEMORY: ({.*?})\]\]/);
        if (memoryMatch) {
            try {
                const memoryUpdate = JSON.parse(memoryMatch[1]);
                console.log("Learning new info:", memoryUpdate);

                // Update Firestore Profile
                await userProfileRef.set({
                    memory: {
                        ...userProfileData?.memory,
                        ...memoryUpdate
                    }
                }, { merge: true });

                // Remove the hidden block from the response sent to user
                text = text.replace(memoryMatch[0], '').trim();
            } catch (e) {
                console.error("Failed to parse memory update:", e);
            }
        }

        await updateDoc(userRef, {
            messages: arrayUnion(
                { role: 'user', content: message, timestamp: new Date().toISOString() },
                { role: 'model', content: text, timestamp: new Date().toISOString() }
            )
        });

        // --- ASYNC MEMORY UPDATE ---
        // Fire and forget (don't await) to speed up response
        // In Vercel, use waitUntil(saveTopicMemory(...)) if available, or just call it:
        const conversationalContext = [
            ...history.slice(-3).map((h: any) => ({ role: h.role, content: h.parts[0].text })), // Last 3 messages for context
            { role: 'user', content: message },
            { role: 'model', content: text }
        ];

        saveTopicMemory(userId, conversationalContext).catch(err => console.error("Background memory update failed:", err));
        // ---------------------------

        return NextResponse.json({ response: text });
    } catch (error: any) {
        console.error("Error in chat API:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
