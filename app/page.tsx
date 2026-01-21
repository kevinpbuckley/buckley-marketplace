import { ChatWindow } from "@/components/chat";
import { getDefaultAgent } from "@/lib/agents";

export default function HomePage() {
  const agent = getDefaultAgent();
  
  return (
    <div className="flex flex-col h-screen">
      <main className="flex-1 overflow-hidden">
        <ChatWindow samplePrompts={agent.config.samplePrompts || []} />
      </main>
    </div>
  );
}

