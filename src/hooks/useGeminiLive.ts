import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from './useUserProfile';
import { calendarToolDeclaration, listCalendarEvents } from '@/lib/tools/calendar';

export function useGeminiLive() {
    const { user, googleAccessToken } = useAuth();
    const { profile } = useUserProfile(); // Get active profile context
    const [isStreaming, setIsStreaming] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Audio Playback Queue
    const audioQueueRef = useRef<ArrayBuffer[]>([]);
    const isPlayingRef = useRef(false);

    // Changed: Accept an onMessage callback for history syncing. Added endTurn/interrupted callback
    const connect = useCallback(async (videoRef: HTMLVideoElement | null, chatHistory: any[] = [], onMessageOrAudio?: (text: string | null, audio: string | null, endTurn?: boolean) => void) => {
        if (!user || wsRef.current) return;

        try {
            setError(null);
            console.log("Connecting to Gemini Live... Token available:", !!googleAccessToken); // DEBUG LOG

            // Initialize AudioContext
            // Gemini Native Audio output is 24kHz. Input can remain 16kHz via getUserMedia constraints.
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 24000
            });

            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`);

            wsRef.current = ws;

            ws.onopen = () => {
                if (ws !== wsRef.current) {
                    ws.close();
                    return;
                }

                console.log('Connected to Gemini Live');
                setIsConnected(true);

                // Format recent history for context (Last 10 turns)
                const historyContext = chatHistory.slice(-10).map(msg =>
                    `${msg.role === 'user' ? 'User' : 'Emi'}: ${msg.content}`
                ).join('\n');

                const instructions = [
                    `You are ${profile.agentConfig?.name || 'Emi'}, a helpful AI assistant. You are talking to ${user.displayName || 'User'}.`,
                    `Current Context: Language=${profile.language}, Location=${profile.location || 'Unknown'}.`,
                    `User Tags/Preferences: ${profile.tags.join(', ') || 'None'}.`,
                    `Personality/Tone: ${profile.agentConfig?.tone || 'friendly'}.`,
                    `Custom Instructions: ${profile.agentConfig?.customInstructions || 'None'}.`,
                    `IMPORTANT: You MUST speak in ${profile.language === 'es' ? 'Spanish (Español)' : profile.language} at all times, unless asked otherwise.`,
                    `CALENDAR ACCESS: You have access to the user's Google Calendar through the list_calendar_events tool. Use this tool to answer questions about their schedule, appointments, and upcoming events.`,
                    `RECENT CHAT HISTORY (For Context):\n${historyContext}`
                ].join('\n\n');

                // Full Setup Restored
                const setupMessage = {
                    setup: {
                        model: "models/gemini-2.5-flash-native-audio-latest",
                        generation_config: {
                            response_modalities: ["AUDIO"],
                            speech_config: {
                                voice_config: { prebuilt_voice_config: { voice_name: "Aoede" } }
                            }
                        },
                        system_instruction: {
                            parts: [{
                                text: instructions
                            }]
                        },
                        tools: [
                            { google_search: {} }, // Built-in
                            { function_declarations: [calendarToolDeclaration] } // Custom
                        ]
                    }
                };
                console.log("Sending Setup Message with Tools:", JSON.stringify(setupMessage, null, 2)); // DEBUG LOG
                ws.send(JSON.stringify(setupMessage));

                // Do NOT start capturing yet. Wait for server response.
            };

            ws.onmessage = async (event) => {
                if (ws !== wsRef.current) return;

                let data;
                try {
                    if (event.data instanceof Blob) {
                        data = JSON.parse(await event.data.text());
                    } else {
                        data = JSON.parse(event.data);
                    }
                } catch (e) {
                    console.error("Error parsing WS message", e);
                    return;
                }

                const modelTurn = data.serverContent?.modelTurn;

                if (modelTurn?.parts) {
                    let audioData = null;
                    let textData = null;

                    for (const part of modelTurn.parts) {
                        if (part.inlineData) {
                            audioData = part.inlineData.data;
                            queueAudio(audioData);
                        }
                        if (part.text) {
                            textData = part.text;
                        }
                    }

                    // Callback for UI/History synchronization - AUDIO ONLY (Visualization/State)
                    // Removed text transcription as requested.
                    if (onMessageOrAudio && audioData) {
                        // We still pass 'null' for text to satisfy signature or update signature? 
                        // Let's just pass null for text.
                        onMessageOrAudio(null, audioData, false);
                    }
                }

                // --- TOOL CALL HANDLING ---
                if (modelTurn?.parts) {
                    for (const part of modelTurn.parts) {
                        if (part.functionCall) {
                            const { name, args } = part.functionCall;
                            console.log(`Tool Call Requested: ${name}`, args);

                            if (name === 'list_calendar_events') {
                                if (!googleAccessToken) {
                                    console.error("No access token for Calendar tool");
                                    // Notify model of auth failure
                                    ws.send(JSON.stringify({
                                        tool_response: {
                                            function_responses: [{
                                                response: { error: "User not authenticated with Google Calendar." },
                                                id: name // Use 'id' from request if available in future schemas
                                            }]
                                        }
                                    }));
                                    continue;
                                }

                                try {
                                    const events = await listCalendarEvents(googleAccessToken, args.maxResults);
                                    console.log("Tool Result:", events);

                                    // Send Result Back
                                    const toolResponse = {
                                        tool_response: {
                                            function_responses: [{
                                                response: { events: events },
                                                id: name
                                            }]
                                        }
                                    };
                                    ws.send(JSON.stringify(toolResponse));

                                    // Trigger model to continue (speak the result)
                                    ws.send(JSON.stringify({ client_content: { turn_complete: true } }));

                                } catch (e: any) {
                                    console.error("Tool Execution Error:", e);
                                    ws.send(JSON.stringify({
                                        tool_response: {
                                            function_responses: [{
                                                response: { error: e.message },
                                                id: name
                                            }]
                                        }
                                    }));
                                }
                            }
                        }
                    }
                }
                // --------------------------

                // Initial Handshake / Server Response Check
                // If we haven't started streaming inputs yet, and we got a message (any message, meaning setup done), start capturing.
                if (!mediaStreamRef.current && !error) {
                    console.log("Handshake received (or first message), starting media capture");
                    startAudioCapture(ws);
                    if (videoRef) {
                        startVideoCapture(ws, videoRef);
                    }
                }
            };

            ws.onerror = (e) => {
                if (ws !== wsRef.current) return;
                console.error('WebSocket Error:', e);
            };

            ws.onclose = (event) => {
                if (ws !== wsRef.current) return;
                console.log(`WebSocket Closed: Code=${event.code}, Reason=${event.reason}`);
                cleanup();
            };

            setIsStreaming(true);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            cleanup();
        }
    }, [user, profile]);

    // Track if strict updates are needed. Initial context is sent via setup message.
    const initialProfileRef = useRef<string>(JSON.stringify(profile));

    useEffect(() => {
        if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
            const currentProfileStr = JSON.stringify(profile);

            // Avoid sending update if profile hasn't meaningfully changed since mount/last update
            // AND ensure we don't send one immediately if it matches the initial one that was part of instructions
            if (currentProfileStr !== initialProfileRef.current) {
                const updateMessage = {
                    client_content: {
                        turns: [{
                            role: "user",
                            parts: [{
                                text: `[SYSTEM UPDATE] configuration changed. New Language: ${profile.language}. New Location: ${profile.location}. New Tags: ${profile.tags.join(', ')}. Please adapt immediately.`
                            }]
                        }],
                        turn_complete: true
                    }
                };
                wsRef.current.send(JSON.stringify(updateMessage));
                console.log("Sent dynamic profile update to Gemini Live");
                initialProfileRef.current = currentProfileStr;
            }
        }
    }, [profile, isConnected]);

    const startAudioCapture = async (ws: WebSocket) => {
        if (!audioContextRef.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1
                }
            });
            mediaStreamRef.current = stream;

            await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');

            const source = audioContextRef.current.createMediaStreamSource(stream);
            const processor = new AudioWorkletNode(audioContextRef.current, 'audio-processor', {
                processorOptions: {
                    sampleRate: 16000,
                    bufferSize: 4096,
                }
            });

            processor.port.onmessage = (event) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const { pcmData, level } = event.data;
                    setVolumeLevel(level / 100); // Normalize level

                    const base64Audio = arrayBufferToBase64(pcmData);
                    ws.send(JSON.stringify({
                        realtime_input: {
                            media_chunks: [{
                                mime_type: "audio/pcm",
                                data: base64Audio
                            }]
                        }
                    }));
                }
            };

            source.connect(processor);
            audioWorkletNodeRef.current = processor;
        } catch (e) {
            console.error("Audio capture error:", e);
        }
    };

    const startVideoCapture = (ws: WebSocket, videoRef: HTMLVideoElement) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        videoIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && videoRef.readyState === 4) {
                canvas.width = videoRef.videoWidth * 0.5;
                canvas.height = videoRef.videoHeight * 0.5;
                if (ctx) {
                    ctx.drawImage(videoRef, 0, 0, canvas.width, canvas.height);
                    const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

                    ws.send(JSON.stringify({
                        realtime_input: {
                            media_chunks: [{
                                mime_type: "image/jpeg",
                                data: base64Image
                            }]
                        }
                    }));
                }
            }
        }, 1000);
    };

    const queueAudio = (base64Audio: string) => {
        const audioData = base64ToArrayBuffer(base64Audio);
        audioQueueRef.current.push(audioData);
        if (!isPlayingRef.current) {
            playNextChunk();
        }
    };

    const playNextChunk = async () => {
        if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
            isPlayingRef.current = false;
            return;
        }

        isPlayingRef.current = true;
        const audioData = audioQueueRef.current.shift()!;

        // Convert PCM16 to Float32
        const float32Data = new Float32Array(audioData.byteLength / 2);
        const dataView = new DataView(audioData);
        for (let i = 0; i < float32Data.length; i++) {
            float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
        }

        const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000); // Output 24kHz
        audioBuffer.getChannelData(0).set(float32Data);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        source.onended = () => {
            playNextChunk();
        };

        source.start();
    };

    const cleanup = () => {
        setIsConnected(false);
        setIsStreaming(false);
        setVolumeLevel(0);

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (videoIntervalRef.current) {
            clearInterval(videoIntervalRef.current);
            videoIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        audioQueueRef.current = [];
        isPlayingRef.current = false;
    };

    const disconnect = useCallback(() => {
        cleanup();
    }, []);

    // Helper functions
    function arrayBufferToBase64(buffer: ArrayBuffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function base64ToArrayBuffer(base64: string) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    useEffect(() => {
        return () => disconnect();
    }, [disconnect]);

    const sendMessage = useCallback((text: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const message = {
                client_content: {
                    turns: [{
                        role: "user",
                        parts: [{ text }]
                    }],
                    turn_complete: true
                }
            };
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    return {
        connect,
        disconnect,
        sendMessage, // Exposed for text-to-voice sync
        isStreaming,
        isConnected,
        volumeLevel,
        error
    };
}
