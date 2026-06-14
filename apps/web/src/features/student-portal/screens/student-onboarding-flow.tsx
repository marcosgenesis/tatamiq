import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { components } from "@tatamiq/contracts/generated";
import { Award01Icon, QrCodeIcon, Wallet01Icon } from "hugeicons-react";
import { type ComponentType, type FormEvent, useMemo, useState } from "react";
import { api } from "../../../api";
import { LogoIcon } from "../../../components/logo";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  browserStorage,
  createOnboardingState,
  type OnboardingStep,
} from "../lib/onboarding-state";

export function StudentOnboardingFlow({
  studentName,
  studentPhone,
  studentEmail,
  onDone,
}: {
  studentName: string;
  studentPhone?: string | undefined;
  studentEmail?: string | undefined;
  onDone: () => void;
}) {
  const navigate = useNavigate();
  const ob = useMemo(() => createOnboardingState(browserStorage()), []);
  const [step, setStep] = useState<OnboardingStep>(() => ob.currentStep());

  function go(next: OnboardingStep) {
    ob.goTo(next);
    setStep(next);
  }

  function finish(then?: () => void) {
    ob.complete();
    onDone();
    then?.();
  }

  if (step === "welcome") {
    return <WelcomeStep onStart={() => go("profile")} onSkip={() => finish()} />;
  }
  if (step === "profile") {
    return (
      <ProfileStep
        name={studentName}
        phone={studentPhone ?? ""}
        email={studentEmail ?? ""}
        onContinue={() => go("checkin")}
        onSkip={() => go("checkin")}
      />
    );
  }
  return (
    <CheckInStep
      onCheckIn={() => finish(() => navigate({ to: "/student/check-in" }))}
      onExplore={() => finish()}
    />
  );
}

