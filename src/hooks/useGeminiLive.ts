import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from './useUserProfile';

export function useGeminiLive() {
    const { user } = useAuth();
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

    // Changed: Accept an onMessage callback for history syncing
    const connect = useCallback(async (videoRef: HTMLVideoElement | null, chatHistory: any[] = [], onMessageOrAudio?: (text: string | null, audio: string | null) => void) => {
        if (!user || wsRef.current) return;

        try {
            setError(null);

            // Initialize AudioContext
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 24000
            });

            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`);

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
                    `You are Emi, a helpful AI assistant. You are talking to ${user.displayName || 'User'}.`,
                    `Current Context: Language=${profile.language}, Location=${profile.location || 'Unknown'}.`,
                    `User Tags/Preferences: ${profile.tags.join(', ') || 'None'}.`,
                    `IMPORTANT: You MUST speak in ${profile.language === 'es' ? 'Spanish (Español)' : profile.language} at all times, unless asked otherwise.`,
                    `RECENT CHAT HISTORY (For Context):\n${historyContext}`
                ].join('\n\n');

                const setupMessage = {
                    setup: {
                        model: "models/gemini-2.0-flash-exp",
                        generation_config: {
                            response_modalities: ["AUDIO"] // Revert to AUDIO only to fix connection
                        },
                        system_instruction: {
                            parts: [{
                                text: instructions
                            }]
                        }
                    }
                };
                ws.send(JSON.stringify(setupMessage));

                startAudioCapture(ws);
                if (videoRef) {
                    startVideoCapture(ws, videoRef);
                }
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

                    // Callback for UI/History synchronization
                    if (onMessageOrAudio && (textData || audioData)) {
                        onMessageOrAudio(textData, audioData);
                    }
                }
            };

            ws.onerror = (e) => {
                if (ws !== wsRef.current) return;
                console.error('WebSocket Error:', e);
            };

            ws.onclose = (event) => {
                if (ws !== wsRef.current) return;
                console.log(`WebSocket Closed: Code=${event.code}`);
                cleanup();
            };

            setIsStreaming(true);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            cleanup();
        }
    }, [user, profile]);

    // Dynamic Profile Update
    useEffect(() => {
        if (isConnected && wsRef.current?.readyState === WebSocket.OPEN) {
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

        const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
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

    return {
        connect,
        disconnect,
        isStreaming,
        isConnected,
        volumeLevel,
        error
    };
}
