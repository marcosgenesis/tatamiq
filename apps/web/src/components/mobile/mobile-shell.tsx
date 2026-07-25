import type { ReactNode } from "react";
import { MobileAppHeader } from "@/components/mobile/mobile-app-header";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";

/**
 * Full-screen mobile shell for the instructor area: sticky App Header, a scrolling
 * content column on the cool `m-bg` surface, and a sticky bottom nav with the
 * center Chamada FAB. Uses the SF Pro / Inter mobile type system (`font-mobile`).
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-m-bg font-mobile text-m-ink tracking-[-0.15px]">
      <MobileAppHeader />
      <main className="flex-1">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
