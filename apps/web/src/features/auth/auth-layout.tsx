import { Link } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-12rem] h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,color-mix(in_oklch,var(--border)_42%,transparent)_1px,transparent_0)] bg-[length:28px_28px] opacity-25" />
      </div>

      <section className="relative w-full max-w-md rounded-[2rem] border border-border bg-card/88 p-6 shadow-2xl backdrop-blur-xl md:p-8">
        <Link to="/" className="mb-8 flex items-center gap-3" aria-label="Tatamiq">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_32px_color-mix(in_oklch,var(--primary)_40%,transparent)]">
            <span className="text-xl font-black tracking-tighter">T</span>
          </div>
          <div>
            <p className="text-lg font-semibold leading-none tracking-tight">Tatamiq</p>
            <p className="mt-1 text-xs text-muted-foreground">Gestão para o tatame</p>
          </div>
        </Link>
        {children}
      </section>
    </main>
  );
}
