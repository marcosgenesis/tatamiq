import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { authClient } from "../../lib/auth-client";

export function StudentCheckInPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const redirect = `/student/check-in?token=${encodeURIComponent(token)}`;

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/student/attendances/qr", {
        body: { token },
      });
      if (error) throw new Error("Não foi possível confirmar presença com este QR Code.");
      return data;
    },
  });

  useEffect(() => {
    if (!session.data || !token || mutation.isPending || mutation.isSuccess || mutation.isError) {
      return;
    }
    mutation.mutate();
  }, [session.data, token, mutation]);

  if (!token) {
    return (
      <CheckInShell
        title="QR Code inválido"
        description="Abra novamente o QR Code exibido pelo instrutor."
      />
    );
  }

  if (!session.data) {
    return (
      <CheckInShell
        title="Entre para confirmar presença"
        description="Use sua conta com Acesso do Aluno para registrar presença nesta aula."
      >
        <Button onClick={() => void navigate({ to: "/sign-in", search: { redirect } })}>
          Entrar
        </Button>
      </CheckInShell>
    );
  }

  if (mutation.isPending || mutation.isIdle) {
    return (
      <CheckInShell title="Confirmando presença..." description="Validando QR Code da aula." />
    );
  }

  if (mutation.isError || !mutation.data) {
    return (
      <CheckInShell
        title="Presença não registrada"
        description="Este QR Code pode estar expirado, fechado ou sua conta pode não ter acesso de aluno ativo."
      >
        <Link className="text-sm text-primary hover:underline" to="/student">
          Voltar para área do aluno
        </Link>
      </CheckInShell>
    );
  }

  return (
    <CheckInShell
      title="Presença confirmada"
      description={`${mutation.data.attendance.studentName} · ${mutation.data.classSession.classGroupName}`}
    >
      <p className="text-sm text-muted-foreground">
        Registrada por QR Code às {formatTime(mutation.data.attendance.createdAt)}.
      </p>
      {mutation.data.attendance.isOutOfGroup ? (
        <p className="rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Esta presença foi registrada fora das suas turmas vinculadas.
        </p>
      ) : null}
      <Button type="button" onClick={() => void navigate({ to: "/student" })}>
        Ir para área do aluno
      </Button>
    </CheckInShell>
  );
}

function CheckInShell(props: { title: string; description: string; children?: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{props.description}</p>
          {props.children}
        </CardContent>
      </Card>
    </main>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(new Date(value));
}
