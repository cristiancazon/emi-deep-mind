import { RefObject, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, X } from "lucide-react";

interface LiveInterfaceProps {
    onClose: () => void;
    videoRef: RefObject<HTMLVideoElement | null>;
    isStreaming: boolean;
    isConnected: boolean;
    volumeLevel: number;
}

export default function LiveInterface({ onClose, videoRef, isConnected, volumeLevel }: LiveInterfaceProps) {
    // Setup local video preview (ensure stream is assigned to the passed ref)
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
    }, [videoRef]);

    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-gray-950 p-6 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] transition-all duration-300 ease-out`}
                    style={{ transform: `translate(-50%, -50%) scale(${0.8 + volumeLevel * 1.5})` }}
                />
            </div>

            <div className="relative w-full max-w-4xl flex-1 aspect-video bg-gray-900/50 rounded-3xl overflow-hidden border border-gray-800/50 shadow-2xl backdrop-blur-sm flex flex-col items-center justify-center">

                {/* Video Preview (Background) */}
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-40 ml-auto mr-auto"
                />

                {/* Central Visualizer */}
                <div className="relative z-10 flex flex-col items-center gap-8">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-200 ${isConnected ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.3)]' : 'border-gray-700 bg-gray-800'}`}>
                        <div
                            className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 transition-transform duration-75 ease-linear shadow-lg`}
                            style={{ transform: `scale(${0.8 + volumeLevel})` }}
                        />
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <span className={`text-2xl font-bold tracking-tight ${isConnected ? 'text-white' : 'text-gray-500'}`}>
                            {isConnected ? 'Emi is listening' : 'Connecting...'}
                        </span>
                        <span className="text-sm text-gray-400">
                            {isConnected ? 'Go ahead, I can hear you.' : 'Establishing secure channel...'}
                        </span>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-xs font-semibold text-white tracking-wide uppercase">
                        Gemini 2.0 Live
                    </span>
                </div>
            </div>

            {/* Controls (Optional Footer) */}
            <div className="mt-8 flex items-center gap-4 z-10">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Mic className={`w-4 h-4 ${isConnected ? 'text-blue-400' : 'text-gray-600'}`} />
                    <span>Microphone Active</span>
                </div>
            </div>
        </div>
    );
}
