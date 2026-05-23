import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { createAcademySlug } from "../../lib/academy-slug";
import { authClient } from "../../lib/auth-client";
import { AuthLayout } from "./auth-layout";

const inputClass =
  "h-12 w-full rounded-2xl border border-input bg-background/70 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15";

function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </p>
  );
}

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = new URLSearchParams(window.location.search).get("redirect") ?? "/choose-area";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await authClient.signIn.email({ email, password });
    setIsSubmitting(false);

    if (result.error) {
      setError("Não foi possível entrar. Confira seus dados e tente novamente.");
      return;
    }

    await navigate({ to: redirectTo });
  }

  return (
    <AuthLayout>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar no Tatamiq</h1>
        <p className="text-sm text-muted-foreground">Acesse sua área de instrutor.</p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <AuthError message={error} />
        <label className="block space-y-2 text-sm font-medium">
          <span>Email</span>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>Senha</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
        <Link to="/forgot-password" className="text-primary hover:underline">
          Esqueci minha senha
        </Link>
        <p>
          Ainda não tem conta?{" "}
          <Link to="/sign-up" className="text-primary hover:underline">
            Criar sua conta
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export function SignUpPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get("redirect") ?? "/onboarding/academy";
  const [name, setName] = useState(params.get("name") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await authClient.signUp.email({ name, email, password });
    setIsSubmitting(false);

    if (result.error) {
      setError("Não foi possível criar a conta. Tente entrar ou recuperar sua senha.");
      return;
    }

    await navigate({ to: redirectTo });
  }

  return (
    <AuthLayout>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Criar sua conta</h1>
        <p className="text-sm text-muted-foreground">
          Comece com seu login de Dono/Instrutor Solo.
        </p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <AuthError message={error} />
        <label className="block space-y-2 text-sm font-medium">
          <span>Nome</span>
          <input
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>Email</span>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>Senha</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar conta"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link to="/sign-in" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);

    if (result.error) {
      setError("Não foi possível iniciar a recuperação. Tente novamente.");
      return;
    }

    setSent(true);
  }

  return (
    <AuthLayout>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">
          Enviaremos um link para definir uma nova senha.
        </p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <AuthError message={error} />
        {sent && (
          <p className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            Se o email existir, o link de recuperação será enviado.
          </p>
        )}
        <label className="block space-y-2 text-sm font-medium">
          <span>Email</span>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar link"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Lembrou a senha?{" "}
        <Link to="/sign-in" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(token ? null : "Link de recuperação inválido.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await authClient.resetPassword({ token, newPassword: password });
    setIsSubmitting(false);

    if (result.error) {
      setError("Não foi possível definir a nova senha. Solicite um novo link.");
      return;
    }

    await navigate({ to: "/sign-in" });
  }

  return (
    <AuthLayout>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Definir nova senha</h1>
        <p className="text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <AuthError message={error} />
        <label className="block space-y-2 text-sm font-medium">
          <span>Nova senha</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={!token}
          />
        </label>
        <Button className="w-full" type="submit" disabled={isSubmitting || !token}>
          {isSubmitting ? "Salvando..." : "Definir senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}

export function AcademyOnboardingPage() {
  const navigate = useNavigate();
  const [academyName, setAcademyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await authClient.organization.create({
      name: academyName,
      slug: createAcademySlug(academyName),
    });

    if (result.error || !result.data) {
      setIsSubmitting(false);
      setError("Não foi possível criar sua academia. Tente novamente.");
      return;
    }

    const activeResult = await authClient.organization.setActive({
      organizationId: result.data.id,
    });
    setIsSubmitting(false);

    if (activeResult.error) {
      setError("Academia criada, mas não foi possível ativá-la. Tente entrar novamente.");
      return;
    }

    await navigate({ to: "/" });
  }

  return (
    <AuthLayout>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Crie sua academia</h1>
        <p className="text-sm text-muted-foreground">
          Informe o nome do tatame que você vai organizar no Tatamiq.
        </p>
      </div>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <AuthError message={error} />
        <label className="block space-y-2 text-sm font-medium">
          <span>Nome da academia</span>
          <input
            className={inputClass}
            value={academyName}
            onChange={(event) => setAcademyName(event.target.value)}
            required
          />
        </label>
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Começar a organizar minha academia"}
        </Button>
      </form>
    </AuthLayout>
  );
}
