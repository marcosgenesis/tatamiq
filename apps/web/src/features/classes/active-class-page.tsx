import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useIsMobile } from "../../hooks/use-mobile";
import { academyQueryKey } from "../../lib/academy-query-keys";
import { ActiveClassMobile } from "./active-class-mobile";
import { ClassCountdown, formatTime, QrRefreshCountdown } from "./active-class-widgets";
import { AttendanceList } from "./attendance-list";

export function ActiveClassPage(props: { classId: string }) {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const classQuery = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "classes", props.classId),
    queryFn: async () => {
      const { data, error } = await api.GET("/classes/{id}", {
        params: { path: { id: props.classId } },
      });
      if (error) throw new Error("Não foi possível carregar a aula.");
      return data;
    },
    enabled: !!activeAcademyId,
  });

  const qrQuery = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "classes", props.classId, "qr-token"),
    queryFn: async () => {
      const { data, error } = await api.GET("/classes/{id}/qr-token", {
        params: { path: { id: props.classId } },
      });
      if (error) throw new Error("Não foi possível obter o QR token.");
      return data;
    },
    enabled: !!activeAcademyId && classQuery.data?.status === "active",
    refetchInterval: 10_000,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/classes/{id}/start-ad-hoc", {
        params: { path: { id: props.classId } },
      });
      if (error) throw new Error("Não foi possível iniciar a aula avulsa.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "classes"),
      });
      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "schedule"),
      });
      await classQuery.refetch();
      await qrQuery.refetch();
    },
  });

  const endMutation = useMutation({
    mutationFn: async () => {
      const { error } = await api.POST("/classes/{id}/end", {
        params: { path: { id: props.classId } },
      });
      if (error) throw new Error("Não foi possível encerrar a aula.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "classes"),
      });
      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "schedule"),
      });
      await classQuery.refetch();
      await qrQuery.refetch();
    },
  });

  const classSession = classQuery.data;
  const qrToken = qrQuery.data;
  const isScheduled = classSession?.status === "scheduled";
  const isActive = classSession?.status === "active";
  const isEnded = classSession?.status === "ended";
  const canStartFromPage = isScheduled && classSession?.kind === "ad_hoc";
  const qrUrl = qrToken
    ? `${window.location.origin}/student/check-in?token=${encodeURIComponent(qrToken.token)}`
    : null;

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

  if (isMobile) {
    return (
      <ActiveClassMobile
        classId={props.classId}
        classSession={classSession}
        qrToken={qrToken}
        qrUrl={qrUrl}
        isActive={isActive}
        isEnded={isEnded}
        canStart={canStartFromPage}
        isStarting={startMutation.isPending}
        isEnding={endMutation.isPending}
        onStart={() => startMutation.mutate()}
        onEnd={() => endMutation.mutate()}
        onBack={() => void navigate({ to: "/schedule" })}
        onQrExpired={qrQuery.refetch}
      />
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
                data-qr-url={qrUrl ?? undefined}
                role="img"
                aria-label="QR Code da aula ativa"
              >
                <QRCodeSVG value={qrUrl ?? ""} size={256} level="M" />
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

      {canStartFromPage ? (
        <div className="flex justify-end">
          <Button disabled={startMutation.isPending} onClick={() => startMutation.mutate()}>
            {startMutation.isPending ? "Iniciando..." : "Iniciar aula"}
          </Button>
        </div>
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
