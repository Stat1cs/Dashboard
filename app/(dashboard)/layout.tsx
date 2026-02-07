import { Sidebar } from "@/components/dashboard/sidebar";
import { ChatInput } from "@/components/dashboard/chat-input";
import { QuickOpen } from "@/components/dashboard/quick-open";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <QuickOpen />
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">{children}</div>
        <div className="border-t border-border bg-muted/20">
          <ChatInput compact />
        </div>
      </main>
    </div>
  );
}
