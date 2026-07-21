export function hasDifferentDocumentEntryScript(
  currentScriptSrcs: readonly string[],
  nextDocumentHtml: string,
): boolean {
  const currentEntryPaths = currentScriptSrcs
    .map((src) => normalizeScriptPath(src))
    .filter((src): src is string => Boolean(src));

  if (currentEntryPaths.length === 0) return false;
  return currentEntryPaths.some((src) => !nextDocumentHtml.includes(src));
}

export function registerAppUpdateChecks(win: Window = window): void {
  let checking = false;

  async function checkForUpdate() {
    if (checking) return;
    checking = true;
    try {
      const response = await win.fetch(`/?__tatamiq_update=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;

      const html = await response.text();
      const currentScriptSrcs = Array.from(win.document.scripts).map((script) => script.src);
      if (hasDifferentDocumentEntryScript(currentScriptSrcs, html)) {
        win.location.reload();
      }
    } catch {
      // Best-effort update check. Network failures should not interrupt app usage.
    } finally {
      checking = false;
    }
  }

  win.addEventListener("focus", () => void checkForUpdate());
  win.document.addEventListener("visibilitychange", () => {
    if (!win.document.hidden) void checkForUpdate();
  });
  win.setInterval(() => void checkForUpdate(), 5 * 60 * 1000);
}

function normalizeScriptPath(src: string): string | null {
  if (!src) return null;
  try {
    const url = new URL(src, "https://tatamiq.local");
    if (!url.pathname.endsWith(".js") && !url.pathname.endsWith(".tsx")) return null;
    return url.pathname;
  } catch {
    return null;
  }
}
