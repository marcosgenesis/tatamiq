import { Link } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";
import { DecorIcon } from "@/components/decor-icon";
import { LogoIcon } from "@/components/logo";

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="relative flex h-screen w-full items-center justify-center overflow-hidden px-6 md:px-8">
      <div className="relative flex w-full max-w-sm flex-col justify-between p-6 dark:bg-[radial-gradient(50%_80%_at_20%_0%,--theme(--color-foreground/.1),transparent)] md:p-8">
        <div className="absolute -inset-y-6 -left-px w-px bg-border" />
        <div className="absolute -inset-y-6 -right-px w-px bg-border" />
        <div className="absolute -inset-x-6 -top-px h-px bg-border" />
        <div className="absolute -inset-x-6 -bottom-px h-px bg-border" />
        <DecorIcon position="top-left" />
        <DecorIcon position="bottom-right" />

        <div className="w-full max-w-sm animate-in space-y-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Tatamiq">
            <LogoIcon className="size-10" />
            <div>
              <p className="text-lg font-semibold leading-none tracking-tight">Tatamiq</p>
              <p className="mt-1 text-xs text-muted-foreground">Gestão para o tatame</p>
            </div>
          </Link>
          {children}
        </div>
      </div>
    </main>
  );
}
