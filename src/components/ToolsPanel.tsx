import { useState } from "react";
import { Settings, Loader2, Hammer } from "lucide-react";

export default function ToolsPanel() {
    const [isOpen, setIsOpen] = useState(false); // Default hidden

    return (
        <aside
            className={`${isOpen ? 'w-80' : 'w-14'} hidden lg:flex flex-col border-l border-gray-800 bg-gray-950 text-gray-300 transition-all duration-300 ease-in-out relative z-20 shadow-xl`}
        >
            {/* Unified Header */}
            <div className="flex h-16 items-center border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm shrink-0 overflow-hidden">
                {/* Toggle Button Column (Fixed Width) */}
                <div className="w-14 h-full flex items-center justify-center shrink-0">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors group"
                        title={isOpen ? "Collapse" : "Expand Tools"}
                    >
                        <Settings className={`h-5 w-5 text-indigo-400 transition-transform duration-500 ${!isOpen && 'rotate-180'}`} />
                    </button>
                </div>

                {/* Title (Visible only when open) */}
                <div className={`flex-1 flex items-center justify-between pr-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="font-bold text-white whitespace-nowrap truncate">Tools & Integration</span>
                </div>
            </div>

            {/* Expanded Content */}
            <div className={`flex-1 overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {isOpen && (
                    <div className="h-full overflow-y-auto p-5 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="p-4 bg-gray-900 rounded-full border border-gray-800">
                            <Hammer className="h-8 w-8 text-indigo-500" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">Active Tools</h3>
                            <p className="text-xs text-gray-500 mt-1">Tools are currently managed automatically by Gemini. UI controls coming soon.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Vertical Label When Closed */}
            {!isOpen && (
                <div className="absolute top-20 left-0 right-0 bottom-0 flex justify-center py-4 cursor-pointer" onClick={() => setIsOpen(true)}>
                    <div className="rotate-180 [writing-mode:vertical-rl] text-xs font-bold text-gray-600 uppercase tracking-widest hover:text-indigo-400 transition-colors">
                        Tools
                    </div>
                </div>
            )}
        </aside>
    );
}
