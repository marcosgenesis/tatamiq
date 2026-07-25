import { QRCodeSVG } from "qrcode.react";
import { MobileScreen, StatusPill } from "@/components/mobile/mobile-ui";
import { ClassCountdown, formatTime, QrRefreshCountdown } from "./active-class-widgets";
import { AttendanceList } from "./attendance-list";

type ActiveClass = {
  classGroupName: string;
  durationMinutes: number;
  kind: "recurring" | "ad_hoc";
  status: string;
  actualStartAt: string | null;
  endedAt: string | null;
};

export function ActiveClassMobile(props: {
  classId: string;
  classSession: ActiveClass;
  qrToken: { expiresAt: string } | null | undefined;
  qrUrl: string | null;
  isActive: boolean;
  isEnded: boolean;
  canStart: boolean;
  isStarting: boolean;
  isEnding: boolean;
  onStart: () => void;
  onEnd: () => void;
  onBack: () => void;
  onQrExpired: () => void;
}) {
  const { classSession, isActive, isEnded } = props;

  return (
    <MobileScreen>
      {/* Class hero */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <StatusPill tone={isActive ? "primary" : "neutral"} dot={isActive}>
            {isActive ? "Em andamento" : isEnded ? "Encerrada" : "Agendada"}
          </StatusPill>
          <StatusPill tone="neutral">
            {classSession.kind === "recurring" ? "Recorrente" : "Avulsa"}
          </StatusPill>
        </div>
        <h1 className="text-[24px] font-medium text-m-ink">{classSession.classGroupName}</h1>
        <div className="flex items-center justify-between text-[13px] text-m-ink-2">
          <span>
            {classSession.durationMinutes} min
            {classSession.actualStartAt
              ? ` · início ${formatTime(classSession.actualStartAt)}`
              : ""}
          </span>
          {isActive && classSession.actualStartAt ? (
            <ClassCountdown
              actualStartAt={classSession.actualStartAt}
              durationMinutes={classSession.durationMinutes}
            />
          ) : isEnded && classSession.endedAt ? (
            <span>Encerrada às {formatTime(classSession.endedAt)}</span>
          ) : null}
        </div>
      </div>

      {/* QR */}
      {isActive && props.qrToken ? (
        <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-border bg-card p-4">
          <p className="w-full text-center text-[14px] font-medium text-m-ink">
            QR Code da chamada
          </p>
          <div className="rounded-2xl border border-border bg-white p-4">
            <QRCodeSVG value={props.qrUrl ?? ""} size={200} level="M" />
          </div>
          <p className="max-w-[280px] text-center text-[12px] text-m-ink-2">
            Peça para os alunos escanearem para registrar presença.
          </p>
          <div className="w-full">
            <QrRefreshCountdown expiresAt={props.qrToken.expiresAt} onExpired={props.onQrExpired} />
          </div>
        </div>
      ) : null}

      {/* Attendance */}
      {isActive || isEnded ? (
        <AttendanceList
          classSessionId={props.classId}
          isActive={isActive}
          refetchInterval={isActive ? 10_000 : false}
        />
      ) : null}

      {/* Actions */}
      {props.canStart ? (
        <button
          type="button"
          disabled={props.isStarting}
          onClick={props.onStart}
          className="h-11 rounded-full bg-primary text-[15px] font-medium text-primary-foreground disabled:opacity-60"
        >
          {props.isStarting ? "Iniciando..." : "Iniciar aula"}
        </button>
      ) : null}
      {isActive ? (
        <button
          type="button"
          disabled={props.isEnding}
          onClick={props.onEnd}
          className="h-11 rounded-full border border-border bg-card text-[15px] font-medium text-m-ink disabled:opacity-60"
        >
          {props.isEnding ? "Encerrando..." : "Encerrar aula"}
        </button>
      ) : null}
      {isEnded ? (
        <button
          type="button"
          onClick={props.onBack}
          className="h-11 rounded-full border border-border bg-card text-[15px] font-medium text-m-ink"
        >
          Voltar para agenda
        </button>
      ) : null}
    </MobileScreen>
  );
}
