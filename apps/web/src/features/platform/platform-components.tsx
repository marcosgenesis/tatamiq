import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building02Icon,
  ManagerIcon,
  PlusSignIcon,
  Search01Icon,
  SecurityCheckIcon,
  UserMultipleIcon,
} from "hugeicons-react";
import { type ComponentType, type ReactNode, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { type ProvisionPlatformAcademyInput, provisionPlatformAcademy } from "./platform-queries";

type IconType = ComponentType<{ className?: string }>;

// --- Formatting helpers ---------------------------------------------------

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function formatLongDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(value));
}

export function formatRelative(value: string, now: Date = new Date()): string {
  const date = new Date(value);
  const diffMs = now.getTime() - date.getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} d`;
  return formatDate(value);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

export type AcademyResponsible = { name: string; email: string };

export function formatAcademyResponsiblesSummary(
  responsibles?: AcademyResponsible[] | null,
): string {
  const list = responsibles ?? [];
  if (list.length === 0) return "Sem responsável";
  const first = list[0];
  return list.length > 1 ? `${first?.email ?? ""} · +${list.length - 1}` : (first?.email ?? "");
}

// --- Audit action metadata ------------------------------------------------

export const ACTION_LABELS: Record<string, string> = {
  "platform.dashboard.viewed": "Dashboard visualizado",
  "platform.academy.provisioned": "Academia provisionada",
  "platform.academy.transferred": "Academia transferida",
  "platform.academy.responsible_added": "Responsável adicionado à academia",
  "platform.academy.responsible_removed": "Responsável removido da academia",
  "platform.academy.final_responsible_removed": "Academia deixada sem responsável",
  "platform.user.banned": "Usuário bloqueado",
  "platform.user.unbanned": "Usuário desbloqueado",
  "platform.user.sessions_revoked": "Sessões revogadas",
  "platform.user.deleted": "Usuário excluído",
  "platform.user.deleted_preserving_history": "Usuário excluído (histórico preservado)",
  "platform.admin.added": "Admin adicionado",
  "platform.admin.removed": "Admin removido",
  "platform.first_access_link.generated": "Link de acesso gerado",
  "platform.first_access_link.regenerated": "Link de acesso regenerado",
  "platform.sensitive_file.accessed": "Arquivo sensível acessado",
  "platform.support.started": "Suporte assistido iniciado",
  "platform.support.ended": "Suporte assistido encerrado",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

type ActionTone = "default" | "primary" | "info" | "violet" | "destructive";

export function actionTone(action: string): ActionTone {
  if (action.startsWith("platform.support")) return "primary";
  if (action.startsWith("platform.academy")) return "info";
  if (action.startsWith("platform.admin")) return "violet";
  if (action.includes("deleted") || action.includes("banned")) return "destructive";
  return "default";
}

const TONE_DOT: Record<ActionTone, string> = {
  default: "bg-muted-foreground/40",
  primary: "bg-primary",
  info: "bg-blue-500",
  violet: "bg-violet-500",
  destructive: "bg-destructive",
};

export function ActionDot({ action }: { action: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("mt-1.5 size-2 shrink-0 rounded-full", TONE_DOT[actionTone(action)])}
    />
  );
}

const TONE_CODE: Record<ActionTone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  info: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  destructive: "bg-destructive/10 text-destructive",
};

export function ActionTag({ action }: { action: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-md px-1.5 py-0.5 font-mono text-[0.65rem] font-medium",
        TONE_CODE[actionTone(action)],
      )}
    >
      {action.replace("platform.", "")}
    </span>
  );
}

// --- Stat card ------------------------------------------------------------

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: IconType;
  label: string;
  value: ReactNode;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-xl bg-muted text-foreground/70">
          <Icon className="size-[1.05rem]" />
        </span>
        {hint ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-[1.9rem] font-bold leading-none tabular-nums">
        {loading ? <span className="text-muted-foreground">—</span> : value}
      </p>
      <p className="mt-1.5 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export const STAT_ICONS = {
  academies: Building02Icon,
  users: UserMultipleIcon,
  admins: ManagerIcon,
  audit: SecurityCheckIcon,
} as const;

// --- Search input ---------------------------------------------------------

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative max-w-md">
      <Search01Icon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl pl-9"
      />
    </div>
  );
}

// --- Academy avatar -------------------------------------------------------

export function AcademyAvatar({
  name,
  logo,
  className,
}: {
  name: string;
  logo?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-9 rounded-xl", className)}>
      <AvatarImage src={logo ?? undefined} />
      <AvatarFallback className="rounded-xl bg-muted text-xs font-semibold text-foreground/70">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

// --- Provision academy dialog --------------------------------------------

export function ProvisionAcademyDialog({ trigger }: { trigger?: ReactNode }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ academyName: "", ownerEmail: "", ownerName: "" });
  const provision = useMutation({
    mutationFn: (input: ProvisionPlatformAcademyInput) => provisionPlatformAcademy(input),
    onSuccess: async () => {
      setForm({ academyName: "", ownerEmail: "", ownerName: "" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["platform", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["platform", "academies"] }),
      ]);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button onClick={() => provision.reset()}>
            <PlusSignIcon className="size-4" />
            Provisionar academia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Provisionar academia</DialogTitle>
          <DialogDescription>
            Crie uma academia para um e-mail existente ou uma conta reservada com link de primeiro
            acesso.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            provision.mutate({
              academyName: form.academyName,
              ownerEmail: form.ownerEmail,
              ...(form.ownerName ? { ownerName: form.ownerName } : {}),
            });
          }}
        >
          <Input
            required
            placeholder="Nome da academia"
            value={form.academyName}
            onChange={(event) => setForm((c) => ({ ...c, academyName: event.target.value }))}
          />
          <Input
            required
            type="email"
            placeholder="E-mail do dono"
            value={form.ownerEmail}
            onChange={(event) => setForm((c) => ({ ...c, ownerEmail: event.target.value }))}
          />
          <Input
            placeholder="Nome do dono (opcional)"
            value={form.ownerName}
            onChange={(event) => setForm((c) => ({ ...c, ownerName: event.target.value }))}
          />
          {provision.data?.firstAccessLink ? (
            <div className="rounded-xl border bg-muted/40 p-3 text-sm">
              <p className="font-medium">Link de primeiro acesso</p>
              <p className="mt-1 break-all text-muted-foreground">
                {provision.data.firstAccessLink}
              </p>
            </div>
          ) : null}
          {provision.data && !provision.data.firstAccessLink ? (
            <p className="text-muted-foreground text-sm">
              Academia provisionada para uma conta existente.
            </p>
          ) : null}
          {provision.isError ? (
            <p className="text-destructive text-sm">Não foi possível provisionar a academia.</p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={provision.isPending}>
              {provision.isPending ? "Criando..." : "Provisionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
