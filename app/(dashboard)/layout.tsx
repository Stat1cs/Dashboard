"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
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
        <div
          className="flex-1 overflow-auto"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
