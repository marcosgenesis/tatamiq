import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import {
  deviceToken,
  getQr,
  getState,
  pair,
  type QrState,
  startClass,
  TotemApiError,
  type TotemOccurrence,
  type TotemState,
} from "./api";

type Screen = "pair" | "loading" | "idle" | "select" | "active" | "offline";

export function App() {
  const [screen, setScreen] = useState<Screen>(deviceToken.read() ? "loading" : "pair");
  const [state, setState] = useState<TotemState | null>(null);
  const [selectedClass, setSelectedClass] = useState<TotemOccurrence | null>(null);
  const [qr, setQr] = useState<QrState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getState();
      setState(next);
      setError(null);
      if (next.activeClasses.length === 0) {
        setSelectedClass(null);
        setQr(null);
        setScreen(next.today.some((item) => item.status === "scheduled") ? "idle" : "idle");
      } else if (selectedClass && next.activeClasses.some((item) => item.id === selectedClass.id)) {
        setSelectedClass(next.activeClasses.find((item) => item.id === selectedClass.id) ?? null);
        setScreen("active");
      } else if (next.activeClasses.length === 1) {
        setSelectedClass(next.activeClasses[0] ?? null);
        setScreen("active");
      } else {
        setScreen("select");
      }
    } catch (cause) {
      const apiError =
        cause instanceof TotemApiError ? cause : new TotemApiError("Falha inesperada.", 0);
      if (apiError.status === 401 || apiError.status === 403) {
        deviceToken.clear();
        setState(null);
        setSelectedClass(null);
        setQr(null);
        setScreen("pair");
      } else {
        setError(apiError.message);
        setScreen((current) => (current === "pair" ? current : "offline"));
      }
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!deviceToken.read()) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!selectedClass || screen !== "active") return;
    let disposed = false;
    const loadQr = async () => {
      try {
        const next = await getQr(selectedClass.id);
        if (!disposed) {
          setQr(next);
          setError(null);
        }
      } catch (cause) {
        if (!disposed) setError(cause instanceof Error ? cause.message : "QR indisponível.");
      }
    };
    void loadQr();
    const interval = window.setInterval(() => void loadQr(), 30_000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [screen, selectedClass]);

  if (screen === "pair") {
    return (
      <PairingScreen
        error={error}
        onPaired={async (code, name) => {
          try {
            const response = await pair(code, name);
            deviceToken.write(response.deviceToken);
            setError(null);
            setScreen("loading");
            await refresh();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Código inválido.");
          }
        }}
      />
    );
  }

  if (screen === "loading") return <LoadingScreen />;
  if (screen === "offline") return <OfflineScreen message={error} onRetry={refresh} />;
  if (screen === "select") {
    return (
      <ClassSelectionScreen
        academyName={state?.academyName ?? "Tatamiq"}
        classes={state?.activeClasses ?? []}
        deviceName={state?.deviceName}
        onSelect={(item) => {
          setSelectedClass(item);
          setScreen("active");
        }}
      />
    );
  }
  if (screen === "active" && selectedClass) {
    return (
      <ActiveClassScreen
        academyName={state?.academyName ?? "Tatamiq"}
        deviceName={state?.deviceName}
        item={selectedClass}
        qr={qr}
        error={error}
        activeCount={state?.activeClasses.length ?? 1}
        onSwitch={() => setScreen("select")}
      />
    );
  }

  return (
    <IdleScreen
      academyName={state?.academyName ?? "Tatamiq"}
      deviceName={state?.deviceName}
      classes={state?.today ?? []}
      error={error}
      onStart={async (item) => {
        try {
          const started = await startClass(item.id);
          setSelectedClass(started);
          setError(null);
          setScreen("active");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a aula.");
        }
      }}
    />
  );
}

function PairingScreen({
  error,
  onPaired,
}: {
  error: string | null;
  onPaired: (code: string, name: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <main className="screen pairing-screen">
      <div className="brand-lockup">
        <span className="brand-mark">T</span>
        <span>tatamiq</span>
      </div>
      <section className="pairing-card">
        <div className="eyebrow">CONFIGURAÇÃO DO DISPOSITIVO</div>
        <h1>Ative este totem</h1>
        <p className="lede">
          No gestor, gere um código em Configurações → Totens e digite-o aqui para liberar a tela da
          academia.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            await onPaired(code.trim(), name.trim());
            setSubmitting(false);
          }}
        >
          <label>
            Código de pareamento
            <input
              // biome-ignore lint/a11y/noAutofocus: tela única de quiosque; o código é o único campo
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="000000"
            />
          </label>
          <label>
            Nome do dispositivo <span className="optional">opcional</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 40))}
              placeholder="Ex.: Recepção"
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="primary-button" disabled={submitting || code.length < 4}>
            {submitting ? "Ativando…" : "Ativar totem"}
          </button>
        </form>
        <p className="security-note">
          <span className="status-dot" /> O código expira em 10 minutos e só pode ser usado uma vez.
        </p>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="screen centered-screen">
      <Spinner />
      <p>Conectando ao totem…</p>
    </main>
  );
}

function OfflineScreen({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <main className="screen centered-screen">
      <div className="offline-icon">↗</div>
      <h1>Sem conexão</h1>
      <p>{message ?? "Verifique a internet deste tablet para continuar."}</p>
      <button type="button" className="secondary-button" onClick={onRetry}>
        Tentar novamente
      </button>
    </main>
  );
}

