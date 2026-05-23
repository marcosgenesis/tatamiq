import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { authClient } from "../../lib/auth-client";
import { AuthLayout } from "../auth/auth-layout";

export function AcceptStudentInvitePage(props: { token: string }) {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const previewQuery = useQuery({
    queryKey: ["student-invite", props.token],
    queryFn: async () => {
      const { data, error } = await api.GET("/student-invites/{token}", {
        params: { path: { token: props.token } },
      });
      if (error) throw new Error("Não foi possível carregar o convite.");
      return data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.POST("/student-invites/{token}/accept", {
        params: { path: { token: props.token } },
        body: { termsAccepted: true, termsVersion: "student-access-v1" },
      });
      if (error) throw new Error("Não foi possível aceitar o convite.");
    },
    onSuccess: async () => navigate({ to: "/choose-area" }),
  });

  const preview = previewQuery.data;
  const valid = preview?.status === "valid";
  const redirect = `/accept-student-invite/${props.token}`;

  return (
    <AuthLayout>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Convite do aluno</h1>
        <p className="text-sm text-muted-foreground">Ative seu acesso ao Tatamiq.</p>
      </div>

      <div className="mt-6 space-y-4 rounded-3xl border border-border bg-card/70 p-5">
        {previewQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando convite...</p>
        ) : null}
        {previewQuery.isError ? (
          <p className="text-sm text-destructive">Convite indisponível.</p>
        ) : null}
        {preview ? (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Academia</p>
              <strong>{preview.academyName ?? "—"}</strong>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aluno</p>
              <strong>{preview.studentName ?? "—"}</strong>
            </div>
            {!valid ? (
              <p className="text-sm text-destructive">Este convite não está mais disponível.</p>
            ) : null}
          </>
        ) : null}
      </div>

      {valid && !session.data ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Entre ou crie uma conta para aceitar o convite.
          </p>
          <Link
            className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
            to="/sign-in"
            search={{ redirect }}
          >
            Entrar
          </Link>
          <Link
            className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-secondary px-2.5 text-sm font-medium text-secondary-foreground"
            to="/sign-up"
            search={{ redirect, name: preview?.studentName ?? "" }}
          >
            Criar conta
          </Link>
        </div>
      ) : null}

      {valid && session.data ? (
        <div className="mt-6 space-y-4">
          <label className="flex gap-3 rounded-3xl border border-border p-4 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => setAcceptedTerms(event.target.checked)}
            />
            <span>
              Aceito o termo student-access-v1 para consultar meus dados, confirmar presença por QR
              e enviar informações à academia.
            </span>
          </label>
          {acceptMutation.isError ? (
            <p className="text-sm text-destructive">Não foi possível aceitar este convite.</p>
          ) : null}
          <Button
            className="w-full"
            disabled={!acceptedTerms || acceptMutation.isPending}
            onClick={() => acceptMutation.mutate()}
          >
            {acceptMutation.isPending ? "Ativando..." : "Aceitar convite"}
          </Button>
        </div>
      ) : null}
    </AuthLayout>
  );
}
