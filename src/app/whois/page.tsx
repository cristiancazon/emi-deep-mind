"use client";

import Link from "next/link";
import { Bot, Calendar, Brain, ShieldCheck, Palette, Zap, Cpu, Globe, ArrowRight, Check, MessageSquare, Mic, Video } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function WhoIsPage() {
    const { profile } = useUserProfile();
    const agentName = profile.agentConfig?.name || "Emi";

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-primary/30">

            {/* 1. HERO SECTION: What is EMI? */}
            <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[180px] rounded-full -z-10 animate-pulse-slow" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10 -z-50" />

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-primary-300 text-sm font-medium mb-8 backdrop-blur-sm animate-fade-in-up">
                    <Bot className="h-4 w-4" />
                    <span>Next-Gen Personal Intelligence</span>
                </div>

                <div className="mb-6 p-6 rounded-3xl bg-white/5 border border-white/5 shadow-2xl backdrop-blur-sm animate-fade-in-up delay-100">
                    <img src="/logo_emi.png" alt="Emi Logo" className="h-24 w-auto object-contain" />
                </div>

                <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent max-w-4xl mx-auto leading-[1.1]">
                    Meet {agentName}.
                </h1>

                <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
                    Your <span className="text-white font-medium">multimodal companion</span> designed to bridge the gap between thought and action. It sees, hears, speaks, and executes.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all flex items-center gap-2">
                        Start Chatting <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="#capabilities" className="px-8 py-4 bg-white/5 text-white font-medium rounded-full hover:bg-white/10 border border-white/10 transition-all">
                        Explore Features
                    </Link>
                </div>
            </section>

            {/* 2. FOUNDATION: What is it based on? */}
            <section className="py-24 px-6 border-t border-white/5 bg-white/[0.02]">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by Advanced Technologies</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Built on the cutting edge of generative AI and cloud infrastructure to deliver speed, accuracy, and reliability.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <TechCard
                            icon={<Brain className="h-8 w-8 text-purple-400" />}
                            title="Gemini 2.5 Logic"
                            description="Leveraging Google's most efficient multimodal model for near-instant reasoning and context understanding."
                        />
                        <TechCard
                            icon={<Zap className="h-8 w-8 text-yellow-400" />}
                            title="Real-time Streaming"
                            description="WebSockets and low-latency audio processing enable fluid, interruption-friendly voice conversations."
                        />
                        <TechCard
                            icon={<Cpu className="h-8 w-8 text-blue-400" />}
                            title="Adaptive Memory"
                            description="A hybrid vector + graph memory system that learns from your preferences and history over time."
                        />
                    </div>
                </div>
            </section>

            {/* 3. PURPOSE: What is it for? */}
            <section className="py-24 px-6 relative overflow-hidden">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                            More than an assistant.<br />
                            <span className="text-gray-500">An extension of you.</span>
                        </h2>
                        <p className="text-lg text-gray-400 leading-relaxed">
                            EMI isn't just for answering trivia. It's built to <strong className="text-white">get things done</strong>. Whether you're a developer needing to debug code, a manager organizing a schedule, or a creative brainstorming ideas, EMI adapts to your workflow.
                        </p>
                        <ul className="space-y-4">
                            <FeatureItem text="Automate mundane digital chores" />
                            <FeatureItem text="Synthesize complex information instantly" />
                            <FeatureItem text="Maintain context across days and sessions" />
                            <FeatureItem text="Interact hands-free while on the move" />
                        </ul>
                    </div>
                    <div className="flex-1 relative">
                        {/* Abstract visual representation of "Connection" */}
                        <div className="relative w-full aspect-square rounded-[3rem] bg-gradient-to-tr from-gray-800 to-black border border-white/10 overflow-hidden flex items-center justify-center">
                            <div className="absolute inset-0 bg-grid-white/[0.05]" />
                            <div className="relative z-10 grid grid-cols-2 gap-4 p-8 w-full">
                                <AppIcon icon={<Calendar />} label="Calendar" color="bg-blue-500/20 text-blue-400" />
                                <AppIcon icon={<Check />} label="Tasks" color="bg-emerald-500/20 text-emerald-400" />
                                <AppIcon icon={<Globe />} label="Search" color="bg-orange-500/20 text-orange-400" />
                                <AppIcon icon={<Brain />} label="Memory" color="bg-purple-500/20 text-purple-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. FUNCTIONS: Detail capabilities */}
            <section id="capabilities" className="py-24 px-6 bg-black">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Core Functions</h2>
                        <div className="h-1 w-20 bg-primary rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FunctionCard
                            title="Conversational AI"
                            icon={<MessageSquare className="text-white" />}
                            desc="Natural language processing for writing, coding, analysis, and creative drafting."
                            tags={["GPT-4 Class", "Code", "Analysis"]}
                        />
                        <FunctionCard
                            title="Live Voice Mode"
                            icon={<Mic className="text-white" />}
                            desc="Bi-directional, interruptible voice chat. Feels like talking to a human on the phone."
                            tags={["Low Latency", "Natural TTS", "Hands-free"]}
                        />
                        <FunctionCard
                            title="Visual Perception"
                            icon={<Video className="text-white" />}
                            desc="Show EMI your camera or upload images. It can analyze surroundings, documents, and code."
                            tags={["Computer Vision", "Real-time"]}
                        />
                        <FunctionCard
                            title="Workspace Actions"
                            icon={<Calendar className="text-white" />}
                            desc="Direct integration with Google Calendar, Tasks, and Gmail to manage your life."
                            tags={["OAuth2", "Secure", "Write Access"]}
                        />
                        <FunctionCard
                            title="Web Intelligence"
                            icon={<Globe className="text-white" />}
                            desc="Access to real-time information via Google Search and News for up-to-the-minute answers."
                            tags={["Browsing", "Fact-checking", "Maps"]}
                        />
                        <FunctionCard
                            title="Deep Personalization"
                            icon={<Palette className="text-white" />}
                            desc="Customizable themes, voice settings, and a memory that learns your specific preferences."
                            tags={["Themes", "Config", "Adaptability"]}
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/10 text-center">
                <p className="text-gray-500 text-sm">
                    © {new Date().getFullYear()} Emi Deep Mind. Architecture by Antigravity.
                </p>
            </footer>
        </div>
    );
}

// --- Components ---

function TechCard({ icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="p-8 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <div className="mb-6 bg-black/50 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
        </div>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <li className="flex items-center gap-3 text-lg text-gray-300">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-primary" />
            </div>
            {text}
        </li>
    );
}

function AppIcon({ icon, label, color }: { icon: any, label: string, color: string }) {
    return (
        <div className={`aspect-square rounded-3xl ${color} flex flex-col items-center justify-center gap-2 border border-white/5`}>
            {icon}
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
        </div>
    );
}

function FunctionCard({ title, icon, desc, tags }: { title: string, icon: any, desc: string, tags: string[] }) {
    return (
        <div className="group relative p-8 rounded-3xl bg-[#111] border border-white/5 hover:border-white/20 transition-all overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity scale-150 transform group-hover:scale-125 duration-500">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
            <p className="text-gray-400 text-sm mb-6 h-12">{desc}</p>
            <div className="flex flex-wrap gap-2">
                {tags.map((t, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/5 text-xs text-gray-400 border border-white/5">
                        {t}
                    </span>
                ))}
            </div>
        </div>
    );
}
