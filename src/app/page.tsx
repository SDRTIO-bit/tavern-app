import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import PromptInspector from "@/components/PromptInspector";
import ErrorToast from "@/components/ErrorToast";

export default function HomePage() {
  return (
    <main className="flex h-screen bg-zinc-950 text-white" suppressHydrationWarning>
      <Sidebar />
      <ChatWindow />
      <PromptInspector />
      <ErrorToast />
    </main>
  );
}
