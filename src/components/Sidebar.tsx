import { MessageSquarePlus, MessageSquare, Settings, User, LogOut, PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import Link from "next/link";

export default function Sidebar() {
    const { user, logOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false); // Default hidden

    return (
        <aside
            className={`${isOpen ? 'w-64' : 'w-14'} flex flex-col border-r border-gray-800 bg-gray-950 text-gray-300 transition-all duration-300 ease-in-out relative z-30 shrink-0`}
        >
            {/* Unified Header */}
            <div className="flex h-16 items-center border-b border-gray-800 shrink-0 overflow-hidden">
                {/* Toggle Button Column (Fixed Width) */}
                <div className="w-14 h-full flex items-center justify-center shrink-0">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 hover:bg-gray-900 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>

                {/* Brand Title (Visible only when open) */}
                <div className={`flex-1 font-bold text-white whitespace-nowrap px-2 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    Emi Deep Mind
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {isOpen && (
                    <>
                        <div className="flex-1 overflow-y-auto p-4">
                            <Link href="/" className="flex w-full items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors whitespace-nowrap">
                                <MessageSquarePlus className="h-5 w-5 shrink-0" />
                                <span>New Chat</span>
                            </Link>
                            <div className="mt-6">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 whitespace-nowrap">Recent</h3>
                                {/* Placeholder for history */}
                                <div className="flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-gray-900 cursor-pointer text-sm transition-colors whitespace-nowrap">
                                    <MessageSquare className="h-4 w-4 shrink-0" />
                                    <span className="truncate">Previous conversation...</span>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-800 p-4">
                            <div className="flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-gray-900 cursor-pointer transition-colors whitespace-nowrap">
                                <User className="h-5 w-5 shrink-0" />
                                <span className="truncate max-w-[120px]">{user?.email || "User Profile"}</span>
                            </div>
                            <button
                                onClick={logOut}
                                className="flex w-full items-center gap-3 rounded-lg px-4 py-2 hover:bg-red-900/20 text-red-400 hover:text-red-300 transition-colors mt-2 whitespace-nowrap"
                            >
                                <LogOut className="h-4 w-4 shrink-0" />
                                <span>Sign Out</span>
                            </button>
                            <Link href="/settings" className="flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-gray-900 cursor-pointer text-sm text-gray-400 transition-colors whitespace-nowrap">
                                <Settings className="h-4 w-4 shrink-0" />
                                <span>Settings</span>
                            </Link>
                        </div>
                    </>
                )}
            </div>

            {/* Icons-only View When Closed (Optional enhancement for usability) */}
            {!isOpen && (
                <div className="absolute top-16 left-0 right-0 flex flex-col items-center pt-4 gap-4">
                    <button className="p-2 hover:bg-gray-900 rounded-lg text-blue-500" title="New Chat" onClick={() => setIsOpen(true)}>
                        <MessageSquarePlus className="h-5 w-5" />
                    </button>
                </div>
            )}
        </aside>
    );
}
