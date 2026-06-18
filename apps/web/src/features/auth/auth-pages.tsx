import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { AtIcon, LockIcon, UserIcon } from "hugeicons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { authClient } from "@/lib/auth-client";
import { AuthLayout } from "./auth-layout";

function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
      <div className="flex flex-col space-y-1">
        <h1 className="font-bold text-2xl tracking-wide">Entrar no Tatamiq</h1>
        <p className="text-base text-muted-foreground">Acesse sua área de instrutor.</p>
      </div>
      <form className="space-y-2" onSubmit={submit}>
        <AuthError message={error} />
        <InputGroup>
          <InputGroupInput
            aria-label="Email"
            placeholder="seu@email.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <InputGroupAddon align="inline-start">
            <AtIcon />
          </InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupInput
            aria-label="Senha"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <InputGroupAddon align="inline-start">
            <LockIcon />
          </InputGroupAddon>
        </InputGroup>
        <Button className="w-full" size="sm" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
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

export async function createPublicAccount(input: {
  name: string;
  email: string;
  password: string;
  signOut: () => Promise<unknown>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ error?: unknown }>;
  clearSessionCache: () => void;
}) {
  await input.signOut().catch(() => undefined);
  input.clearSessionCache();
  const result = await input.signUp({
    name: input.name,
    email: input.email,
    password: input.password,
  });
  input.clearSessionCache();
  return result;
}

export function SignUpPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
    const result = await createPublicAccount({
      name,
      email,
      password,
      signOut: () => authClient.signOut(),
      signUp: (input) => authClient.signUp.email(input),
      clearSessionCache: () => queryClient.clear(),
    });
    setIsSubmitting(false);

    if (result.error) {
      setError("Não foi possível criar a conta. Tente entrar ou recuperar sua senha.");
      return;
    }

    await navigate({ to: redirectTo });
  }

  return (
    <AuthLayout>
      <div className="flex flex-col space-y-1">
        <h1 className="font-bold text-2xl tracking-wide">Criar sua conta</h1>
        <p className="text-base text-muted-foreground">
          Comece com seu login de Dono/Instrutor Solo.
        </p>
      </div>
      <form className="space-y-2" onSubmit={submit}>
        <AuthError message={error} />
        <InputGroup>
          <InputGroupInput
            aria-label="Nome"
            placeholder="Seu nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <InputGroupAddon align="inline-start">
            <UserIcon />
          </InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupInput
            aria-label="Email"
            placeholder="seu@email.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <InputGroupAddon align="inline-start">
            <AtIcon />
          </InputGroupAddon>
        </InputGroup>
        <InputGroup>
          <InputGroupInput
            aria-label="Senha"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <InputGroupAddon align="inline-start">
            <LockIcon />
          </InputGroupAddon>
        </InputGroup>
        <Button className="w-full" size="sm" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando..." : "Criar conta"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
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
      <div className="flex flex-col space-y-1">
        <h1 className="font-bold text-2xl tracking-wide">Recuperar senha</h1>
        <p className="text-base text-muted-foreground">
          Enviaremos um link para definir uma nova senha.
        </p>
      </div>
      <form className="space-y-2" onSubmit={submit}>
        <AuthError message={error} />
        {sent && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            Se o email existir, o link de recuperação será enviado.
          </p>
        )}
        <InputGroup>
          <InputGroupInput
            aria-label="Email"
            placeholder="seu@email.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <InputGroupAddon align="inline-start">
            <AtIcon />
          </InputGroupAddon>
        </InputGroup>
        <Button className="w-full" size="sm" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar link"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
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
      <div className="flex flex-col space-y-1">
        <h1 className="font-bold text-2xl tracking-wide">Definir nova senha</h1>
        <p className="text-base text-muted-foreground">Escolha uma nova senha para sua conta.</p>
      </div>
      <form className="space-y-2" onSubmit={submit}>
        <AuthError message={error} />
        <InputGroup>
          <InputGroupInput
            aria-label="Nova senha"
            placeholder="Nova senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={!token}
          />
          <InputGroupAddon align="inline-start">
            <LockIcon />
          </InputGroupAddon>
        </InputGroup>
        <Button className="w-full" size="sm" type="submit" disabled={isSubmitting || !token}>
          {isSubmitting ? "Salvando..." : "Definir senha"}
        </Button>
      </form>
    </AuthLayout>
  );
}
