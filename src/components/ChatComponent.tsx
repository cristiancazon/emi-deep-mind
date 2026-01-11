"use client";
import { useState } from "react";
import { Send, Bot, User as UserIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function ChatComponent() {
    const { user } = useAuth();
    const router = useRouter();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
        { role: 'model', content: 'Hello! I am Gemini. How can I help you today?' }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async () => {
        if (!input.trim()) return;
        if (!user) {
            router.push("/login");
            return;
        }

        const userMessage = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage, userId: user.uid })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || "API Error");

            setMessages(prev => [...prev, { role: 'model', content: data.response }]);
        } catch (error: any) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col bg-gray-900 text-white relative">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'model' ? 'bg-blue-600' : 'bg-green-600'}`}>
                            {msg.role === 'model' ? <Bot className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                        </div>
                        <div className={`rounded-2xl px-5 py-3 max-w-[80%] ${msg.role === 'model' ? 'bg-gray-800 text-gray-100 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                            <Bot className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1 bg-gray-800 rounded-2xl px-5 py-3 rounded-tl-none">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-950">
                <div className="relative mx-auto max-w-3xl">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask Gemini something..."
                        className="w-full rounded-2xl bg-gray-800 border-none py-4 pl-6 pr-14 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-2 p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
                <p className="text-center text-xs text-gray-500 mt-2">Gemini can make mistakes. Design by Vibe Coding.</p>
            </div>
        </div>
    );
}
