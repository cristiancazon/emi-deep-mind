"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, PhoneOff, Radio } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";

interface CallInterfaceProps {
    onClose?: () => void;
}

export default function CallInterface({ onClose }: CallInterfaceProps) {
    const { user, googleAccessToken } = useAuth();
    const { profile } = useUserProfile();

    // States
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [lastResponse, setLastResponse] = useState("");

    // Refs
    const recognitionRef = useRef<any>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const transcriptRef = useRef("");

    // Initialize Speech API
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = profile.language || 'es-ES'; // Default to Spanish or user pref

                recognition.onresult = (event: any) => {
                    let interimTranscript = "";
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            transcriptRef.current += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    console.log("Transcription:", transcriptRef.current || interimTranscript);
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech Recognition Error:", event.error);
                };

                recognitionRef.current = recognition;
            }

            synthRef.current = window.speechSynthesis;
        }
    }, [profile.language]);

    // Handlers
    const startRecording = () => {
        if (!recognitionRef.current) return;
        transcriptRef.current = ""; // Clear buffer
        setTranscript("");
        setIsRecording(true);
        try {
            recognitionRef.current.start();
            console.log("Recording started...");
        } catch (e) {
            console.error("Error starting recognition:", e);
        }
    };

    const stopRecording = async () => {
        if (!recognitionRef.current) return;
        setIsRecording(false);
        recognitionRef.current.stop();
        console.log("Recording stopped. Processing...");

        // Small delay to ensure we have the final transcript
        setTimeout(async () => {
            const textToSend = transcriptRef.current.trim();
            console.log("Final text to process:", textToSend);

            if (textToSend) {
                await processMessage(textToSend);
                transcriptRef.current = ""; // Clear for next turn
            } else {
                console.warn("No transcript captured.");
            }
        }, 800); // Increased delay slightly to allow finalization
    };

    const processMessage = async (text: string) => {
        setIsProcessing(true);
        try {
            if (!user) throw new Error("User not authenticated");
            const token = await user.getIdToken();

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: text,
                    userId: user.uid,
                    language: profile.language || navigator.language,
                    googleAccessToken: googleAccessToken
                }),
            });

            const data = await res.json();
            if (data.response) {
                setLastResponse(data.response);
                speakResponse(data.response);
            }
        } catch (error) {
            console.error("Error processing call message:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const speakResponse = (text: string) => {
        if (!synthRef.current) return;

        // Cancel previous speech
        synthRef.current.cancel();

        // Clean text for speech: remove Markdown links and raw URLs
        const cleanText = text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Replace [Link Text](url) with "Link Text"
            .replace(/https?:\/\/\S+/g, "un enlace"); // Replace bare URLs with "un enlace"

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = profile.language || 'es-ES';

        // Find a decent voice
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => v.lang.includes(profile.language === 'en' ? 'en' : 'es') && v.name.includes('Google'));
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
    };

    return (
        <div className="flex flex-col items-center justify-between h-full py-6 bg-gray-950 text-white relative overflow-hidden">
            {/* Ambient Background */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full transition-all duration-1000 ${isRecording ? 'scale-125 bg-red-500/20' : isSpeaking ? 'scale-110 bg-emerald-500/20' : 'scale-100'}`} />

            {/* Header */}
            <div className="z-10 flex flex-col items-center space-y-2 shrink-0">
                <div className="flex items-center gap-2 text-gray-400 text-sm uppercase tracking-widest">
                    <Radio className={`h-4 w-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-600'}`} />
                    {isRecording ? "Recording..." : isProcessing ? "Thinking..." : isSpeaking ? "Speaking..." : "Call Active"}
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent">
                    {profile.agentConfig?.name || "Emi"}
                </h1>
            </div>

            {/* Central Interaction Area */}
            <div className="z-10 flex flex-col items-center justify-center flex-1 w-full max-w-md px-6">
                {/* Visualizer / Status Text */}
                <div className="h-24 flex items-center justify-center mb-12 text-center">
                    {(isRecording || isProcessing || isSpeaking) ? (
                        <div className="flex items-center gap-1 h-12">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 bg-white rounded-full transition-all duration-300 ${isRecording ? 'bg-red-400 animate-[bounce_1s_infinite]' :
                                        isSpeaking ? 'bg-emerald-400 animate-[pulse_0.5s_infinite]' :
                                            'bg-blue-400 animate-pulse'
                                        }`}
                                    style={{
                                        height: isRecording ? `${Math.random() * 40 + 10}px` : '10px',
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 font-medium">Hold button to speak</p>
                    )}
                </div>

                {/* The "Hold to Talk" Button */}
                <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording} // Mobile support
                    onTouchEnd={stopRecording}    // Mobile support
                    className={`
                        relative w-32 h-32 rounded-full flex items-center justify-center
                        transition-all duration-300 transform
                        ${isRecording
                            ? 'bg-red-500 scale-110 shadow-[0_0_50px_rgba(239,68,68,0.5)]'
                            : 'bg-gray-800 hover:bg-gray-700 shadow-2xl border border-gray-700'
                        }
                    `}
                >
                    <Mic className={`h-10 w-10 ${isRecording ? 'text-white' : 'text-gray-400'}`} />

                    {/* Ripple Effect Ring */}
                    {!isRecording && (
                        <div className="absolute inset-0 rounded-full border border-white/5 animate-[ping_3s_infinite]" />
                    )}
                </button>
            </div>

            {/* Footer / Controls */}
            <div className="z-10 flex items-center gap-8 shrink-0 pb-4">
                <button
                    onClick={onClose}
                    className="p-4 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                >
                    <PhoneOff className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
}
