import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
    try {
        const { message, userId } = await req.json();

        if (!message || !userId) {
            return NextResponse.json({ error: "Missing message or userId" }, { status: 400 });
        }

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

        // Use Gemini 2.0 Flash Experimental as requested (often referred to as next-gen/Gemini 3 context)
        // If this fails, we might need to fallback or check API key permissions.
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        const chat = model.startChat({
            history: history,
        });
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

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
