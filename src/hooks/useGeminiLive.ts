import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useGeminiLive() {
    const { user } = useAuth();
    const [isStreaming, setIsStreaming] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const nextStartTimeRef = useRef<number>(0);

    const connect = useCallback(async (videoRef: HTMLVideoElement | null) => {
        if (!user || wsRef.current) return;

        try {
            // Initialize AudioContext
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 24000 // Gemini output sample rate
            });

            // Connect to WebSocket
            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`);

            ws.onopen = () => {
                setIsConnected(true);
                console.log('Connected to Gemini Live');

                // Send Setup Message
                const setupMessage = {
                    setup: {
                        model: "models/gemini-2.0-flash-exp",
                        generation_config: {
                            response_modalities: ["AUDIO"]
                        },
                        system_instruction: {
                            parts: [{
                                text: `You are Emi, a helpful AI assistant. You are talking to ${user.displayName || 'User'}.`
                            }]
                        }
                    }
                };
                ws.send(JSON.stringify(setupMessage));

                // Start Audio Capture
                startAudioCapture(ws);

                // Start Video Capture if ref provided
                if (videoRef) {
                    startVideoCapture(ws, videoRef);
                }
            };

            ws.onmessage = async (event) => {
                let data;
                if (event.data instanceof Blob) {
                    data = JSON.parse(await event.data.text());
                } else {
                    data = JSON.parse(event.data);
                }

                if (data.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                    const audioBase64 = data.serverContent.modelTurn.parts[0].inlineData.data;
                    playAudio(audioBase64);
                }
            };

            ws.onerror = (e) => {
                console.error('WebSocket Error:', e);
                setError("Connection error");
            };

            ws.onclose = () => {
                setIsConnected(false);
                setIsStreaming(false);
            };

            wsRef.current = ws;
            setIsStreaming(true);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
        }
    }, [user]);

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
            const processor = new AudioWorkletNode(audioContextRef.current, 'pcm-processor');

            processor.port.onmessage = (event) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const pcmData = event.data;
                    const base64Audio = arrayBufferToBase64(pcmData.buffer);

                    // Simple volume calculation for visualizer
                    const sum = pcmData.reduce((a: number, b: number) => a + Math.abs(b), 0);
                    setVolumeLevel(sum / pcmData.length / 100); // Normalize roughly

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
                canvas.width = videoRef.videoWidth * 0.5; // Scale down for bandwidth
                canvas.height = videoRef.videoHeight * 0.5;
                if (ctx) {
                    ctx.drawImage(videoRef, 0, 0, canvas.width, canvas.height);
                    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

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
        }, 1000); // 1 FPS
    };

    const playAudio = (base64Audio: string) => {
        if (!audioContextRef.current) return;

        const audioData = base64ToArrayBuffer(base64Audio);
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

        const currentTime = audioContextRef.current.currentTime;
        // Schedule next chunk to play exactly when the previous one ends
        const startTime = Math.max(currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
    };

    const disconnect = useCallback(() => {
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
        setIsStreaming(false);
        setIsConnected(false);
        setVolumeLevel(0);
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

    return {
        connect,
        disconnect,
        isStreaming,
        isConnected,
        volumeLevel,
        error
    };
}
