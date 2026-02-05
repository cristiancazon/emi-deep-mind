import { useState, useEffect, useRef } from "react";
import { Send, Bot, User as UserIcon, Mic, MicOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import LiveInterface from "./LiveInterface";
import { useUserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export default function ChatComponent() {
    const { user, googleAccessToken } = useAuth();
    const { profile, loading: profileLoading } = useUserProfile();
    const router = useRouter();
    const [input, setInput] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);



    const { connect, disconnect, sendMessage: sendLiveMessage, isStreaming, isConnected, volumeLevel, error: liveError } = useGeminiLive();
    const [showLive, setShowLive] = useState(false);

    // Initialize with a generic message, update in useEffect when user loads
    const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
        { role: 'model', content: 'Hello! I am Gemini. Loading your profile...' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTopic, setCurrentTopic] = useState<string | null>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "56px"; // Reset to min height
            const scrollHeight = textareaRef.current.scrollHeight;
            const newHeight = Math.min(scrollHeight, 200);
            textareaRef.current.style.height = `${newHeight}px`;

            // Toggle scrollbar visibility
            textareaRef.current.style.overflowY = scrollHeight > 200 ? "auto" : "hidden";
        }
    }, [input]);

    useEffect(() => {
        if (user && !profileLoading) {
            const loadHistory = async () => {
                try {
                    const userRef = doc(db, "conversations", user.uid);
                    const docSnap = await getDoc(userRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
                            setMessages(data.messages);
                            return;
                        }
                    }

                    // No history found, show greeting
                    const firstName = user.displayName?.split(' ')[0] || 'there';
                    const agentName = profile.agentConfig?.name || 'Emi';
                    let greeting = `Hello ${firstName}! I am ${agentName}. How can I help you today?`;

                    if (profile.language === 'es') {
                        greeting = `¡Hola ${firstName}! Soy ${agentName}. ¿En qué puedo ayudarte hoy?`;
                    }

                    setMessages([{ role: 'model', content: greeting }]);
                } catch (e) {
                    console.error("Error loading chat history:", e);
                }
            };

            loadHistory();
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




    const [isListening, setIsListening] = useState(false);

    const handleVoiceInput = () => {
        if (isListening) {
            setIsListening(false);
            window.speechSynthesis.cancel();
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Su navegador no soporta reconocimiento de voz. Por favor use Chrome o Edge.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = profile.language === 'es' ? 'es-ES' : 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsListening(true);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + (prev ? " " : "") + transcript);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
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

        // Check for topic change before proceeding
        // This will be detected by the API response which includes topic info

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
                    language: navigator.language,
                    googleAccessToken: googleAccessToken
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || "API Error");

            // Check if topic changed
            if (data.topic && data.topic !== currentTopic) {
                // New topic detected - clear old messages except greeting
                const firstName = user.displayName?.split(' ')[0] || 'there';
                const agentName = profile.agentConfig?.name || 'Emi';
                const greeting = profile.language === 'es'
                    ? `¡Hola ${firstName}! Soy ${agentName}. Cambiamos de tema. ¿En qué puedo ayudarte?`
                    : `Hello ${firstName}! I am ${agentName}. Topic changed. How can I help you?`;

                setMessages([
                    { role: 'model', content: greeting },
                    { role: 'user', content: userMessage },
                    { role: 'model', content: data.response }
                ]);
                setCurrentTopic(data.topic);
            } else {
                setMessages(prev => [...prev, { role: 'model', content: data.response }]);
                if (data.topic) setCurrentTopic(data.topic);
            }
        } catch (error: any) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col bg-background text-foreground relative h-[calc(100vh-64px)] lg:h-screen transition-colors duration-500">

            {/* Mode Switcher (Tabs) */}
            <div className="flex justify-center p-4 border-b border-border-theme bg-surface/50 backdrop-blur-sm z-10 shrink-0">
                <div className="flex bg-surface p-1 rounded-full relative border border-border-theme/50">
                    {/* Animated Background Indicator */}
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-full transition-all duration-300 ease-in-out shadow-lg ${showLive ? 'left-[calc(50%+2px)]' : 'left-1'}`}
                    />

                    <button
                        onClick={() => {
                            setShowLive(false);
                            disconnect(); // Ensure voice drops when switching to text
                        }}
                        className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10 flex items-center gap-2 ${!showLive ? 'text-white' : 'text-muted hover:text-foreground'}`}
                    >
                        <Bot className="h-4 w-4" />
                        <span>Chat</span>
                    </button>
                    <button
                        onClick={handleToggleLive}
                        className={`relative px-6 py-2 rounded-full text-sm font-medium transition-colors z-10 flex items-center gap-2 ${showLive ? 'text-white' : 'text-muted hover:text-foreground'}`}
                    >
                        <Mic className="h-4 w-4" />
                        <span>Live</span>
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
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-border-theme scrollbar-track-transparent">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'model' ? 'bg-primary/20 text-primary' : 'bg-green-600 text-white'}`}>
                                    {msg.role === 'model' ? <Bot className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}
                                </div>
                                <div className={`rounded-2xl px-5 py-3 max-w-[80%] shadow-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === 'model' ? 'bg-surface text-foreground rounded-tl-none border border-border-theme' : 'bg-primary text-white rounded-tr-none'}`}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                        components={{
                                            blockquote: ({ node, ...props }: any) => (
                                                <blockquote
                                                    {...props}
                                                    className="border-l-4 border-primary/50 pl-4 my-2 italic bg-surface/50 p-4 rounded-r-lg shadow-sm"
                                                />
                                            ),
                                            a: ({ node, ...props }: any) => (
                                                <a
                                                    {...props}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
                                                />
                                            ),
                                            p: ({ node, ...props }: any) => (
                                                <p {...props} className="mb-2 last:mb-0" />
                                            ),
                                            ul: ({ node, ...props }: any) => (
                                                <ul {...props} className="list-disc pl-5 mb-2 space-y-1" />
                                            ),
                                            ol: ({ node, ...props }: any) => (
                                                <ol {...props} className="list-decimal pl-5 mb-2 space-y-1" />
                                            ),
                                            li: ({ node, ...props }: any) => (
                                                <li {...props} />
                                            ),
                                            strong: ({ node, ...props }: any) => (
                                                <strong {...props} className="font-bold" />
                                            )
                                        }}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                                    <Bot className="h-5 w-5" />
                                </div>
                                <div className="flex items-center gap-1 bg-surface rounded-2xl px-5 py-3 rounded-tl-none border border-border-theme">
                                    <span className="w-2 h-2 bg-muted rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Text Input Area (Fixed & Refined) */}
                    <div className="p-4 border-t border-border-theme bg-surface/80 backdrop-blur-sm">
                        <div className="relative mx-auto max-w-3xl flex items-end">
                            <div className="relative flex-1 group">
                                <textarea
                                    ref={textareaRef}
                                    rows={1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    placeholder="Message Emi..."
                                    className="w-full rounded-2xl bg-background border border-border-theme py-4 pl-6 pr-[110px] text-foreground placeholder-muted focus:ring-2 focus:ring-primary/50 focus:border-primary focus:outline-none transition-all shadow-inner resize-none min-h-[56px] max-h-[200px] overflow-y-auto custom-scrollbar"
                                    style={{ height: '56px' }}
                                />
                                <button
                                    onClick={handleVoiceInput}
                                    className={`absolute right-12 bottom-2.5 p-2 rounded-xl hover:opacity-90 transition-all shadow-lg z-10 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-500/40' : 'bg-surface text-muted hover:text-foreground border border-border-theme'}`}
                                    title={isListening ? "Stop Dictation" : "Start Dictation"}
                                >
                                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                </button>
                                <button
                                    onClick={sendMessage}
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2.5 bottom-2.5 p-2 rounded-xl bg-primary hover:opacity-90 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-primary/40 z-10"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <p className="text-center text-[10px] text-muted mt-2 font-medium tracking-wide uppercase">AI can make mistakes. Verify important info.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
