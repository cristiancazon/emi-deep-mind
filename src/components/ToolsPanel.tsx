import { useRef, useState } from "react";
import { Hammer, Wrench, Radio, Settings, MapPin, Globe, Plus, X, Loader2, ChevronLeft, ChevronRight, Bot } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function ToolsPanel() {
    const { profile, updateProfile, addTag, removeTag, saving } = useUserProfile();
    const [tagInput, setTagInput] = useState("");
    const [isOpen, setIsOpen] = useState(false); // Default hidden

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            addTag(tagInput.trim());
            setTagInput("");
        }
    };

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
                        title={isOpen ? "Collapse" : "Expand Config"}
                    >
                        <Settings className={`h-5 w-5 text-indigo-400 transition-transform duration-500 ${!isOpen && 'rotate-180'}`} />
                    </button>
                </div>

                {/* Title & Status (Visible only when open) */}
                <div className={`flex-1 flex items-center justify-between pr-4 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="font-bold text-white whitespace-nowrap truncate">Config & Personalization</span>
                    {saving && (
                        <div className="flex items-center gap-1 text-xs text-indigo-400 animate-pulse">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-[10px]">Saving</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            <div className={`flex-1 overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {isOpen && (
                    <>
                        <div className="h-full overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            <div className="flex flex-col gap-8 pt-2">

                                {/* User Context Section */}
                                <div className="space-y-5">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        User Context
                                        <div className="h-px flex-1 bg-gray-800"></div>
                                    </h3>

                                    {/* Language */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                            <Globe className="h-3.5 w-3.5" /> Language
                                        </label>
                                        <select
                                            value={profile.language}
                                            onChange={(e) => updateProfile({ language: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-800 text-sm text-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer hover:bg-gray-800/80"
                                        >
                                            <option value="es">Español</option>
                                            <option value="en">English</option>
                                            <option value="pt">Português</option>
                                            <option value="fr">Français</option>
                                            <option value="de">Deutsch</option>
                                        </select>
                                    </div>

                                    {/* Location */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" /> Location
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.location}
                                            onChange={(e) => updateProfile({ location: e.target.value })}
                                            placeholder="City, Country"
                                            className="w-full bg-gray-900 border border-gray-800 text-sm text-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600"
                                        />
                                    </div>

                                    {/* Tags System */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                            <Plus className="h-3.5 w-3.5" /> Preferences & Tags
                                        </label>

                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {profile.tags.map(tag => (
                                                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 group">
                                                    {tag}
                                                    <button
                                                        onClick={() => removeTag(tag)}
                                                        className="hover:text-white hover:bg-indigo-500 rounded-full p-0.5 transition-colors"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Add tag..."
                                                className="w-full bg-gray-900 border border-gray-800 text-sm text-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600 pr-8"
                                            />
                                            <div className="absolute right-2.5 top-2.5">
                                                <span className="text-[10px] text-gray-500 border border-gray-700 rounded px-1.5 py-0.5">
                                                    ↵
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Agent Personality Section */}
                                <div className="space-y-5">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        Agent Persona
                                        <div className="h-px flex-1 bg-gray-800"></div>
                                    </h3>

                                    {/* Agent Name */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                            <Bot className="h-3.5 w-3.5" /> Agent Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.agentConfig?.name || 'Emi'}
                                            onChange={(e) => updateProfile({ agentConfig: { ...profile.agentConfig, name: e.target.value } })}
                                            placeholder="Name (e.g. Jarvis)"
                                            className="w-full bg-gray-900 border border-gray-800 text-sm text-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600"
                                        />
                                    </div>

                                    {/* Tone */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                            <Radio className="h-3.5 w-3.5" /> Tone
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['friendly', 'professional', 'concise', 'enthusiastic'].map((tone) => (
                                                <button
                                                    key={tone}
                                                    onClick={() => updateProfile({ agentConfig: { ...profile.agentConfig, tone: tone as any } })}
                                                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all capitalized ${profile.agentConfig?.tone === tone
                                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                                                        }`}
                                                >
                                                    {tone.charAt(0).toUpperCase() + tone.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Instructions */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                                            <Wrench className="h-3.5 w-3.5" /> Custom Instructions
                                        </label>
                                        <textarea
                                            value={profile.agentConfig?.customInstructions || ''}
                                            onChange={(e) => updateProfile({ agentConfig: { ...profile.agentConfig, customInstructions: e.target.value } })}
                                            placeholder="e.g. Be funny, use emojis, explain like I'm 5..."
                                            rows={3}
                                            className="w-full bg-gray-900 border border-gray-800 text-sm text-gray-200 rounded-lg p-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Vertical Label When Closed */}
            {!isOpen && (
                <div className="absolute top-20 left-0 right-0 bottom-0 flex justify-center py-4 cursor-pointer" onClick={() => setIsOpen(true)}>
                    <div className="rotate-180 [writing-mode:vertical-rl] text-xs font-bold text-gray-600 uppercase tracking-widest hover:text-indigo-400 transition-colors">
                        Configuration
                    </div>
                </div>
            )}
        </aside>
    );
}
