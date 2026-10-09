import type React from "react";

export function LogoIcon({ alt = "App do Sensei", ...props }: React.ComponentProps<"img">) {
  return <img {...props} src="/app-do-sensei-logo.svg" alt={alt} />;
}
