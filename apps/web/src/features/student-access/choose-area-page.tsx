import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { authClient } from "../../lib/auth-client";
import {
  activatePlatformSupport,
  clearPendingPlatformSupportActivation,
  platformMeQuery,
  readPendingPlatformSupportActivation,
} from "../platform/platform-queries";

export function ChooseAreaPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const [pendingSupportActivationId, setPendingSupportActivationId] = useState(() =>
    readPendingPlatformSupportActivation(),
  );
  const [supportActivationAttempt, setSupportActivationAttempt] = useState(0);
  const [supportActivationError, setSupportActivationError] = useState(false);
  const organizations = authClient.useListOrganizations();
  const studentQuery = useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/student/me");
      if (error) throw new Error("Sem acesso de aluno.");
      return data;
    },
    retry: false,
  });
  const platformQuery = useQuery({
    ...platformMeQuery(),
    enabled: !!session.data?.user.id && !pendingSupportActivationId,
  });

  const isLoadingAreas =
    organizations.isPending || studentQuery.isLoading || platformQuery.isLoading;
  const hasInstructor = (organizations.data?.length ?? 0) > 0;
  const hasStudent = !!studentQuery.data;
  const hasPlatform = platformQuery.isSuccess && !!platformQuery.data;
  const availableAreaCount = [hasPlatform, hasInstructor, hasStudent].filter(Boolean).length;

  useEffect(() => {
    if (!pendingSupportActivationId || session.isPending || supportActivationError) return;

    let cancelled = false;
    void activatePlatformSupport(pendingSupportActivationId)
      .then(() => {
        clearPendingPlatformSupportActivation();
        if (!cancelled) setPendingSupportActivationId(null);
      })
      .catch(() => {
        if (cancelled) return;
        if (supportActivationAttempt >= 10) {
          setSupportActivationError(true);
          return;
        }
        window.setTimeout(
          () => {
            if (!cancelled) setSupportActivationAttempt((attempt) => attempt + 1);
          },
          Math.min(250 * 2 ** supportActivationAttempt, 2_000),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [
    pendingSupportActivationId,
    session.isPending,
    supportActivationAttempt,
    supportActivationError,
  ]);

  useEffect(() => {
    if (pendingSupportActivationId || isLoadingAreas) return;
    if (availableAreaCount > 1) return;
    if (hasPlatform) void navigate({ to: "/platform" });
    else if (hasInstructor) void navigate({ to: "/" });
    else if (hasStudent) void navigate({ to: "/student" });
    else void navigate({ to: "/onboarding/academy" });
  }, [
    pendingSupportActivationId,
    isLoadingAreas,
    availableAreaCount,
    hasPlatform,
    hasInstructor,
    hasStudent,
    navigate,
  ]);

  if (pendingSupportActivationId) {
    return (
      <ChooseAreaLoading
        message={
          supportActivationError
            ? "Não foi possível ativar o Suporte Assistido. Atualize a página para tentar novamente."
            : "Ativando Suporte Assistido..."
        }
      />
    );
  }

  if (isLoadingAreas || availableAreaCount <= 1) {
    return <ChooseAreaLoading />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Escolha sua área</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione como você quer acessar o Tatamiq agora.
          </p>
          {hasPlatform ? (
            <Button className="w-full" onClick={() => (window.location.href = "/platform")}>
              Administração da Plataforma
            </Button>
          ) : null}
          {hasInstructor ? (
            <Button
              className="w-full"
              variant={hasPlatform ? "secondary" : "default"}
              onClick={() => (window.location.href = "/")}
            >
              Área do instrutor
            </Button>
          ) : null}
          {hasStudent ? (
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => (window.location.href = "/student")}
            >
              Área do aluno
            </Button>
          ) : null}
          <button
            type="button"
            className="block w-full text-center text-sm text-primary hover:underline"
            onClick={async () => {
              await authClient.signOut();
              await navigate({ to: "/sign-in" });
            }}
          >
            Trocar conta
          </button>
        </CardContent>
      </Card>
    </main>
  );
}

function ChooseAreaLoading({ message = "Carregando..." }: { message?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
