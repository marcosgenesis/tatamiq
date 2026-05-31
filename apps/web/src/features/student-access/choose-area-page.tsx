import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { authClient } from "../../lib/auth-client";
import { platformMeQuery } from "../platform/platform-queries";

export function ChooseAreaPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
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
  const platformQuery = useQuery({ ...platformMeQuery(), enabled: !!session.data?.user.id });

  const hasInstructor = (organizations.data?.length ?? 0) > 0;
  const hasStudent = !!studentQuery.data;
  const hasPlatform = platformQuery.isSuccess && !!platformQuery.data;

  useEffect(() => {
    if (organizations.isPending || studentQuery.isLoading || platformQuery.isLoading) return;
    if (hasPlatform) void navigate({ to: "/platform" });
    else if (hasInstructor) void navigate({ to: "/" });
    else if (hasStudent) void navigate({ to: "/student" });
  }, [
    hasPlatform,
    hasInstructor,
    hasStudent,
    organizations.isPending,
    studentQuery.isLoading,
    platformQuery.isLoading,
    navigate,
  ]);

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
          {!organizations.isPending &&
          !studentQuery.isLoading &&
          !platformQuery.isLoading &&
          !hasPlatform &&
          !hasInstructor &&
          !hasStudent ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Esta conta ainda não tem academia nem acesso de aluno.
              </p>
              <Button
                className="w-full"
                onClick={() => (window.location.href = "/onboarding/academy")}
              >
                Criar academia
              </Button>
            </div>
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
