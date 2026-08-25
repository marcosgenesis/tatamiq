# Tatamiq landing

Landing page comercial do Tatamiq, mantida como uma aplicação independente do app autenticado em `apps/web`.

```bash
pnpm --filter @tatamiq/landing dev
pnpm --filter @tatamiq/landing build
```

Antes de publicar, substitua o destino do WhatsApp em `src/App.tsx` (`whatsappHref`) pelo número comercial da equipe.
