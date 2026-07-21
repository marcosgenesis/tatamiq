import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { StudentGraduationResponse, StudentMeResponse } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import {
  ArrowRight01Icon,
  ChampionIcon,
  Logout01Icon,
  Notification01Icon,
  Settings01Icon,
} from "hugeicons-react";
import { type ComponentType, type FormEvent, useEffect, useState } from "react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { authClient } from "../../lib/auth-client";
import { studentQueryKey } from "../../lib/session-query-keys";
import { getInitials } from "../student-access/student-mobile-shell";
import { BeltVisual } from "./components/belt-visual";
import { beltProgress } from "./lib/belt-progress";
import { toGraduationInput } from "./lib/graduation-response";

type UpdateStudentProfileInput = components["schemas"]["UpdateStudentProfileDto"];

export function StudentProfileSection() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: studentQueryKey(sessionUserId, "me"),
    queryFn: async () => {
      const { data, error: err } = await api.GET("/student/me");
      if (err || !data) throw new Error("Erro ao carregar perfil.");
      return data satisfies StudentMeResponse;
    },
    enabled: !!sessionUserId,
  });
  const graduationQuery = useQuery({
    queryKey: studentQueryKey(sessionUserId, "graduation"),
    queryFn: async () => {
      const { data, error: err } = await api.GET("/student/graduation");
      if (err || !data) throw new Error("graduation");
      return data satisfies StudentGraduationResponse;
    },
    enabled: !!sessionUserId,
  });

  useEffect(() => {
    if (meQuery.data) {
      setPhone(meQuery.data.student.phone ?? "");
      setEmail(meQuery.data.student.email ?? "");
    }
  }, [meQuery.data]);

  const mutation = useMutation({
    mutationFn: async (body: UpdateStudentProfileInput) => {
      const { error: err } = await api.PATCH("/student/profile", { body });
      if (err) throw new Error("Não foi possível salvar.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: studentQueryKey(sessionUserId, "me") });
      setSuccess("Perfil atualizado com sucesso.");
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    const body = {
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
    } satisfies UpdateStudentProfileInput;
    mutation.mutate(body);
  }

  async function handleSignOut() {
    await authClient.signOut();
    queryClient.clear();
    window.location.href = "/sign-in";
  }

  if (meQuery.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const student = meQuery.data?.student;
  const academy = meQuery.data?.academy;
  const readOnly = Boolean(student?.readOnly);
  const belt = graduationQuery.data ? beltProgress(toGraduationInput(graduationQuery.data)) : null;
  const isActive = student?.status === "active";

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-[1.55rem] font-bold tracking-tight">Perfil</h1>
      </header>

      <section className="flex flex-col items-center gap-3.5 rounded-2xl border border-border bg-card px-6 py-7 text-center shadow-sm">
        <span className="grid size-20 place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground ring-4 ring-primary/10">
          {getInitials(student?.name ?? "Aluno")}
        </span>
        <div>
          <p className="text-xl font-bold tracking-tight">{student?.name}</p>
          {academy ? (
            <p className="text-sm font-medium text-muted-foreground">{academy.name}</p>
          ) : null}
        </div>
        {belt ? (
          <span className="flex items-center gap-2.5 rounded-full bg-muted px-3.5 py-1.5">
            <BeltVisual beltKey={belt.beltKey} degrees={belt.degree} size="swatch" />
            <span className="text-[0.8rem] font-bold">
              Faixa {belt.beltName} · {belt.degree} {belt.degree === 1 ? "grau" : "graus"}
            </span>
          </span>
        ) : null}
        <Badge variant={isActive ? "success" : "muted"}>
          {isActive ? "Aluno ativo" : "Aluno inativo"}
        </Badge>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-[0.95rem] font-bold tracking-tight">
          Dados de contato
        </h2>
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-[1.1rem]"
        >
          <Field id="student-phone" label="Telefone">
            <Input
              id="student-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              disabled={readOnly}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </Field>
          <Field id="student-email" label="E-mail">
            <Input
              id="student-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              disabled={readOnly}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aluno@email.com"
            />
          </Field>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

          {!readOnly ? (
            <Button type="submit" disabled={mutation.isPending} className="h-11 w-full">
              {mutation.isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          ) : null}
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-[0.95rem] font-bold tracking-tight">Conta</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <AccountRow icon={Notification01Icon} label="Notificações" onClick={() => {}} />
          <AccountRow
            icon={ChampionIcon}
            label="Minha graduação"
            onClick={() => navigate({ to: "/student/graduation" })}
          />
          <AccountRow icon={Settings01Icon} label="Preferências" onClick={() => {}} />
        </div>
      </section>

      <Button
        type="button"
        variant="destructive"
        className="h-11 w-full"
        onClick={() => void handleSignOut()}
      >
        <Logout01Icon aria-hidden="true" />
        Sair da conta
      </Button>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[0.8rem] font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

function AccountRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-muted/50"
    >
      <span className="grid size-9 place-items-center rounded-xl bg-muted text-foreground/70">
        <Icon className="size-[1.05rem]" aria-hidden="true" />
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <ArrowRight01Icon className="size-4 text-muted-foreground/60" aria-hidden="true" />
    </button>
  );
}
