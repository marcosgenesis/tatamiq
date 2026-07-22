import { AlertCircleIcon, Camera01Icon, RefreshIcon } from "hugeicons-react";
import QrScanner from "qr-scanner";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";

/**
 * Extracts the check-in token from a decoded QR payload.
 *
 * The instructor's QR encodes a full URL like
 * `https://<origin>/student/check-in?token=<token>`. We accept any URL that
 * carries a `token` query param and let the backend validate it — the origin is
 * intentionally ignored so QRs generated on a different web origin (cross-site
 * staging / custom domains) still work. Non-URL or tokenless payloads return
 * null so the scanner keeps scanning silently.
 */
export function extractCheckInToken(data: string): string | null {
  const raw = data.trim();
  if (!raw) return null;
  try {
    const token = new URL(raw).searchParams.get("token");
    return token?.trim() ? token : null;
  } catch {
    return null;
  }
}

type ScannerStatus = "priming" | "starting" | "scanning" | "denied" | "unavailable" | "error";

function classifyStartError(error: unknown): ScannerStatus {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError") {
    return "unavailable";
  }
  return "error";
}

export function QrCheckInScanner({ onToken }: { onToken: (token: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("priming");

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    setStatus("starting");
    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        const token = extractCheckInToken(result.data);
        if (!token) return; // não é um QR de check-in — segue escaneando
        stop();
        onToken(token);
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 5,
        returnDetailedScanResult: true,
      },
    );
    scannerRef.current = scanner;
    try {
      await scanner.start();
      setStatus("scanning");
    } catch (error) {
      stop();
      setStatus(classifyStartError(error));
    }
  }, [onToken, stop]);

  if (status === "denied" || status === "unavailable" || status === "error") {
    return <ScannerFallback status={status} onRetry={() => setStatus("priming")} />;
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <video ref={videoRef} playsInline muted className={cnVideo(status === "scanning")} />

      {status === "scanning" ? (
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-end pb-10 text-center">
          <div className="rounded-full bg-black/55 px-4 py-2 backdrop-blur">
            <p className="text-sm font-medium text-white/85">
              Aponte para o QR Code exibido pelo professor
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span className="grid size-[7.25rem] place-items-center rounded-full bg-primary/15 ring-8 ring-white/10">
            <Camera01Icon className="size-14 text-primary" aria-hidden="true" />
          </span>
          <h1 className="mt-7 text-[1.55rem] font-bold tracking-tight text-balance">
            Ler QR Code da aula
          </h1>
          <p className="mt-2 max-w-[20rem] text-sm font-medium text-white/60">
            Precisamos da câmera para ler o QR Code que o professor exibe e confirmar sua presença.
          </p>
          <Button
            className="mt-6 w-full max-w-sm"
            disabled={status === "starting"}
            onClick={() => void start()}
          >
            <Camera01Icon aria-hidden="true" />
            {status === "starting" ? "Abrindo câmera..." : "Ativar câmera"}
          </Button>
        </div>
      )}
    </div>
  );
}

function cnVideo(active: boolean): string {
  return active
    ? "absolute inset-0 size-full object-cover"
    : "pointer-events-none absolute size-px opacity-0";
}

function ScannerFallback({
  status,
  onRetry,
}: {
  status: "denied" | "unavailable" | "error";
  onRetry: () => void;
}) {
  const copy = {
    denied: {
      title: "Câmera bloqueada",
      description: "Você negou o acesso à câmera. Reative para ler o QR Code da aula.",
    },
    unavailable: {
      title: "Câmera indisponível",
      description: "Não encontramos uma câmera neste dispositivo.",
    },
    error: {
      title: "Não foi possível abrir a câmera",
      description: "Algo deu errado ao acessar a câmera. Tente novamente.",
    },
  }[status];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="grid size-[7.25rem] place-items-center rounded-full bg-destructive/15 ring-8 ring-white/10">
        <AlertCircleIcon className="size-14 text-destructive" aria-hidden="true" />
      </span>
      <h1 className="mt-7 text-[1.55rem] font-bold tracking-tight text-balance">{copy.title}</h1>
      <p className="mt-2 max-w-[20rem] text-sm font-medium text-white/60">{copy.description}</p>

      <ul className="mt-6 w-full max-w-sm space-y-2.5 text-left">
        <FallbackHint>
          Reative a câmera nas configurações do navegador ou do celular (Ajustes → Tatamiq → Câmera)
          e toque em Tentar de novo.
        </FallbackHint>
        <FallbackHint>
          Ou use a câmera do próprio celular apontando para o QR Code — o link abre o app
          automaticamente.
        </FallbackHint>
        <FallbackHint>
          Se nada funcionar, peça ao professor para registrar sua presença manualmente.
        </FallbackHint>
      </ul>

      <Button variant="secondary" className="mt-6 w-full max-w-sm" onClick={onRetry}>
        <RefreshIcon aria-hidden="true" />
        Tentar de novo
      </Button>
    </div>
  );
}

function FallbackHint({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-xl bg-white/5 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-white/70">
      {children}
    </li>
  );
}
