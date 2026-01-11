import { MessageSquarePlus, MessageSquare, Settings, User, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar() {
    const { user, logOut } = useAuth();
    return (
        <aside className="flex w-64 flex-col border-r border-gray-800 bg-gray-950 text-gray-300">
            <div className="flex h-16 items-center px-6 font-bold text-white border-b border-gray-800">
                Emi Deep Mind
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <button className="flex w-full items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors">
                    <MessageSquarePlus className="h-5 w-5" />
                    <span>New Chat</span>
                </button>
                <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Recent</h3>
                    {/* Placeholder for history */}
                    <div className="flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-gray-900 cursor-pointer text-sm transition-colors">
                        <MessageSquare className="h-4 w-4" />
                        <span>Previous conversation...</span>
                    </div>
                </div>
            </div>
            <div className="border-t border-gray-800 p-4">
                <div className="flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-gray-900 cursor-pointer transition-colors">
                    <User className="h-5 w-5" />
                    <span className="truncate max-w-[120px]">{user?.email || "User Profile"}</span>
                </div>
                <button
                    onClick={logOut}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-2 hover:bg-red-900/20 text-red-400 hover:text-red-300 transition-colors mt-2"
                >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                </button>
                <div className="flex items-center gap-3 rounded-lg px-4 py-2 hover:bg-gray-900 cursor-pointer text-sm text-gray-400 transition-colors">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                </div>
            </div>
        </aside>
    );
}
