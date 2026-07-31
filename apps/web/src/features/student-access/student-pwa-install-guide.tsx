import {
  Check,
  ChevronRight,
  Download,
  EllipsisVertical,
  Menu,
  Share,
  Smartphone,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useIsMobile } from "../../hooks/use-mobile";

type InstallBrowser = "ios" | "android-chrome" | "android-samsung" | "android-other" | "other";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const DISMISSED_KEY = "tatamiq.student.pwa-install.dismissed";

export function detectInstallBrowser(
  userAgent: string,
  platform = "",
  maxTouchPoints = 0,
): InstallBrowser {
  const isIpadDesktopMode = platform === "MacIntel" && maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(userAgent) || isIpadDesktopMode) return "ios";

  if (/android/i.test(userAgent)) {
    if (/samsungbrowser/i.test(userAgent)) return "android-samsung";
    if (/chrome|crios/i.test(userAgent)) return "android-chrome";
    return "android-other";
  }

  return "other";
}

function getInstallBrowser(): InstallBrowser {
  if (typeof navigator === "undefined") return "other";
  return detectInstallBrowser(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
}

function isInstalledPwa(): boolean {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
  return Boolean(
    navigatorWithStandalone.standalone ||
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.matchMedia?.("(display-mode: window-controls-overlay)").matches,
  );
}

function wasDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // Storage can be unavailable in private browsing; the guide still works for this session.
  }
}

export function StudentPwaInstallGuide({ variant }: { variant: "banner" | "row" }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(isInstalledPwa);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const browser = getInstallBrowser();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstalled(true);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!isMobile || installed) return null;

  function openGuide() {
    setOpen(true);
  }

  function dismissBanner() {
    rememberDismissal();
    setDismissed(true);
  }

  async function installNow() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setOpen(false);
    }
  }

  return (
    <>
      {variant === "banner" && !dismissed ? (
        <section className="mx-4 mb-4 overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-lg">
          <div className="flex items-start gap-3.5 p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Smartphone className="size-5" aria-hidden="true" />
            </div>
            <button type="button" className="min-w-0 flex-1 text-left" onClick={openGuide}>
              <p className="text-sm font-bold">Leve o Tatamiq com você</p>
              <p className="mt-1 text-xs font-medium leading-relaxed text-white/60">
                Adicione à tela inicial para abrir como um app e fazer check-in mais rápido.
              </p>
              <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-primary">
                Ver como instalar <ChevronRight className="size-3.5" aria-hidden="true" />
              </span>
            </button>
            <button
              type="button"
              aria-label="Fechar aviso de instalação"
              onClick={dismissBanner}
              className="grid size-7 shrink-0 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : null}

      {variant === "row" ? (
        <button
          type="button"
          onClick={openGuide}
          className="flex w-full items-center gap-3.5 p-4 text-left transition-colors hover:bg-muted/50"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Download className="size-[1.05rem]" aria-hidden="true" />
          </span>
          <span className="flex-1 text-sm font-semibold">Instalar Tatamiq no celular</span>
          <ChevronRight className="size-4 text-muted-foreground/60" aria-hidden="true" />
        </button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90vh,42rem)] overflow-y-auto p-0 sm:max-w-md">
          <div className="bg-neutral-950 px-5 pb-5 pt-6 text-white">
            <DialogHeader className="pr-6">
              <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Smartphone className="size-6" aria-hidden="true" />
              </div>
              <DialogTitle className="text-xl text-white">Instale o Tatamiq</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed text-white/60">
                Tenha seu acesso de aluno na tela inicial, com abertura rápida e visual de app.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {browserLabel(browser)}
              </p>
              <h3 className="mt-1 text-base font-bold tracking-tight">Siga estes 3 passos</h3>
            </div>

            <InstallSteps browser={browser} />

            {browser === "ios" ? (
              <p className="rounded-xl bg-primary/10 px-3.5 py-3 text-xs font-medium leading-relaxed text-primary-strong dark:text-primary-soft-foreground">
                No iPhone e iPad, a instalação precisa ser feita pelo Safari. Se você abriu este
                link pelo WhatsApp ou pelo Chrome, copie o endereço e abra no Safari.
              </p>
            ) : null}

            {deferredPrompt ? (
              <Button className="h-11 w-full gap-2" onClick={() => void installNow()}>
                <Download className="size-4" aria-hidden="true" />
                Instalar agora
              </Button>
            ) : null}

            <p className="text-center text-xs font-medium text-muted-foreground">
              Depois, abra o Tatamiq pelo ícone da tela inicial para usar como app.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function browserLabel(browser: InstallBrowser): string {
  switch (browser) {
    case "ios":
      return "iPhone ou iPad · Safari";
    case "android-chrome":
      return "Android · Chrome";
    case "android-samsung":
      return "Android · Samsung Internet";
    case "android-other":
      return "Android · navegador";
    default:
      return "Navegador móvel";
  }
}

function InstallSteps({ browser }: { browser: InstallBrowser }) {
  const steps =
    browser === "ios"
      ? [
          { icon: Share, text: "Toque no botão Compartilhar do Safari." },
          { icon: ChevronRight, text: "Role a lista e toque em Adicionar à Tela de Início." },
          { icon: Check, text: "Confirme em Adicionar." },
        ]
      : browser === "android-chrome"
        ? [
            { icon: EllipsisVertical, text: "Abra o menu ⋮ no canto superior direito do Chrome." },
            { icon: Download, text: "Toque em Instalar app ou Adicionar à tela inicial." },
            { icon: Check, text: "Confirme em Instalar ou Adicionar." },
          ]
        : browser === "android-samsung"
          ? [
              { icon: Menu, text: "Abra o menu ☰ do Samsung Internet." },
              { icon: Download, text: "Toque em Adicionar página à e escolha Tela inicial." },
              { icon: Check, text: "Confirme em Adicionar." },
            ]
          : [
              { icon: EllipsisVertical, text: "Abra o menu do seu navegador." },
              { icon: Download, text: "Procure por Instalar app ou Adicionar à tela inicial." },
              { icon: Check, text: "Confirme a instalação e pronto." },
            ];

  return (
    <ol className="space-y-3">
      {steps.map(({ icon: Icon, text }, index) => (
        <li key={text} className="flex items-center gap-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium leading-relaxed">
            <strong className="mr-1 text-primary">{index + 1}.</strong>
            {text}
          </span>
        </li>
      ))}
    </ol>
  );
}
