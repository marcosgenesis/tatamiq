# Arquitetura do Student App no monorepo

## Contexto

O MVP do Tatamiq precisa substituir o uso principal da PWA no celular por um app Expo dedicado ao **Acesso do Aluno**, sem duplicar o backend, os contratos ou as regras do domínio. A PWA continua como fallback para os mesmos links HTTPS, enquanto o painel do **Responsável da Academia** permanece na web.

O app precisa atender tanto rotas públicas sem sessão — pré-cadastro, acompanhamento, primeiro acesso e convite — quanto a área autenticada do aluno, incluindo QR Code de presença, agenda, mensalidades, evolução e perfil.

## Decisão

- O app será um workspace separado em `apps/student-app`, com pacote `@tatamiq/student-app`. Um futuro app do instrutor poderá ser criado separadamente; não haverá um app móvel de papéis misturados no MVP.
- O app usará Expo Router em `src/app`, com grupos de rotas públicas, autenticação e área protegida do aluno. Os links públicos preservarão tokens opacos e a experiência contínua de acompanhamento, enquanto a definição de senha continuará usando o **Link de Primeiro Acesso** separado.
- `apps/student-app` compartilhará `@tatamiq/contracts`, o cliente OpenAPI, tipos, schemas e regras puras. O cliente HTTP terá um adaptador nativo para anexar o cookie Better Auth obtido por `authClient.getCookie()` às requisições autenticadas; o web continuará usando `credentials: "include"`.
- A autenticação nativa usará o plugin oficial `@better-auth/expo` no servidor e `expoClient` no app, com `expo-secure-store` para persistir sessão e cookies. O app usará um scheme próprio incluído nos `trustedOrigins` do backend. Não haverá uma autenticação Bearer paralela.
- A camada visual será nativa e própria do app. NativeWind na trilha estável será usado para aproximar a linguagem Tailwind do web e compartilhar tokens/convenções, mas componentes DOM, shadcn e componentes de `apps/web` não serão importados pelo app nativo.
- O baseline do MVP será Expo SDK 55, React Native 0.83 e React 19.2, com Expo Router da linha 55, módulos Expo instalados pela ferramenta de compatibilidade do SDK, `@better-auth/expo` alinhado à versão Better Auth do monorepo, NativeWind v4 estável com Tailwind 3.4.x no app e Node mínimo 22.22.1. SDKs posteriores e NativeWind v5 ficam para uma atualização deliberada.
- DOM Components do Expo poderão ser usados apenas em telas auxiliares ou migrações isoladas. Eles não serão a base da navegação, autenticação, QR Code, agenda, presença, mensalidades ou perfil.
- Diferenças de plataforma serão isoladas em módulos `.native.tsx`/`.web.tsx` somente quando envolverem APIs como câmera, SecureStore, picker, permissões ou deep links. A PWA oficial continuará em `apps/web`; o web target do Expo não será uma segunda PWA de produto.
- Testes usarão Vitest para regras/contratos, Jest com `jest-expo` e React Native Testing Library para componentes e hooks, Expo Router Testing Library para navegação, Playwright para a PWA e Maestro para jornadas críticas em builds Android/iOS.

## Alternativas consideradas

- **`apps/mobile` único para aluno e instrutor** — rejeitado porque os contextos, navegação e prioridades móveis são diferentes; o app do instrutor poderá nascer como outro produto.
- **Colocar o app inteiro dentro de DOM Components/WebView** — rejeitado porque perde integração nativa, aumenta a complexidade da ponte e mantém a experiência web como núcleo do app.
- **Compartilhar diretamente componentes de `apps/web`** — rejeitado porque eles dependem de DOM, shadcn, Tailwind web e padrões de layout incompatíveis com a árvore nativa.
- **Criar autenticação Bearer separada** — rejeitado porque o plugin Expo do Better Auth já permite persistir e reutilizar cookies de sessão nativos, mantendo uma única sessão no backend.
- **Shopify Restyle** — rejeitado para este objetivo porque é um sistema nativo tipado, mas não compartilha a linguagem Tailwind já usada no web.
- **Tamagui** — adiado; permitiria compartilhar componentes reais entre web e native, mas exigiria uma camada multiplataforma maior e uma reestruturação que não é necessária para o MVP.
- **NativeWind v5 preview** — adiado até deixar de ser pré-release; o MVP usará a versão estável compatível com o SDK Expo escolhido.

## Consequências

- Será necessário criar `apps/student-app`, configurar Expo Router, NativeWind, Better Auth Expo, scheme/deep links e os testes nativos.
- `packages/contracts/src/client.ts` precisará aceitar a estratégia de headers/fetch do app nativo sem quebrar o cliente web.
- A autenticação do backend precisará adicionar `expo()` e aceitar os trusted origins do app, mantendo o `basePath` atual `/auth`.
- Tokens visuais atualmente concentrados em `apps/web/src/index.css` deverão ser extraídos gradualmente para uma fonte neutra consumível por CSS web e NativeWind.
- A paridade será preservada por contratos e fixtures compartilhados, mas a implementação de UI, navegação e APIs nativas continuará específica do app.
- O app nativo terá uma suíte Jest própria e E2E Maestro; Playwright continuará validando a PWA fallback.
