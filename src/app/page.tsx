"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import ToolsPanel from "@/components/ToolsPanel";
import ChatComponent from "@/components/ChatComponent";
import LiveInterface from "@/components/LiveInterface";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const [showLive, setShowLive] = useState(false);

  if (loading) {
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
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex flex-1 flex-col">
        {/* Header could go here if needed, but Sidebar has title */}
        <ChatComponent />
        {showLive && <LiveInterface onClose={() => setShowLive(false)} />}
      </main>
      <ToolsPanel onToggleLive={() => setShowLive(true)} />
    </div>
  );
}
