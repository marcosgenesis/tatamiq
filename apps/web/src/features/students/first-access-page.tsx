import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { AuthLayout } from "../auth/auth-layout";

export function FirstAccessPage(props: { token: string }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const previewQuery = useQuery({
    queryKey: ["first-access", props.token],
    queryFn: async () => {
      const { data, error } = await api.GET("/student/first-access/{token}", {
        params: { path: { token: props.token } },
      });
      if (error) throw new Error("Não foi possível carregar.");
      return data;
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const body: {
        password?: string;
        termsAccepted: true;
        termsVersion: "student-access-v1";
      } = {
        termsAccepted: true,
        termsVersion: "student-access-v1",
      };
      if (!preview?.hasPassword) {
        body.password = password;
      }
      const { error } = await api.POST("/student/first-access/{token}/complete", {
        params: { path: { token: props.token } },
        body,
      });
      if (error) throw new Error("Não foi possível completar o acesso.");
    },
    onSuccess: () => {
      navigate({ to: "/sign-in" });
    },
  });

  const preview = previewQuery.data;
  const valid = preview?.status === "valid";
  const needsPassword = valid && !preview?.hasPassword;
  const passwordsMatch = password === passwordConfirm;
  const passwordValid = password.length >= 8;

  const canSubmit =
    acceptedTerms &&
    (needsPassword ? passwordValid && passwordsMatch : true) &&
    !completeMutation.isPending;

  return (
    <AuthLayout>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Primeiro acesso</h1>
        <p className="text-sm text-muted-foreground">Configure seu acesso ao Tatamiq.</p>
      </div>

      <div className="mt-6 space-y-4 rounded-3xl border border-border bg-card/70 p-5">
        {previewQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : null}
        {previewQuery.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar este link.</p>
        ) : null}

        {preview?.status === "invalid" ? (
          <p className="text-sm text-destructive">
            Este link de primeiro acesso não é válido. Entre em contato com o instrutor.
          </p>
        ) : null}

        {preview?.status === "expired" ? (
          <p className="text-sm text-destructive">
            Este link expirou. Entre em contato com o instrutor para receber um novo link.
          </p>
        ) : null}

        {preview?.status === "consumed" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Este link já foi utilizado. Você já pode acessar o portal.
            </p>
            <Link
              className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
              to="/sign-in"
            >
              Ir para login
            </Link>
          </div>
        ) : null}

        {valid ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Academia</p>
              <strong>{preview.academyName ?? "—"}</strong>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aluno</p>
              <strong>{preview.studentName ?? "—"}</strong>
            </div>
          </>
        ) : null}
      </div>

      {valid ? (
        <div className="mt-6 space-y-4">
          {needsPassword ? (
            <>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Criar senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password-confirm" className="text-sm font-medium">
                  Confirmar senha
                </label>
                <input
                  id="password-confirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Repita a senha"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {passwordConfirm && !passwordsMatch ? (
                  <p className="text-xs text-destructive">As senhas não coincidem.</p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sua conta já possui senha. Aceite os termos para ativar o acesso.
            </p>
          )}

          <label className="flex gap-3 rounded-3xl border border-border p-4 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
            />
            <span>
              Aceito o termo student-access-v1 para consultar meus dados, confirmar presença por QR
              e enviar informações à academia.
            </span>
          </label>

          {completeMutation.isError ? (
            <p className="text-sm text-destructive">
              Não foi possível completar o acesso. Tente novamente.
            </p>
          ) : null}

          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={() => completeMutation.mutate()}
          >
            {completeMutation.isPending
              ? "Ativando..."
              : needsPassword
                ? "Definir senha e acessar"
                : "Ativar acesso"}
          </Button>
        </div>
      ) : null}
    </AuthLayout>
  );
}
