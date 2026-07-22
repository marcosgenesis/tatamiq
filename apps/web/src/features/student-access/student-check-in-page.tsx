import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft01Icon, Cancel01Icon, QrCodeIcon, Tick02Icon } from "hugeicons-react";
import { type ReactNode, useEffect, useState } from "react";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { authClient } from "../../lib/auth-client";
import { cn } from "../../lib/utils";
import { QrCheckInScanner } from "./qr-check-in-scanner";

type Variant = "loading" | "success" | "error" | "info" | "scanner";

export function StudentCheckInPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  // Arrival via the instructor's QR opened by the OS camera already carries the
  // token in the URL. In-app scanning starts tokenless and lifts the decoded
  // token into state, which drives the confirmation flow on the same route.
  const [token, setToken] = useState(
    () => new URLSearchParams(window.location.search).get("token") ?? "",
  );
  const redirect = token
    ? `/student/check-in?token=${encodeURIComponent(token)}`
    : "/student/check-in";

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/student/attendances/qr", { body: { token } });
      if (error) throw new Error("Não foi possível confirmar presença com este QR Code.");
      return data;
    },
  });

  useEffect(() => {
    if (!session.data || !token || mutation.isPending || mutation.isSuccess || mutation.isError) {
      return;
    }
    mutation.mutate();
  }, [session.data, token, mutation]);

  if (!session.data) {
    return (
      <CheckInShell
        variant="info"
        title="Entre para confirmar presença"
        description="Use sua conta com Acesso do Aluno para registrar presença nesta aula."
      >
        <Button
          className="w-full"
          onClick={() => void navigate({ to: "/sign-in", search: { redirect } })}
        >
          Entrar
        </Button>
      </CheckInShell>
    );
  }

  if (!token) {
    return (
      <CheckInShell variant="scanner">
        <QrCheckInScanner onToken={setToken} />
      </CheckInShell>
    );
  }

  if (mutation.isPending || mutation.isIdle) {
    return (
      <CheckInShell
        variant="loading"
        title="Confirmando presença..."
        description="Validando o QR Code da aula."
      />
    );
  }

  if (mutation.isError || !mutation.data) {
    return (
      <CheckInShell
        variant="error"
        title="Presença não registrada"
        description="Este QR Code pode estar expirado, fechado, ou sua conta pode não ter acesso de aluno ativo."
      >
        <Link
          className="text-sm font-semibold text-white/70 underline-offset-4 hover:underline"
          to="/student"
        >
          Voltar para a área do aluno
        </Link>
      </CheckInShell>
    );
  }

  const { attendance, classSession } = mutation.data;
  return (
    <CheckInShell
      variant="success"
      title="Presença confirmada!"
      description="Você está registrado na aula de hoje"
    >
      <div className="w-full rounded-2xl bg-white/5 p-[1.1rem]">
        <DetailRow label="Turma" value={classSession.classGroupName} />
        <DetailRow label="Horário" value={`${formatTime(attendance.createdAt)}`} top />
        <DetailRow label="Aluno" value={attendance.studentName} top />
      </div>
      {attendance.isOutOfGroup ? (
        <p className="rounded-xl bg-white/5 px-3 py-2.5 text-xs font-medium text-white/60">
          Esta presença foi registrada fora das suas turmas vinculadas.
        </p>
      ) : null}
    </CheckInShell>
  );
}

function CheckInShell({
  variant,
  title,
  description,
  children,
}: {
  variant: Variant;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <main
      className={cn(
        "relative flex min-h-screen flex-col bg-neutral-950 pb-10 pt-[max(env(safe-area-inset-top),1rem)] text-white",
        variant !== "scanner" && "px-6",
      )}
    >
      <div className={cn("pt-2", variant === "scanner" && "px-6")}>
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => void navigate({ to: "/student" })}
          className="relative z-10 grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/15"
        >
          <ArrowLeft01Icon className="size-5" aria-hidden="true" />
        </button>
      </div>

      {variant === "scanner" ? (
        children
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <StatusMedallion variant={variant} />
          <h1 className="mt-7 text-[1.55rem] font-bold tracking-tight text-balance">{title}</h1>
          <p className="mt-2 max-w-[20rem] text-sm font-medium text-white/60">{description}</p>
          <div className="mt-6 flex w-full max-w-sm flex-col items-center gap-3">{children}</div>
        </div>
      )}

      {variant === "success" ? (
        <div className="mx-auto flex w-full max-w-sm flex-col gap-1.5">
          <Button
            variant="secondary"
            className="w-full bg-white text-neutral-900 hover:bg-white/90"
            onClick={() => void navigate({ to: "/student" })}
          >
            Concluir
          </Button>
          <Button
            variant="ghost"
            className="w-full text-white/60 hover:bg-white/5 hover:text-white"
            onClick={() => void navigate({ to: "/student" })}
          >
            Ver minha agenda
          </Button>
        </div>
      ) : null}
    </main>
  );
}

function StatusMedallion({ variant }: { variant: Exclude<Variant, "scanner"> }) {
  if (variant === "loading") {
    return (
      <span className="grid size-[7.25rem] place-items-center rounded-full bg-primary/15">
        <span
          role="status"
          aria-label="Carregando"
          className="size-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary motion-reduce:animate-none"
        />
      </span>
    );
  }
  const config = {
    success: { ring: "bg-emerald-500 shadow-[0_8px_32px_rgba(16,163,74,0.45)]", Icon: Tick02Icon },
    error: { ring: "bg-destructive/90", Icon: Cancel01Icon },
    info: { ring: "bg-primary", Icon: QrCodeIcon },
  }[variant];
  return (
    <span
      className={cn(
        "grid size-[7.25rem] place-items-center rounded-full ring-8 ring-white/10",
        config.ring,
      )}
    >
      <config.Icon className="size-14 text-white" aria-hidden="true" />
    </span>
  );
}

function DetailRow({ label, value, top }: { label: string; value: string; top?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 text-left",
        top && "border-t border-white/10",
      )}
    >
      <span className="text-[0.8rem] font-medium text-white/50">{label}</span>
      <span className="text-[0.85rem] font-semibold">{value}</span>
    </div>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}
