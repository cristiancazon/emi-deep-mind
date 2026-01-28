import { useState, useEffect, useRef } from "react";
import { Send, Bot, User as UserIcon, Mic } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import LiveInterface from "./LiveInterface";
import { useUserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

export default function ChatComponent() {
    const { user } = useAuth();
    const { profile, loading: profileLoading } = useUserProfile();
    const router = useRouter();
    const [input, setInput] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);



    const { connect, disconnect, sendMessage: sendLiveMessage, isStreaming, isConnected, volumeLevel, error: liveError } = useGeminiLive();
    const [showLive, setShowLive] = useState(false);

    // Initialize with a generic message, update in useEffect when user loads
    const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
        { role: 'model', content: 'Hello! I am Gemini. Loading your profile...' }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user && !profileLoading) {
            const firstName = user.displayName?.split(' ')[0] || 'there';

            // Localized Greeting
            let greeting = `Hello ${firstName}! I am Emi. How can I help you today?`;

            if (profile.language === 'es') {
                greeting = `¡Hola ${firstName}! Soy Emi. ¿En qué puedo ayudarte hoy?`;
            }

            setMessages([
                { role: 'model', content: greeting }
            ]);
        }
    }, [user, profileLoading, profile.language]);

    const handleToggleLive = async () => {
        if (showLive) {
            // Stop
            disconnect();
            setShowLive(false);
        } else {
            // Start
            setShowLive(true);
            setTimeout(() => {
                // Pass current chat history to context AND a callback for live text
                connect(videoRef.current, messages, async (text, audio, endTurn) => {
                    // Transcription removed as requested.
                    // The original code had a syntax error with an extra '}' here.
                    // Assuming the intent was to remove the 'if (text)' block and keep the callback structure.
                    // If there was other logic for 'endTurn' or 'audio', it should be added here.
                    // For now, keeping it minimal as per the instruction's implied removal.
                });
            }, 100);
        }
    };



    const sendMessage = async () => {
        if (!input.trim()) return;
        if (!user) {
            router.push("/login");
            return;
        }

        const userMessage = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        // If in Live Mode, send text to Live Session as well
        if (showLive && isConnected) {
            sendLiveMessage(userMessage);
            // We still want to save to DB? - The standard API call below saves to DB. 
            // We should probably NOT call the standard API if we want the voice model to respond directly via audio?
            // BUT, the user requirement is "sync". If we send to text API, we get text response. If we send to voice API, we get voice response.
            // If we are in voice mode, we usually want voice response.
            // Let's send to Live API AND save the USER message to DB manually here, to avoid double response (Text API + Voice API)

            try {
                const userRef = doc(db, "conversations", user.uid);
                await updateDoc(userRef, {
                    messages: arrayUnion(
                        { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
                    )
                });
            } catch (e) { console.error("Error saving user message in live mode:", e); }

            return; // Skip the standard REST API call
        }

        setIsLoading(true);

        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: userMessage,
                    userId: user.uid,
                    language: navigator.language
                })
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
        <div className="flex flex-1 flex-col bg-gray-900 text-white relative h-[calc(100vh-64px)] lg:h-screen transition-colors duration-500">

            {/* Mode Switcher (Tabs) */}
            <div className="flex justify-center p-4 border-b border-gray-800 bg-gray-950/50 backdrop-blur-sm z-10 shrink-0">
                <div className="flex bg-gray-800/50 p-1 rounded-full relative">
                    {/* Animated Background Indicator */}
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-blue-600 rounded-full transition-all duration-300 ease-in-out shadow-lg ${showLive ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                    />

                    <button
                        onClick={() => {
                            setShowLive(false);
                            disconnect(); // Ensure voice drops when switching to text
                        }}
                        className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10 flex items-center gap-2 ${!showLive ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <Bot className="h-4 w-4" />
                        <span>Chat</span>
                    </button>
                    <button
                        onClick={handleToggleLive}
                        className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10 flex items-center gap-2 ${showLive ? 'text-white' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <Mic className="h-4 w-4" />
                        <span>Voice</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {/* Voice Mode View */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${showLive ? 'opacity-100 z-20' : 'opacity-0 z-0 pointer-events-none'}`}>
                    {showLive && (
                        <LiveInterface
                            videoRef={videoRef}
                            isStreaming={isStreaming}
                            isConnected={isConnected}
                            volumeLevel={volumeLevel}
                            onClose={handleToggleLive} // Keeps functionality valid
                        />
                    )}
                </div>

                {/* Text Mode View */}
                <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${!showLive ? 'opacity-100 z-20' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'model' ? 'bg-blue-600' : 'bg-green-600'}`}>
                                    {msg.role === 'model' ? <Bot className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                                </div>
                                <div className={`rounded-2xl px-5 py-3 max-w-[80%] shadow-sm ${msg.role === 'model' ? 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="flex items-center gap-1 bg-gray-800 rounded-2xl px-5 py-3 rounded-tl-none border border-gray-700">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Text Input Area (Standard) */}
                    <div className="p-4 border-t border-gray-800 bg-gray-950/80 backdrop-blur-sm">
                        <div className="relative mx-auto max-w-3xl">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Message Emi..."
                                className="w-full rounded-2xl bg-gray-900 border border-gray-800 py-4 pl-6 pr-14 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all shadow-inner"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 top-2 p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/20"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-gray-600 mt-2 font-medium tracking-wide uppercase">AI can make mistakes. Verify important info.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
