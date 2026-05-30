import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { AuthLayout } from "../auth/auth-layout";

export function PlatformFirstAccessPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const preview = useQuery({
    queryKey: ["platform", "first-access", token],
    queryFn: async () => {
      const { data, error } = await api.GET("/platform/first-access/{token}", {
        params: { path: { token } },
      });
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  const complete = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/platform/first-access/{token}/complete", {
        params: { path: { token } },
        body: { password },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => navigate({ to: "/sign-in" }),
  });

  const data = preview.data;
  const valid = data?.status === "valid";
  const passwordsMatch = password === passwordConfirm;
  const passwordValid = password.length >= 8;

  return (
    <AuthLayout>
      <div className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">Primeiro acesso</h1>
        <p className="text-muted-foreground text-sm">Crie sua senha para acessar o Tatamiq.</p>
      </div>

      <div className="mt-6 space-y-4 rounded-3xl border border-border bg-card/70 p-5">
        {preview.isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : null}
        {preview.isError || data?.status === "invalid" ? (
          <p className="text-destructive text-sm">Este link de primeiro acesso não é válido.</p>
        ) : null}
        {data?.status === "expired" ? (
          <p className="text-destructive text-sm">Este link expirou. Solicite um novo link.</p>
        ) : null}
        {valid ? (
          <>
            <div>
              <p className="text-muted-foreground text-sm">Nome</p>
              <strong>{data.name ?? "—"}</strong>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Email</p>
              <strong>{data.email ?? "—"}</strong>
            </div>
          </>
        ) : null}
      </div>

      {valid ? (
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="font-medium text-sm">
              Criar senha
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password-confirm" className="font-medium text-sm">
              Confirmar senha
            </label>
            <Input
              id="password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="Repita a senha"
            />
            {passwordConfirm && !passwordsMatch ? (
              <p className="text-destructive text-xs">As senhas não coincidem.</p>
            ) : null}
          </div>

          {complete.isError ? (
            <p className="text-destructive text-sm">Não foi possível ativar o acesso.</p>
          ) : null}

          <Button
            className="w-full"
            disabled={!passwordValid || !passwordsMatch || complete.isPending}
            onClick={() => complete.mutate()}
          >
            {complete.isPending ? "Ativando..." : "Definir senha e acessar"}
          </Button>
        </div>
      ) : (
        <Link className="mt-6 block text-center text-primary text-sm hover:underline" to="/sign-in">
          Ir para login
        </Link>
      )}
    </AuthLayout>
  );
}