function WelcomeStep({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const feats: Array<{ icon: ComponentType<{ className?: string }>; title: string; desc: string }> =
    [
      {
        icon: QrCodeIcon,
        title: "Check-in em 1 toque",
        desc: "Registre presença lendo o QR da aula.",
      },
      {
        icon: Award01Icon,
        title: "Acompanhe sua faixa",
        desc: "Veja graus e o caminho pro próximo.",
      },
      {
        icon: Wallet01Icon,
        title: "Mensalidades em dia",
        desc: "Status e comprovantes sem complicação.",
      },
    ];
  return (
    <Shell dark>
      <div className="flex items-center gap-2.5 pt-2">
        <LogoIcon className="size-9 text-primary" />
        <span className="text-[1.05rem] font-bold">tatamiq</span>
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-[1.85rem] font-bold leading-[1.12] tracking-tight text-balance">
          Bem-vindo à sua área de aluno
        </h1>
        <p className="mt-3.5 text-[0.95rem] font-medium leading-relaxed text-white/60">
          Sua jornada no tatame agora cabe no bolso: aulas, presença, faixa e mensalidades em um só
          lugar.
        </p>
        <ul className="mt-6 space-y-4">
          {feats.map((f) => (
            <li key={f.title} className="flex items-center gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/20">
                <f.icon className="size-[1.3rem] text-primary" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[0.95rem] font-bold">{f.title}</p>
                <p className="text-xs font-medium text-white/50">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Footer>
        <Button className="h-12 w-full text-[0.95rem]" onClick={onStart}>
          Começar
        </Button>
        <Button
          variant="ghost"
          className="h-10 w-full text-white/60 hover:bg-white/5 hover:text-white"
          onClick={onSkip}
        >
          Explorar por conta própria
        </Button>
        <p className="text-center text-[0.7rem] font-medium text-white/40">
          Leva menos de 1 minuto
        </p>
      </Footer>
    </Shell>
  );
}

type UpdateStudentProfileInput = components["schemas"]["UpdateStudentProfileDto"];

function ProfileStep({
  name,
  phone: initialPhone,
  email: initialEmail,
  onContinue,
  onSkip,
}: {
  name: string;
  phone: string;
  email: string;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
      } satisfies UpdateStudentProfileInput;
      await api.PATCH("/student/profile", { body });
    },
    onSettled: onContinue,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Shell>
      <Progress step={1} />
      <div className="mt-6">
        <h1 className="text-[1.5rem] font-bold tracking-tight">Confirme seus dados</h1>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-muted-foreground">
          Usamos isso para avisar sobre aulas e cobranças. Você pode mudar depois no perfil.
        </p>
      </div>
      <form onSubmit={submit} className="mt-6 flex flex-1 flex-col">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-[1.1rem]">
          <div className="space-y-1.5">
            <span className="text-[0.8rem] font-semibold">Nome</span>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/60 px-3.5 py-3">
              <span className="text-sm font-medium text-muted-foreground">{name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-semibold text-muted-foreground">
                do convite
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ob-phone" className="block text-[0.8rem] font-semibold">
              Telefone
            </label>
            <Input
              id="ob-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
            <span className="block text-[0.7rem] font-medium text-muted-foreground">
              Para lembretes de aula e avisos de cobrança.
            </span>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ob-email" className="block text-[0.8rem] font-semibold">
              E-mail
            </label>
            <Input
              id="ob-email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aluno@email.com"
            />
          </div>
        </div>
        <Footer>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-12 w-full text-[0.95rem]"
          >
            {mutation.isPending ? "Salvando..." : "Continuar"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full text-muted-foreground"
            onClick={onSkip}
          >
            Pular por agora
          </Button>
        </Footer>
      </form>
    </Shell>
  );
}

function CheckInStep({ onCheckIn, onExplore }: { onCheckIn: () => void; onExplore: () => void }) {
  const steps = [
    "Toque no botão de check-in",
    "Aponte para o QR da aula",
    "Presença registrada na hora",
  ];
  return (
    <Shell dark>
      <Progress step={2} dark />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="grid size-[8.5rem] place-items-center rounded-3xl bg-white shadow-[0_12px_40px_rgba(255,79,1,0.35)]">
          <QrCodeIcon className="size-20 text-neutral-900" aria-hidden="true" />
        </span>
        <h1 className="mt-7 text-[1.5rem] font-bold tracking-tight text-balance">
          Faça seu primeiro check-in
        </h1>
        <p className="mt-2 max-w-[20rem] text-sm font-medium leading-relaxed text-white/60">
          Na próxima aula, aponte a câmera para o QR Code do professor. É aí que sua presença e
          evolução começam.
        </p>
        <ol className="mt-6 w-full space-y-3.5 rounded-2xl bg-white/5 p-[1.1rem] text-left">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/20 text-[0.8rem] font-bold text-primary">
                {i + 1}
              </span>
              <span className="text-[0.85rem] font-semibold text-white/90">{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <Footer>
        <Button className="h-12 w-full gap-2 text-[0.95rem]" onClick={onCheckIn}>
          <QrCodeIcon aria-hidden="true" />
          Fazer check-in agora
        </Button>
        <Button
          variant="ghost"
          className="h-10 w-full text-white/60 hover:bg-white/5 hover:text-white"
          onClick={onExplore}
        >
          Começar a explorar
        </Button>
      </Footer>
    </Shell>
  );
}

function Shell({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <main
      className={
        dark
          ? "fixed inset-0 z-50 mx-auto flex max-w-screen-sm flex-col bg-neutral-950 px-6 pb-10 pt-[max(env(safe-area-inset-top),1rem)] text-white"
          : "fixed inset-0 z-50 mx-auto flex max-w-screen-sm flex-col bg-background px-6 pb-10 pt-[max(env(safe-area-inset-top),1rem)] text-foreground"
      }
    >
      {children}
    </main>
  );
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex flex-col gap-1.5">{children}</div>;
}

function Progress({ step, dark }: { step: 1 | 2; dark?: boolean }) {
  const track = dark ? "bg-white/15" : "bg-muted";
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex flex-1 gap-1.5">
        <span className="h-[5px] flex-1 rounded-full bg-primary" />
        <span className={`h-[5px] flex-1 rounded-full ${step >= 2 ? "bg-primary" : track}`} />
      </div>
      <span className={`text-xs font-semibold ${dark ? "text-white/60" : "text-muted-foreground"}`}>
        {step} de 2
      </span>
    </div>
  );
}
