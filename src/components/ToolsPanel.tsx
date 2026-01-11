import { Hammer, Wrench, Radio } from "lucide-react";

interface ToolsPanelProps {
    onToggleLive: () => void;
}

export default function ToolsPanel({ onToggleLive }: ToolsPanelProps) {
    return (
        <aside className="hidden w-64 flex-col border-l border-gray-800 bg-gray-950 text-gray-300 lg:flex">
            <div className="flex h-16 items-center px-6 font-bold text-white border-b border-gray-800 gap-2">
                <Wrench className="h-5 w-5" />
                Tools
            </div>
            <div className="flex-1 p-4 flex flex-col gap-4">
                <button
                    onClick={onToggleLive}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white hover:opacity-90 transition shadow-lg group"
                >
                    <div className="p-2 bg-white/20 rounded-full group-hover:scale-110 transition">
                        <Radio className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-sm">Gemini Live</div>
                        <div className="text-xs opacity-80">Real-time Voice</div>
                    </div>
                </button>

                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <Hammer className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-center text-sm">More tools coming soon.</p>
                </div>
            </div>
        </aside>
    );
}
