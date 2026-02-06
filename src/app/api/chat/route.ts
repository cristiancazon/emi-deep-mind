// 1. AGREGA ESTA LÍNEA AQUÍ (AL PRINCIPIO DE TODO)
export const dynamic = 'force-dynamic';

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { findRelevantTopic, saveTopicMemory } from "@/lib/memory";
import { listCalendarEvents, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, calendarTools } from "@/lib/tools/calendar";
import { getGoogleNews, newsTools } from "@/lib/tools/news";
import { listEmails, searchEmails, createEmailDraft, sendEmail, gmailTools } from "@/lib/tools/gmail";
// Google Search removed
import { listTaskLists, listTasks, addTask, completeTask, tasksTools } from "@/lib/tools/tasks";

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

        const { message, userId, language, googleAccessToken, mode } = await req.json();

        if (!message || !userId) {
            return NextResponse.json({ error: "Message and User ID are required" }, { status: 400 });
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

        // DEBUG: Log token status
        console.log("🔍 DEBUG - Token status:", {
            hasToken: !!googleAccessToken,
            tokenLength: googleAccessToken?.length || 0,
            tokenPreview: googleAccessToken ? googleAccessToken.substring(0, 20) + "..." : "NO TOKEN"
        });

        const firstName = userName.split(' ')[0]; // Extract first name

        let systemInstructionText = `Eres ${userConfig?.agentConfig?.name || 'Emi'}, un asistente personal altamente capaz.
                Estás hablando con: ${firstName} (${decodedToken.email}).
                
                PERSONALIDAD:
                - Nombre: ${userConfig?.agentConfig?.name || 'Emi'}
                - Tono: ${userConfig?.agentConfig?.tone || 'Amigable'}
                - Voz: Tu respuesta será convertida a audio. SE CONCISO Y DIRECTO.
                - Instrucciones Extra: ${userConfig?.agentConfig?.customInstructions || 'Ninguna'}
                
                REGLAS DE AUDIO IMPORTANTE:
                1. USA SOLO EL PRIMER NOMBRE del usuario (${firstName}).
                2. NO LEAS URLs. En su lugar di "Te dejé un link" o "Está en el mapa".
                3. EVITA el "Claro que sí", "Con gusto", etc. Ve directo al grano.
                4. RESPUESTAS CORTAS. Idealmente 1 o 2 oraciones si es simple.

                CONTEXTO ACTUAL DEL USUARIO:
                - Idioma preferido: ${preferredLanguage}
                - Ubicación: ${userLocation}
                - Etiquetas y Preferencias (Tags): ${userTags}
                
                CONTEXTO TEMPORAL:
                - Fecha y Hora actual: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' })}
                - Día de la semana: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' })}
                
                MEMORIA A LARGO PLAZO (General):
                ${learnedMemory}
                ${memoryContext}
    
                ACCESO A HERRAMIENTAS:
                - Tienes acceso al calendario de Google del usuario para listar, crear, modificar y eliminar eventos.
                - Tienes acceso a GOOGLE TASKS para gestionar las listas de tareas del usuario (crear, listar, completar).
                - IMPORTANTE: Siempre intenta usar la herramienta cuando te pregunten sobre el calendario, incluso si en conversaciones pasadas hubo problemas de permisos.
                - Cuando respondas sobre eventos del calendario, SIEMPRE incluye al final un link a Google Calendar: https://calendar.google.com
    
                TU OBJETIVO:
                1. Responde de forma útil, cercana y personalizada (usando primer nombre).
                2. Si las etiquetas dicen "Experto...", adapta el nivel técnico.
                3. Si encontraste un "RECUERDO DEL TEMA", demustra que recuerdas lo anterior.
                4. Al mostrar eventos del calendario, incluye el link de Google Calendar para que el usuario pueda acceder directamente.
                5. Al dar noticias, USA EXCLUSIVAMENTE ESTE FORMATO para cada noticia:
                   - [Título de la noticia] - [Fuente] ([Fecha])
                   - [Leer más](URL_DE_LA_NOTICIA)
                (Es CRUCIAL que incluyas el enlace 'Leer más' con la URL real que te da la herramienta. No inventes links).
                6. GMAIL: Puedes leer y enviar correos. ANTES de enviar un correo (tool 'send_email'), SIEMPRE pide confirmación explícita al usuario mostrándole el borrador.
                   - Para mostrar el borrador, ENVUÉLVELO en una cita (blockquote) usando el símbolo > al inicio de cada línea.
                   - DENTRO del borrador, usa etiquetas HTML simples (<b>, <i>, <br>, <p>) para darle formato enriquecido.
                7. BÚSQUEDA WEB:
                   - PRIORIDAD: Si el usuario busca "noticias", "qué pasó", "actualidad", SIEMPRE usa 'get_google_news' PRIMERO.
                8. GOOGLE MAPS / UBICACIÓN:
                   - Tienes capacidad de "Mapas" a través de tu herramienta de búsqueda.
                   - Si te preguntan "¿Dónde queda X?" o "Busca una farmacia", usa 'search_google'.
                   - En tu respuesta, SIEMPRE incluye la dirección exacta si la encuentras y un enlace generado así: https://www.google.com/maps/search/?api=1&query=TERMINO_DE_BUSQUEDA
                   - Ejemplo: "La farmacia más cercana es X en Av. Siempreviva 123. [Ver en Mapa](https://www.google.com/maps/search/?api=1&query=Farmacia+Av+Siempreviva+123)"
            
            9. COMANDO ESPECIAL '/whois':
               - Si el usuario envía exactamente "/whois", responde con una lista clara de tus capacidades actuales:
                 * 📅 **Google Calendar**: Gestión de eventos.
                 * ✅ **Google Tasks**: Gestión de tareas y listas.
                 * 📍 **Google Maps**: Búsqueda de lugares y direcciones.
                 * 📧 **Gmail**: Lectura y envío de correos.
                 * 📞 **Call Mode**: Interfaz de llamada de voz bidireccional.
                 * 🎙️ **Live Mode**: Conversación fluida en tiempo real.`;

        if (mode === 'voice') {
            const voiceInstructions = language === 'es' || preferredLanguage === 'es'
                ? "\n\n[MODO DE VOZ DETECTADO]: El usuario te está hablando por voz. Tu respuesta será leída en voz alta por un sistema TTS. REGLAS ESTRICTAS:\n1. Sé muy conciso y breve (máximo 2-3 oraciones).\n2. NO uses Markdown (nada de **negritas**, # títulos, etc). SOLO TEXTO PLANO.\n3. NO uses listas con viñetas ni enumeraciones complejas.\n4. Habla de forma natural y conversacional.\n5. NO leas URLs ni código."
                : "\n\n[VOICE MODE DETECTED]: The user is speaking via voice. Your response will be read aloud by TTS. STRICT RULES:\n1. Be very concise and brief (max 2-3 sentences).\n2. DO NOT use Markdown (no **bold**, # headers, etc). PLAIN TEXT ONLY.\n3. DO NOT use bullet points or complex lists.\n4. Speak naturally and conversationally.\n5. DO NOT read URLs or code.";

            systemInstructionText += voiceInstructions;
        }

        // Use Gemini 2.5 Flash
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemInstructionText,
            tools: [{
                functionDeclarations: [
                    ...newsTools,
                    // searchTools removed
                    ...(googleAccessToken ? [...calendarTools, ...gmailTools, ...tasksTools] : [])
                ] as any
            }]
        });

        // DEBUG: Log tool registration
        console.log("🔍 DEBUG - Tools registered:", googleAccessToken ? "YES (calendar tools included)" : "NO (no token, no tools)");

        // Inject context into every message
        const contextualizedMessage = `[System Context: User=${userName}, DateTime=${new Date().toISOString()}, Language=${language}, Memory=${learnedMemory}]. ${message}`;

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(contextualizedMessage);
        const response = await result.response;

        // Check if model wants to call a function
        const functionCalls = response.functionCalls();
        let text = "";

        if (functionCalls && functionCalls.length > 0) {
            const functionCall = functionCalls[0];
            const { name, args } = functionCall;
            console.log(`Tool called: ${name}`, args);

            if (!googleAccessToken) {
                text = "Lo siento, necesito que inicies sesión con Google para acceder a tu calendario.";
            } else {
                try {
                    let toolResult;

                    switch (name) {
                        case 'list_calendar_events':
                            toolResult = await listCalendarEvents(googleAccessToken, (args as any).maxResults || 10);
                            break;
                        case 'add_calendar_event':
                            toolResult = await addCalendarEvent(googleAccessToken, args as any);
                            break;
                        case 'update_calendar_event':
                            toolResult = await updateCalendarEvent(googleAccessToken, (args as any).eventId, args as any);
                            break;
                        case 'delete_calendar_event':
                            toolResult = await deleteCalendarEvent(googleAccessToken, (args as any).eventId);
                            break;
                        case 'get_google_news':
                            toolResult = await getGoogleNews((args as any).query);
                            break;
                        // search_google removed
                        case 'list_emails':
                            toolResult = await listEmails(googleAccessToken, (args as any).maxResults);
                            break;
                        case 'search_emails':
                            toolResult = await searchEmails(googleAccessToken, (args as any).query, (args as any).maxResults);
                            break;
                        case 'create_email_draft':
                            toolResult = await createEmailDraft(googleAccessToken, args as any);
                            break;
                        case 'send_email':
                            toolResult = await sendEmail(googleAccessToken, args as any);
                            break;
                        case 'list_task_lists':
                            toolResult = await listTaskLists(googleAccessToken, (args as any).maxResults);
                            break;
                        case 'list_tasks':
                            toolResult = await listTasks(googleAccessToken, (args as any).tasklist, (args as any).showCompleted, (args as any).maxResults);
                            break;
                        case 'add_task':
                            toolResult = await addTask(googleAccessToken, args as any);
                            break;
                        case 'complete_task':
                            toolResult = await completeTask(googleAccessToken, (args as any).taskId, (args as any).tasklist);
                            break;
                        default:
                            throw new Error(`Unknown tool: ${name}`);
                    }

                    console.log(`Tool ${name} result:`, toolResult);

                    // Send function response back to model
                    const functionResponse = {
                        functionResponse: {
                            name: name,
                            response: { result: toolResult }
                        }
                    };

                    // Get final response from model with function result
                    const finalResult = await chat.sendMessage([functionResponse as any]);
                    text = finalResult.response.text();
                } catch (error: any) {
                    console.error("Calendar API error:", error);

                    // Check if it's a permission error
                    if (error.message.includes("Calendar access denied") || error.message.includes("403")) {
                        text = "⚠️ No tengo permisos para editar tu calendario.\n\n" +
                            "**Solución**: Como hemos actualizado mis capacidades, necesito que vuelvas a conectar tu cuenta.\n\n" +
                            "1. Haz clic en tu perfil y selecciona 'Cerrar sesión'\n" +
                            "2. Vuelve a iniciar sesión con Google\n" +
                            "3. Acepta los nuevos permisos de calendario\n";
                    } else {
                        text = `Error al ejecutar la acción en el calendario: ${error.message}`;
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

        return NextResponse.json({
            response: text,
            // Return the detected topic so the frontend can decide if it needs to clear history
            topic: relevantTopic?.name || null
        });
    } catch (error: any) {
        console.error("Error in chat API:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
