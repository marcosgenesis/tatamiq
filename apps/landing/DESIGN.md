# Direção de design — Landing do Tatamiq

## Tese

A landing apresenta o Tatamiq como a camada operacional do CT: menos tempo preso a planilhas, mensagens e cobranças; mais tempo ensinando. A primeira dobra precisa deixar duas coisas claras: para quem é o produto e qual é o próximo passo — agendar uma demonstração.

O produto é mostrado antes da conversa comercial. O painel e os demais mockups são **prévias ilustrativas**, com dados fictícios, e não prometem métricas de clientes. O CT-piloto é a única prova social disponível neste momento; por isso não há barra de logos nem depoimentos inventados.

## Direção visual

- **Mundo:** SaaS B2B para CTs, com linguagem atlética e editorial. O layout é limpo, direto e orientado à operação real do tatame.
- **Paleta:** papel claro (`#f6f8f9`) como base; carvão (`#101516`) para confiança e contraste; azul (`#234d67`) para momentos de processo e sistema; laranja (`#ff4f00`) para ação; verde suave (`#b8d87b`) para sinais de estado.
- **Tipografia:** Geist Variable, sans-serif, com títulos compactos e pesados, corpo confortável e números tabulares nos dados do painel.
- **Forma:** linhas finas, divisores editoriais, cartões de produto e cantos arredondados controlados. O dashboard é o herói visual; não há logos de empresas usuárias.
- **Movimento:** entrada suave dos blocos e microinterações apenas onde ajudam a orientar a leitura. `prefers-reduced-motion` reduz as transições para usuários que solicitarem.

## Estrutura da página

A ordem preserva a anatomia enviada como referência:

1. Navbar fixa visualmente, com navegação curta e CTA persistente.
2. Hero com promessa, microprova, CTA e painel Tatamiq.
3. Benefícios: alunos, graduação e mensalidades, tratados como resultados.
4. Processo em três passos: configurar, operar e envolver o aluno.
5. Recursos em blocos alternados: presença por QR Code, portal do aluno e financeiro.
6. Preços com teste acompanhado, plano principal e opção anual.
7. Depoimento do CT-piloto, sem ampliar artificialmente a prova social.
8. FAQ para reduzir dúvidas sobre implantação, teste, uso e cancelamento.
9. CTA final repetindo a promessa e levando ao WhatsApp.
10. Footer com navegação, contato e links legais a completar.

## Decisões de conversão

- Um CTA principal consistente (“Agendar demonstração” / “Quero começar”) aponta para o WhatsApp; links secundários explicam o produto sem competir com a ação.
- O teste acompanhado reduz risco e comunica implantação próxima, sem afirmar resultados que ainda não foram medidos.
- A tabela de preços é transparente e separa teste, plano recorrente e anual. Os valores atuais são hipótese comercial e devem ser validados antes de publicar.
- A narrativa acompanha a rotina do dono/professor: organizar pessoas, registrar presença, acompanhar graduação e cobrar sem constrangimento.
- A prova visual vem do próprio produto. A prova social fica restrita ao piloto real até existirem outros clientes autorizados a aparecer.

## Diagnóstico de aquisição

- **Contexto:** a primeira versão assume tráfego de indicação, conteúdo e busca, com boa parte dos primeiros acessos no celular e em primeiro contato com a marca.
- **ICP:** professor ou responsável por um CT de Jiu-Jitsu que ainda coordena alunos, presença, graduação e cobrança por planilha, mensagens ou memória.
- **Consciência:** a página conversa primeiro com quem já sente o problema e está procurando uma saída; a mensagem nomeia o improviso antes de apresentar o mecanismo do Tatamiq.
- **Fio de venda:** problema → impacto na rotina → mecanismo (um painel único) → recursos → prova do CT-piloto → oferta → redução de risco → CTA.
- **Objeções na narrativa:** configuração, teste, preço, cancelamento e uso pelo aluno aparecem antes ou junto da decisão, não apenas escondidos no FAQ.
- **CTA:** “Agendar demonstração” deixa explícito o próximo passo e mantém o compromisso compatível com uma conversa inicial pelo WhatsApp.

## Responsividade e acessibilidade

- O layout colapsa para uma coluna em telas menores, preservando a ordem de leitura e mantendo o CTA acessível no menu mobile.
- Dashboard, portal e QR Code recebem `role="img"` e texto alternativo explícito como prévias ilustrativas.
- Links e botões têm foco visível, alvos confortáveis e contraste alto entre texto e fundo.
- Elementos decorativos não carregam informação essencial; a leitura continua compreensível sem animação.

## Referências externas

As referências foram usadas como régua de produto e narrativa, não como cópia visual:

- [Framework para descobrir por que uma LP não converte](https://x.com/richardrx/status/2089755232511123628): contexto de aquisição, ICP, consciência, mensagem, prova, objeções, CTA e ritmo visual.

- [Linear — Features](https://linear.app/features): clareza de proposta, produto em ação e agrupamento curto de capacidades.
- [GymCore](https://getgymcore.com/): software voltado a artes marciais, demonstração guiada e redução de risco na adoção.
- [BASE BJJ](https://www.basebjj.com.br/): linguagem brasileira da rotina do CT, cobrança e comunicação com alunos.
- [KimonOS](https://kimonos.app/): narrativa antes/depois centrada no professor e na rotina, com chamada clara para testar.

## Próximos ajustes conhecidos

- Trocar `whatsappHref` em `src/App.tsx` pelo número comercial real e revisar a mensagem pré-preenchida.
- Validar a oferta, os preços de R$ 89/mês e R$ 899/ano, meios de pagamento e condições do teste com mais CTs.
- Substituir textos de rodapé e links legais pelos destinos definitivos.
- Quando houver autorização, adicionar novos depoimentos; não adicionar logos apenas para preencher espaço.
