import { useRef, useEffect } from "react";
import { useGeminiLive } from "@/hooks/useGeminiLive";
import { Mic, MicOff, Video, VideoOff, X } from "lucide-react";

interface LiveInterfaceProps {
    onClose: () => void;
}

export default function LiveInterface({ onClose }: LiveInterfaceProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { connect, disconnect, isConnected, volumeLevel, error } = useGeminiLive();

    useEffect(() => {
        connect(videoRef.current);
        return () => disconnect();
    }, [connect, disconnect]);

    // Setup local video preview
    useEffect(() => {
        if (videoRef.current) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => console.error("Video preview error:", err));
        }
    }, []);

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"
            >
                <X className="w-6 h-6 text-white" />
            </button>

            <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
                {/* Visualizer Overlay */}
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div
                        className="w-32 h-32 rounded-full bg-blue-500/20 blur-3xl transition-all duration-75"
                        style={{ transform: `scale(${1 + volumeLevel * 2})` }}
                    />
                </div>

                {/* Video Preview */}
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-50"
                />

                {/* Status Indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full backdrop-blur-md">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-xs font-medium text-white">
                        {isConnected ? 'Gemini Live' : 'Connecting...'}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center gap-6">
                <div className="flex flex-col items-center gap-2">
                    <div className="p-4 rounded-full bg-red-500/10 text-red-400">
                        <Mic className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-gray-400">Listening</span>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-900/50 text-red-200 rounded-lg text-sm border border-red-800">
                    {error}
                </div>
            )}
        </div>
    );
}
