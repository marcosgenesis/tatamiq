# V0 technical stack

The V0 will use a TypeScript monorepo with Vite/React on Cloudflare Pages, NestJS on Fly.io, Neon Postgres, Drizzle, Better Auth, Cloudflare R2, OpenAPI-generated frontend clients, and pnpm workspaces with Turborepo. This keeps the frontend cheap and fast on Cloudflare while running the NestJS API in a Node-friendly environment, avoiding Cloudflare Worker constraints without taking on VPS operations.
