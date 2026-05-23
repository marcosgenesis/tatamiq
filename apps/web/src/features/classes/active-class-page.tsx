import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { AttendanceList } from "./attendance-list";

export function ActiveClassPage(props: { classId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const classQuery = useQuery({
    queryKey: ["classes", props.classId],
    queryFn: async () => {
      const { data, error } = await api.GET("/classes/{id}", {
        params: { path: { id: props.classId } },
      });
      if (error) throw new Error("Não foi possível carregar a aula.");
      return data;
    },
  });

  const qrQuery = useQuery({
    queryKey: ["classes", props.classId, "qr-token"],
    queryFn: async () => {
      const { data, error } = await api.GET("/classes/{id}/qr-token", {
        params: { path: { id: props.classId } },
      });
      if (error) throw new Error("Não foi possível obter o QR token.");
      return data;
    },
    enabled: classQuery.data?.status === "active",
    refetchInterval: 10_000,
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.POST("/classes/{id}/end", {
        params: { path: { id: props.classId } },
      });
      if (error) throw new Error("Não foi possível encerrar a aula.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes"] });
      await queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });

  const classSession = classQuery.data;
  const qrToken = qrQuery.data;
  const isActive = classSession?.status === "active";
  const isEnded = classSession?.status === "ended";

  if (classQuery.isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <p className="text-sm text-muted-foreground">Carregando aula...</p>
      </div>
    );
  }

  if (classQuery.isError || !classSession) {
    return (
      <div className="grid place-items-center py-20">
        <p className="text-sm text-destructive">Aula não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
        <div className="flex items-center gap-3">
          <Badge variant={isActive ? "default" : isEnded ? "muted" : "warning"}>
            {isActive ? "Em andamento" : isEnded ? "Encerrada" : classSession.status}
          </Badge>
          <Badge variant="muted">
            {classSession.kind === "recurring" ? "Recorrente" : "Avulsa"}
          </Badge>
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-5xl">
          {classSession.classGroupName}
        </h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Duração: {classSession.durationMinutes}min</span>
          {classSession.actualStartAt ? (
            <span>Início: {formatTime(classSession.actualStartAt)}</span>
          ) : null}
          {classSession.endedAt ? (
            <span>Encerrada: {formatTime(classSession.endedAt)}</span>
          ) : classSession.actualStartAt ? (
            <ClassCountdown
              actualStartAt={classSession.actualStartAt}
              durationMinutes={classSession.durationMinutes}
            />
          ) : null}
        </div>
      </section>

      {isActive && qrToken ? (
        <Card>
          <CardHeader>
            <CardTitle>QR Code da aula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                className="flex justify-center rounded-2xl border border-primary/30 bg-white p-6"
                data-testid="active-class-qr-code"
                role="img"
                aria-label="QR Code da aula ativa"
              >
                <QRCodeSVG
                  value={`${window.location.origin}/student/check-in?token=${encodeURIComponent(qrToken.token)}`}
                  size={256}
                  level="M"
                />
              </div>
              <QrRefreshCountdown expiresAt={qrToken.expiresAt} onExpired={qrQuery.refetch} />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isActive || isEnded ? (
        <AttendanceList
          classSessionId={props.classId}
          isActive={isActive}
          refetchInterval={isActive ? 10_000 : false}
        />
      ) : null}

      {isActive ? (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            disabled={endMutation.isPending}
            onClick={() => endMutation.mutate()}
          >
            {endMutation.isPending ? "Encerrando..." : "Encerrar aula"}
          </Button>
        </div>
      ) : null}

      {isEnded ? (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => void navigate({ to: "/schedule" })}>
            Voltar para agenda
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ClassCountdown(props: { actualStartAt: string; durationMinutes: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const endTime = new Date(props.actualStartAt).getTime() + props.durationMinutes * 60_000;
  const remaining = Math.max(0, endTime - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  if (remaining === 0) {
    return <span className="text-destructive">Tempo excedido</span>;
  }

  return (
    <span>
      Restam {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

function QrRefreshCountdown(props: { expiresAt: string; onExpired: () => void }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expiresMs = new Date(props.expiresAt).getTime();
  const remaining = Math.max(0, expiresMs - now);
  const seconds = Math.ceil(remaining / 1000);

  const onExpired = props.onExpired;
  const refetch = useCallback(() => {
    onExpired();
  }, [onExpired]);

  useEffect(() => {
    if (remaining === 0) refetch();
  }, [remaining, refetch]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(seconds / 30) * 100}%` }}
        />
      </div>
      <span className="tabular-nums">{seconds}s</span>
    </div>
  );
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
