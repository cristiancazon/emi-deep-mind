import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/firebase"; // Keep client SDK for now if needed, or switch to adminDb for better practices later.
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore"; // Client SDK imports
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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

        const { message, userId, language } = await req.json();

        if (!message || !userId) {
            return NextResponse.json({ error: "Missing message or userId" }, { status: 400 });
        }

        // Verify token matches requested userId to prevent spoofing
        if (decodedToken.uid !== userId) {
            return NextResponse.json({ error: "Forbidden: Token mismatch" }, { status: 403 });
        }

        const userName = decodedToken.name || decodedToken.email?.split('@')[0] || "Usuario";

        // Fetch User Profile (Long-term Memory)
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

        // Use Gemini 2.0 Flash Experimental
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            systemInstruction: `Eres Emi, un asistente personal altamente capaz.
            Estás hablando con: ${userName} (${decodedToken.email}).
            Idioma del navegador: ${language || 'es'}.
            
            MEMORIA A LARGO PLAZO (Lo que sabes del usuario):
            ${learnedMemory}

            TU OBJETIVO:
            1. Responde de forma útil, cercana y personalizada.
            2. Si el usuario te cuenta un dato personal NUEVO (gustos, nombre de mascotas, trabajo, etc.), DEBES extraerlo.
            3. Para guardar un dato, añade al FINAL de tu respuesta un bloque JSON oculto así:
            
            [[UPDATE_MEMORY: {"key": "dato_a_guardar", "value": "valor_del_dato"}]]
            
            Ejemplo: Si dice "Me gusta el café", añade [[UPDATE_MEMORY: {"coffee": "likes"}]].
            NO muestres este JSON al usuario, el sistema lo procesará.`
        });

        // Inject context into every message
        const contextualizedMessage = `[System Context: User=${userName}, Email=${decodedToken.email}, Language=${language}, Memory=${learnedMemory}]. ${message}`;

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(contextualizedMessage);
        const response = await result.response;
        let text = response.text();

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

        return NextResponse.json({ response: text });
    } catch (error: any) {
        console.error("Error in chat API:", error);
        return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
    }
}
