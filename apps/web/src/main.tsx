import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerAppUpdateChecks } from "./lib/app-update";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD) {
  registerAppUpdateChecks();

  if ("serviceWorker" in navigator) {
    let reloadingForNewServiceWorker = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadingForNewServiceWorker) return;
      reloadingForNewServiceWorker = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => registration.update())
        .catch((error) => {
          console.warn("Falha ao registrar service worker do Tatamiq", error);
        });
    });
  }
}
