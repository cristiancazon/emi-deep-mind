import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminDb } from "@/lib/firebase-admin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface TopicMemory {
    id: string;
    name: string;
    keywords: string[];
    summary: string;
    lastUpdated: Date;
}

export async function findRelevantTopic(userId: string, query: string): Promise<TopicMemory | null> {
    try {
        const topicsRef = adminDb.collection("users").doc(userId).collection("topics");
        // Simple search: Get all topics and find matching keywords locally (for MVP)
        // Optimization: Use Firestore where/array-contains if keywords are reliable
        const snapshot = await topicsRef.orderBy("lastUpdated", "desc").limit(20).get();

        if (snapshot.empty) return null;

        const allTopics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TopicMemory));
        const lowerQuery = query.toLowerCase();

        // 1. Direct Name Match
        const nameMatch = allTopics.find(t => lowerQuery.includes(t.name.toLowerCase()));
        if (nameMatch) return nameMatch;

        // 2. Keyword Match
        const keywordMatch = allTopics.find(t =>
            t.keywords.some(k => lowerQuery.includes(k.toLowerCase()))
        );

        return keywordMatch || null;

    } catch (e) {
        console.error("Error finding relevant topic:", e);
        return null;
    }
}

export async function saveTopicMemory(userId: string, conversation: { role: string, content: string }[]) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Analyze conversation to extract topic
        const analysisPrompt = `
        Analiza la siguiente conversación entre un usuario y un asistente AI.
        Tu tarea es identificar el TEMA PRINCIPAL y generar un RESUMEN de lo aprendido.

        CONVERSACIÓN:
        ${conversation.map(m => `${m.role}: ${m.content}`).join('\n')}

        SALIDA (Solo JSON):
        {
            "topicName": "Nombre corto del tema (ej: Secuencia Fibonacci)",
            "keywords": ["keyword1", "keyword2", "keyword3"],
            "summary": "Resumen conciso y denso de la información clave discutida. Qué quería el usuario y qué aprendió.",
            "isWorthRemembering": boolean (true si es un tema de conocimiento o dato personal, false si es saludo o trivial)
        }
        `;

        const result = await model.generateContent(analysisPrompt);
        const text = result.response.text();
        const cleanText = text.replace(/```json|```/g, '').trim();

        const data = JSON.parse(cleanText);

        if (!data.isWorthRemembering) return;

        // Save to Firestore
        const topicsRef = adminDb.collection("users").doc(userId).collection("topics");

        // Check if topic exists (by name slug or fuzzy match logic - simplified to name slug for now)
        const slug = data.topicName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const docRef = topicsRef.doc(slug);

        const docSnap = await docRef.get();

        if (docSnap.exists) {
            // Merge summaries
            const existing = docSnap.data() as TopicMemory;
            const mergePrompt = `
            Combina estos dos resúmenes sobre el tema "${data.topicName}" en uno solo, manteniendo la información clave de ambos.
            
            Resumen Anterior: ${existing.summary}
            Nuevo Resumen: ${data.summary}
            `;
            const mergeResult = await model.generateContent(mergePrompt);
            const newSummary = mergeResult.response.text();

            await docRef.update({
                summary: newSummary,
                keywords: Array.from(new Set([...existing.keywords, ...data.keywords])),
                lastUpdated: new Date()
            });
        } else {
            await docRef.set({
                id: slug,
                name: data.topicName,
                keywords: data.keywords,
                summary: data.summary,
                lastUpdated: new Date(),
                createdAt: new Date()
            });
        }

        console.log(`Memory updated for topic: ${data.topicName}`);

    } catch (e) {
        console.error("Error saving topic memory:", e);
    }
}
