"use client";

import Link from "next/link";
import { Bot, Calendar, Newspaper, Mail, Brain, ShieldCheck, ArrowLeft } from "lucide-react";

export default function WhoisPage() {
    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans scroll-smooth">
            {/* Hero Section */}
            <header className="relative py-20 px-6 flex flex-col items-center text-center overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/20 blur-[120px] rounded-full -z-10" />

                <div className="mb-6 rounded-3xl bg-gray-900/50 p-6 border border-gray-800 shadow-2xl backdrop-blur-sm">
                    <img src="/logo_emi.png" alt="EMI Logo" className="h-32 w-auto object-contain" />
                </div>

                <h1 className="text-5xl lg:text-7xl font-extrabold mb-6 tracking-tight bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
                    Meet EMI
                </h1>

                <p className="text-xl text-gray-400 max-w-2xl leading-relaxed">
                    Personalized Intelligence. Seamless Integration. <br />
                    Your multimodal companion for productivity and information.
                </p>
            </header>

            {/* Content Sections */}
            <main className="max-w-6xl mx-auto px-6 py-12 space-y-24">

                {/* What is EMI? */}
                <section className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold uppercase tracking-wider">
                            <Bot className="h-4 w-4" /> The Concept
                        </div>
                        <h2 className="text-4xl font-bold">What is EMI?</h2>
                        <p className="text-gray-400 text-lg leading-relaxed">
                            EMI (Expert Multimodal Intelligence) is a sophisticated personal assistant built using the cutting-edge **Gemini 2.5 Flash** model. Unlike standard chatbots, EMI is designed to be a living part of your digital ecosystem, remembering your preferences and interating directly with the services you use every day.
                        </p>
                    </div>
                    <div className="bg-gray-900/40 rounded-3xl p-8 border border-gray-800 shadow-inner">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-800/50 rounded-2xl flex flex-col items-center text-center space-y-2">
                                <Brain className="h-8 w-8 text-purple-400" />
                                <h4 className="font-semibold text-sm">Long-term Memory</h4>
                            </div>
                            <div className="p-4 bg-gray-800/50 rounded-2xl flex flex-col items-center text-center space-y-2">
                                <ShieldCheck className="h-8 w-8 text-blue-400" />
                                <h4 className="font-semibold text-sm">Secure OAuth</h4>
                            </div>
                            <div className="p-4 bg-gray-800/50 rounded-2xl flex flex-col items-center text-center space-y-2">
                                <Bot className="h-8 w-8 text-indigo-400" />
                                <h4 className="font-semibold text-sm">Gemini Powered</h4>
                            </div>
                            <div className="p-4 bg-gray-800/50 rounded-2xl flex flex-col items-center text-center space-y-2">
                                <Hammer className="h-8 w-8 text-emerald-400" />
                                <h4 className="font-semibold text-sm">Tool Integration</h4>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Capabilities */}
                <section className="space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl font-bold">What can EMI do?</h2>
                        <p className="text-gray-400 max-w-xl mx-auto">
                            EMI is equipped with real-world tools that allow it to perform actions on your behalf across various Google services.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Calendar */}
                        <div className="group bg-gray-900/50 p-8 rounded-3xl border border-gray-800 hover:border-primary/50 transition-all duration-300">
                            <div className="mb-6 h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Google Calendar</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                EMI can list, create, edit, and delete events. Just say "Book a meeting" or "What's my day look like?".
                            </p>
                        </div>

                        {/* News */}
                        <div className="group bg-gray-900/50 p-8 rounded-3xl border border-gray-800 hover:border-emerald-500/50 transition-all duration-300">
                            <div className="mb-6 h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                <Newspaper className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Google News</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Stay informed with real-time news from Google News Argentina. Search topics or get the top headlines.
                            </p>
                        </div>

                        {/* Gmail */}
                        <div className="group bg-gray-900/50 p-8 rounded-3xl border border-gray-800 hover:border-rose-500/50 transition-all duration-300">
                            <div className="mb-6 h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                                <Mail className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Gmail Interaction</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Read your emails, create drafts for review, or send messages using full HTML formatting and direct UI feedback.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Integration Section */}
                <section className="bg-gradient-to-b from-gray-900 to-gray-950 p-12 rounded-[3rem] border border-gray-800 text-center space-y-8 shadow-2xl">
                    <h2 className="text-3xl font-bold">Start your personalized experience</h2>
                    <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
                        Log in with your Google account to grant EMI the permissions it needs to serve you. You are always in control of what EMI can access.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Link href="/login" className="px-10 py-4 bg-primary text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/20">
                            Get Started
                        </Link>
                        <Link href="/login" className="px-10 py-4 bg-gray-800/50 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back to Login
                        </Link>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-12 border-t border-gray-900 text-center text-gray-600 text-sm">
                &copy; {new Date().getFullYear()} Emi Deep Mind. Powered by Gemini Multimodal Live API.
            </footer>
        </div>
    );
}

// Simple Hammer icon for the concept grid since hammer comes from lucide too but was missing in the top import list
const Hammer = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
        <path d="M17.64 15 22 10.64" />
        <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6l-1.25-1.25c-.6-.6-1.4-.93-2.25-.93h-.86L9.01 5.05 5.05 9.01l-2.69 2.69" />
        <path d="m8 6 5 5" />
    </svg>
)
