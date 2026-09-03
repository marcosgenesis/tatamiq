# Design da landing — App do Sensei

## Tese

A landing apresenta o App do Sensei como a prancheta viva do CT: a operação sai da cabeça do professor e passa a acompanhar o ritmo do tatame. O primeiro viewport combina uma promessa direta com uma captura real do painel, antes de pedir uma conversa comercial.

## Mundo visual

- **FORM / seed conceitual:** `c321405d` — composição editorial de “prancheta de canto”, com recortes operacionais e demonstração do produto em primeiro plano.
- **Conceito:** prancheta de canto contemporânea, inspirada nos artefatos que organizam uma aula — lista de presença, agenda, marcações de faixa e quadro de acompanhamento.
- **Paleta:** papel mineral `#f2f0e9`, tinta `#151713`, laranja `#ff5b2b`, verde-faixa `#d8f36a` e azul de sistema `#2959c8`.
- **Marca:** `public/app-do-sensei-logo.svg` é o símbolo oficial fornecido pelo produto; o nome tipográfico permanece ao lado para leitura em formatos horizontais.
- **Tipografia:** Barlow Condensed em títulos e números; Archivo Variable em navegação, corpo e controles.
- **Forma:** blocos recortados, linhas de registro, sombras deslocadas e inclinações pontuais. Cantos arredondados aparecem somente na moldura da captura mobile.
- **Movimento:** uma entrada orquestrada da prancheta no hero; estados e transições funcionais respeitam `prefers-reduced-motion`.

## Arquitetura da página

1. Navegação curta e CTA para demonstração.
2. Hero com promessa, redução de risco e captura real do dashboard geral da Academia.
3. Faixa operacional: alunos, presença, graduação e financeiro.
4. Diagnóstico do improviso e capacidades do produto.
5. Fluxo antes/durante/depois da aula.
6. Portal do aluno em contexto mobile.
7. Prova do CT-piloto, sem logos ou métricas inventadas.
8. Preço mensal/anual e teste acompanhado.
9. FAQ e CTA final.

## Componentes do 21st

- `src/components/pricing-table.tsx` adapta o **Modern Pricing Table**, de Caio Bonato, com alternância mensal/anual e cartões responsivos.
- `src/components/faq-accordion.tsx` adapta o padrão de FAQ com ícones da Tailark, mantendo respostas no DOM e interação acessível.

Os componentes foram convertidos para CSS próprio do App do Sensei para evitar a aparência genérica do template e manter o app independente de Tailwind, ShadCN e Framer Motion.

## Conteúdo e prova

- As imagens do painel e do portal do aluno são capturas reais de `apps/web`, autenticado com a seed oficial de desenvolvimento em um banco Docker isolado.
- As capturas usam somente dados fictícios e controlados da seed; não há dados de clientes nem interfaces recriadas na landing.
- O depoimento permanece restrito ao CT-piloto informado na versão anterior.
- Os valores de R$ 89/mês e R$ 899/ano vieram da oferta existente e devem ser confirmados antes de publicar.
- O destino do WhatsApp ainda não possui número comercial e precisa ser substituído.

## Responsividade e acessibilidade

- O layout reduz para uma coluna sem overflow horizontal em 390 px.
- Menu mobile fecha por botão ou `Escape`.
- Alternância de cobrança usa `fieldset`, estado pressionado e rótulo acessível.
- FAQ expõe `aria-expanded` e preserva as respostas no HTML.
- Foco visível, contraste AA e alvos de toque de pelo menos 44 px nos controles principais.