function IdleScreen({
  academyName,
  deviceName,
  classes,
  error,
  onStart,
}: {
  academyName: string;
  deviceName?: string | undefined;
  classes: TotemOccurrence[];
  error: string | null;
  onStart: (item: TotemOccurrence) => Promise<void>;
}) {
  const upcoming = classes.filter((item) => item.status === "scheduled");
  return (
    <main className="screen app-screen">
      <Header academyName={academyName} deviceName={deviceName} />
      <div className="idle-content">
        <div className="pulse-ring">
          <span className="pulse-core" />
        </div>
        <div className="eyebrow">MODO TOTEM</div>
        <h1>
          Nenhuma aula
          <br />
          <em>em andamento</em>
        </h1>
        <p className="lede">
          Escolha uma aula prevista para hoje quando estiver pronto para começar.
        </p>
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : null}
        <section className="schedule-panel">
          <div className="panel-heading">
            <span>Próximas aulas</span>
            <span className="date-label">{formatDate(new Date())}</span>
          </div>
          {upcoming.length ? (
            upcoming.map((item) => <ClassRow key={item.id} item={item} onStart={onStart} />)
          ) : (
            <div className="empty-state">Aguardando a próxima aula</div>
          )}
        </section>
      </div>
      <Footer />
    </main>
  );
}

function ClassSelectionScreen({
  academyName,
  deviceName,
  classes,
  onSelect,
}: {
  academyName: string;
  deviceName?: string | undefined;
  classes: TotemOccurrence[];
  onSelect: (item: TotemOccurrence) => void;
}) {
  return (
    <main className="screen app-screen">
      <Header academyName={academyName} deviceName={deviceName} />
      <div className="selection-content">
        <div className="eyebrow">MAIS DE UMA AULA ATIVA</div>
        <h1>
          Qual aula
          <br />
          <em>vai aparecer?</em>
        </h1>
        <p className="lede">Selecione o QR Code que os alunos devem escanear neste momento.</p>
        <div className="selection-list">
          {classes.map((item) => (
            <button
              type="button"
              className="selection-card"
              key={item.id}
              onClick={() => onSelect(item)}
            >
              <span className="class-time">{formatTime(item.scheduledStartAt)}</span>
              <span className="class-name">{item.classGroupName}</span>
              <span className="arrow">→</span>
            </button>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function ActiveClassScreen({
  academyName,
  deviceName,
  item,
  qr,
  error,
  activeCount,
  onSwitch,
}: {
  academyName: string;
  deviceName?: string | undefined;
  item: TotemOccurrence;
  qr: QrState | null;
  error: string | null;
  activeCount: number;
  onSwitch: () => void;
}) {
  const expiresAt = qr ? new Date(qr.expiresAt).getTime() : 0;
  const seconds = useCountdown(expiresAt);
  const progress = qr ? Math.max(0, Math.min(100, (seconds / 30) * 100)) : 0;
  return (
    <main className="screen app-screen active-screen">
      <Header academyName={academyName} deviceName={deviceName} compact />
      <div className="active-layout">
        <div className="active-copy">
          <div className="live-badge">
            <span className="live-dot" /> AULA EM ANDAMENTO
          </div>
          <h1>{item.classGroupName}</h1>
          <p className="active-meta">
            Começou às {formatTime(item.actualStartAt ?? item.scheduledStartAt)} <span>·</span>{" "}
            termina às{" "}
            {formatTime(
              new Date(
                (item.actualStartAt ? new Date(item.actualStartAt).getTime() : Date.now()) +
                  item.durationMinutes * 60_000,
              ).toISOString(),
            )}
          </p>
          <p className="scan-instruction">
            Aponte a câmera do celular para o QR Code para confirmar presença.
          </p>
          {activeCount > 1 ? (
            <button type="button" className="text-button" onClick={onSwitch}>
              Trocar aula <span>→</span>
            </button>
          ) : null}
        </div>
        <div className="qr-stage">
          <div className="qr-frame">
            {qr ? (
              <QRCodeSVG
                value={qr.url}
                size={minQrSize()}
                level="M"
                bgColor="#fbfaf6"
                fgColor="#171817"
              />
            ) : (
              <Spinner dark />
            )}
          </div>
          <div className="qr-status">
            <span className="refresh-symbol">↻</span>
            {qr ? `Novo código em ${seconds}s` : "Gerando código…"}
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          {error ? <p className="inline-error">{error}</p> : null}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function ClassRow({
  item,
  onStart,
}: {
  item: TotemOccurrence;
  onStart: (item: TotemOccurrence) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <div className="class-row">
      <div className="time-block">
        <strong>{formatTime(item.scheduledStartAt)}</strong>
        <span>{item.durationMinutes} min</span>
      </div>
      <div className="class-row-name">{item.classGroupName}</div>
      <button
        type="button"
        className="start-button"
        onClick={async () => {
          setPending(true);
          await onStart(item);
          setPending(false);
        }}
      >
        {pending ? "…" : "Iniciar"}
      </button>
    </div>
  );
}
function Header({
  academyName,
  deviceName,
  compact = false,
}: {
  academyName: string;
  deviceName?: string | undefined;
  compact?: boolean;
}) {
  return (
    <header className={`app-header ${compact ? "compact" : ""}`}>
      <div className="academy-lockup">
        <span className="mini-mark">T</span>
        <div>
          <strong>{academyName}</strong>
          <span>{deviceName ?? "Totem"}</span>
        </div>
      </div>
      <div className="connection-state">
        <span className="status-dot" /> conectado
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer className="app-footer">
      <span>tatamiq</span>
      <span>Operação da academia</span>
    </footer>
  );
}
function Spinner({ dark = false }: { dark?: boolean }) {
  return <span className={`spinner ${dark ? "dark" : ""}`} />;
}
function useCountdown(expiresAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}
function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    .format(value)
    .replace(".", "");
}
function minQrSize() {
  return Math.min(
    460,
    Math.max(220, Math.floor(Math.min(window.innerWidth * 0.48, window.innerHeight * 0.58))),
  );
}
