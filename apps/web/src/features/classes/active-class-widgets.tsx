import { useCallback, useEffect, useState } from "react";

/** Live "Restam mm:ss" countdown from a class's start until its planned end. */
export function ClassCountdown(props: { actualStartAt: string; durationMinutes: number }) {
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

/** Progress bar + seconds until the QR token expires; refetches on expiry. */
export function QrRefreshCountdown(props: { expiresAt: string; onExpired: () => void }) {
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

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
