import { Hammer, Wrench } from "lucide-react";

export default function ToolsPanel() {
    return (
        <aside className="hidden w-64 flex-col border-l border-gray-800 bg-gray-950 text-gray-300 lg:flex">
            <div className="flex h-16 items-center px-6 font-bold text-white border-b border-gray-800 gap-2">
                <Wrench className="h-5 w-5" />
                Tools
            </div>
            <div className="flex-1 p-4 flex flex-col items-center justify-center text-gray-500">
                <Hammer className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center">Tools panel for future extensions.</p>
            </div>
        </aside>
    );
}
