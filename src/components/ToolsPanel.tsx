import { Settings, Hammer, Sun, Moon, Palette, Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";

export default function ToolsPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();

    const colors = [
        { name: "Indigo", value: "#6366f1" },
        { name: "Rose", value: "#f43f5e" },
        { name: "Amber", value: "#f59e0b" },
        { name: "Emerald", value: "#10b981" },
        { name: "Sky", value: "#0ea5e9" },
        { name: "Violet", value: "#8b5cf6" },
        { name: "Orange", value: "#f97316" },
        { name: "Pink", value: "#ec4899" },
        { name: "Cyan", value: "#06b6d4" },
        { name: "Slate", value: "#64748b" },
    ];

    return (
        <aside
            className={`${isOpen ? 'w-80' : 'w-14'} hidden lg:flex flex-col border-l border-border-theme bg-surface text-foreground transition-all duration-300 ease-in-out relative z-20 shadow-xl`}
        >
            {/* Unified Header */}
            <div className="flex h-16 items-center border-b border-border-theme bg-surface/50 backdrop-blur-sm shrink-0 overflow-hidden">
                {/* Toggle Button Column (Fixed Width) */}
                <div className="w-14 h-full flex items-center justify-center shrink-0">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 hover:bg-background rounded-lg transition-colors group"
                        title={isOpen ? "Collapse" : "Expand Tools"}
                    >
                        <Settings className={`h-5 w-5 text-primary transition-transform duration-500 ${!isOpen && 'rotate-180'}`} />
                    </button>
                </div>

                {/* Title (Visible only when open) */}
                <div className={`flex-1 flex items-center justify-between pr-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="font-bold text-foreground whitespace-nowrap truncate">Tools & Integration</span>
                </div>
            </div>

            {/* Expanded Content */}
            <div className={`flex-1 overflow-x-hidden overflow-y-auto transition-opacity duration-300 custom-scrollbar ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {isOpen && (
                    <div className="p-5 flex flex-col space-y-8">
                        {/* Personalization Section */}
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2 text-primary">
                                <Palette className="h-4 w-4" />
                                <h3 className="text-sm font-semibold uppercase tracking-wider">Personalization</h3>
                            </div>

                            {/* Theme Toggle */}
                            <div className="bg-background/50 border border-gray-800 rounded-xl p-4 space-y-3">
                                <span className="text-xs font-medium text-gray-400">Appearance</span>
                                <div className="flex bg-gray-900 rounded-lg p-1">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md transition-all ${theme === 'light' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <Sun className="h-4 w-4" />
                                        <span className="text-sm">Light</span>
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-md transition-all ${theme === 'dark' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <Moon className="h-4 w-4" />
                                        <span className="text-sm">Dark</span>
                                    </button>
                                </div>
                            </div>

                            {/* Color Selection */}
                            <div className="bg-background/50 border border-gray-800 rounded-xl p-4 space-y-3">
                                <span className="text-xs font-medium text-gray-400">Primary Color</span>
                                <div className="grid grid-cols-5 gap-2">
                                    {colors.map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => setPrimaryColor(color.value)}
                                            className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                                            style={{
                                                backgroundColor: color.value,
                                                borderColor: primaryColor === color.value ? 'white' : 'transparent'
                                            }}
                                            title={color.name}
                                        >
                                            {primaryColor === color.value && <Check className="h-4 w-4 text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tools Section (Placeholder) */}
                        <div className="space-y-4 pt-4 border-t border-gray-800">
                            <div className="flex items-center space-x-2 text-gray-400">
                                <Hammer className="h-4 w-4" />
                                <h3 className="text-sm font-semibold uppercase tracking-wider">Active Tools</h3>
                            </div>
                            <div className="space-y-3 p-4 bg-background/50 rounded-xl border border-border-theme">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Calendar</span>
                                    <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-400/20">
                                        <Check className="h-3 w-3" /> Ok
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">News</span>
                                    <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-400/20">
                                        <Check className="h-3 w-3" /> Ok
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Gmail</span>
                                    <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-400/20">
                                        <Check className="h-3 w-3" /> Ok
                                    </span>
                                </div>
                            </div>
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
