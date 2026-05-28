import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogoIcon } from "../../components/logo";
import { Button } from "../../components/ui/button";

export function PlatformShell({
  user,
  onSignOut,
  children,
}: {
  user: { name: string | null; email: string | null };
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <LogoIcon className="size-8" />
            <div>
              <p className="text-muted-foreground text-sm">Tatamiq</p>
              <h1 className="font-semibold text-xl">Administração da Plataforma</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium">{user.name ?? "Administrador"}</p>
              <p className="text-muted-foreground">{user.email ?? "Sem email"}</p>
            </div>
            <Link
              to="/choose-area"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              Trocar área
            </Link>
            <Button variant="ghost" onClick={onSignOut}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto space-y-6 px-6 py-8 max-w-6xl">{children}</div>
    </main>
  );
}

export function PlatformLoading({ label }: { label: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <LogoIcon className="size-12" />
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </main>
  );
}
