# ADR 0020 — Migração de Tatamiq para App do Sensei

## Status

Aceito

## Decisão

O nome público do produto é **App do Sensei**. O escopo interno dos workspaces usa
`@appdosensei/*`, e os identificadores TypeScript específicos do produto usam o mesmo
prefixo (`createAppDoSenseiClient` e `appDoSenseiTokens`).

Também foram migrados os nomes visíveis da Web, Totem e Student App, os fixtures locais,
as chaves de armazenamento, os assets de marca, o scheme nativo
`appdosensei-student` e os identificadores nativos `com.appdosensei.student`.

## Limites da migração

Não são renomeados automaticamente recursos cujo nome é um contrato externo ou identifica
dados já existentes: domínio e endereços `tatamiq.com.br`, repositório GitHub
`marcosgenesis/tatamiq`, aplicações Fly/Cloudflare, bucket R2, banco/usuário PostgreSQL
`tatamiq` e dados já persistidos no banco. Esses itens exigem migração coordenada,
provisionamento ou confirmação dos novos nomes.

O changelog e os links históricos de Issues permanecem com o nome original para não
reescrever o histórico do projeto.
