type SharePageAcademy = {
  name: string;
  logo: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function preRegistrationSharePage(
  academy: SharePageAcademy,
  destinationUrl: string,
): string {
  const academyName = escapeHtml(academy.name);
  const destination = escapeHtml(destinationUrl);
  const title = escapeHtml(`Pré-cadastro · ${academy.name}`);
  const description = escapeHtml(
    `Faça seu pré-cadastro na ${academy.name}. Envie seus dados para a academia entrar em contato.`,
  );
  const image = academy.logo
    ? `<meta property="og:image" content="${escapeHtml(academy.logo)}" />
    <meta name="twitter:card" content="summary_large_image" />`
    : '<meta name="twitter:card" content="summary" />';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:site_name" content="Tatamiq" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${destination}" />
    ${image}
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <link rel="canonical" href="${destination}" />
    <meta http-equiv="refresh" content="0;url=${destination}" />
  </head>
  <body>
    <p>Abrindo o pré-cadastro da ${academyName}…</p>
    <p><a href="${destination}">Continuar para o pré-cadastro</a></p>
    <script>window.location.replace(${JSON.stringify(destinationUrl).replaceAll("<", "\\u003c")});</script>
  </body>
</html>`;
}

export function apiBaseUrl(): string {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3100").replace(/\/$/, "");
}
