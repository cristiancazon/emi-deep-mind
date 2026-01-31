"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import ToolsPanel from "@/components/ToolsPanel";
import { Settings as SettingsIcon, Bell, Lock, User, Globe, ChevronRight, Save, Loader2, Bot, Radio, Wrench, MapPin, Plus, X } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function SettingsPage() {
    const { user, loading: authLoading } = useAuth();
    const { profile, updateProfile, addTag, removeTag, saving, saveProfile, loading: profileLoading } = useUserProfile();
    const router = useRouter();
    const [tagInput, setTagInput] = useState("");

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const handleTagKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            addTag(tagInput.trim());
            setTagInput("");
        }
    };

    if (authLoading || profileLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-950 text-white">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
            <Sidebar />
            <main className="flex flex-1 flex-col overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full p-8 pb-24">
                    <header className="mb-10 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                            <p className="text-gray-400">Manage your account settings and preferences.</p>
                        </div>
                        <button
                            onClick={saveProfile}
                            disabled={saving}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </header>

                    <div className="space-y-12">
                        {/* User Context Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-gray-800"></div>
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-4">User Context</h2>
                                <div className="h-px flex-1 bg-gray-800"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Language */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <Globe className="h-4 w-4" /> Language
                                    </label>
                                    <select
                                        value={profile.language}
                                        onChange={(e) => updateProfile({ language: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-800 text-gray-100 rounded-xl p-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none cursor-pointer hover:bg-gray-800/80 shadow-inner"
                                    >
                                        <option value="es">Español</option>
                                        <option value="en">English</option>
                                        <option value="pt">Português</option>
                                        <option value="fr">Français</option>
                                        <option value="de">Deutsch</option>
                                    </select>
                                </div>

                                {/* Location */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <MapPin className="h-4 w-4" /> Location
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.location}
                                        onChange={(e) => updateProfile({ location: e.target.value })}
                                        placeholder="City, Country"
                                        className="w-full bg-gray-900 border border-gray-800 text-gray-100 rounded-xl p-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600 shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* Tags System */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> Preferences & Tags
                                </label>
                                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {profile.tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 group">
                                                {tag}
                                                <button
                                                    onClick={() => removeTag(tag)}
                                                    className="hover:text-white hover:bg-indigo-500 rounded-full p-0.5 transition-colors"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </span>
                                        ))}
                                        {profile.tags.length === 0 && (
                                            <span className="text-sm text-gray-600 italic">No tags added yet.</span>
                                        )}
                                    </div>

                                    <div className="relative max-w-md">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                            placeholder="Type a tag and press Enter..."
                                            className="w-full bg-gray-950 border border-gray-800 text-gray-100 rounded-xl p-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600 pr-12 shadow-inner"
                                        />
                                        <div className="absolute right-3.5 top-3.5">
                                            <span className="text-xs text-gray-500 border border-gray-800 rounded px-2 py-1 bg-gray-900 font-mono">
                                                Enter
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Agent Persona Section */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-gray-800"></div>
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-4">Agent Persona</h2>
                                <div className="h-px flex-1 bg-gray-800"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Agent Name */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <Bot className="h-4 w-4" /> Agent Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.agentConfig?.name || 'Emi'}
                                        onChange={(e) => updateProfile({ agentConfig: { ...profile.agentConfig, name: e.target.value } })}
                                        placeholder="Name (e.g. Jarvis)"
                                        className="w-full bg-gray-900 border border-gray-800 text-gray-100 rounded-xl p-3.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600 shadow-inner"
                                    />
                                </div>

                                {/* Tone */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                        <Radio className="h-4 w-4" /> Tone
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['friendly', 'professional', 'concise', 'enthusiastic'].map((tone) => (
                                            <button
                                                key={tone}
                                                onClick={() => updateProfile({ agentConfig: { ...profile.agentConfig, tone: tone as any } })}
                                                className={`px-4 py-3 text-xs font-bold rounded-xl border transition-all uppercase tracking-wider ${profile.agentConfig?.tone === tone
                                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                                                    }`}
                                            >
                                                {tone}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Custom Instructions */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                    <Wrench className="h-4 w-4" /> Custom Instructions
                                </label>
                                <textarea
                                    value={profile.agentConfig?.customInstructions || ''}
                                    onChange={(e) => updateProfile({ agentConfig: { ...profile.agentConfig, customInstructions: e.target.value } })}
                                    placeholder="e.g. Be funny, use emojis, explain like I'm 5..."
                                    rows={6}
                                    className="w-full bg-gray-900 border border-gray-800 text-gray-100 rounded-2xl p-5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-gray-600 resize-none shadow-inner leading-relaxed"
                                />
                            </div>
                        </section>
                    </div>
                </div>
            </main>
            <ToolsPanel />
        </div>
    );
}
