# V0 Backlog — Gestão de Alunos de BJJ

## Objetivo

Transformar a especificação da V0 em uma sequência implementável de épicos e histórias. A ordem abaixo prioriza fatias verticais que tornam o produto testável cedo.

## Milestone 0 — Fundação

### Epic 0.1 — Projeto e infraestrutura

- Criar aplicação PWA.
- Configurar ambiente de desenvolvimento.
- Configurar banco de dados.
- Configurar storage para fotos e comprovantes.
- Configurar autenticação email/senha.
- Configurar jobs/rotinas agendadas.
- Configurar deploy inicial.

Critérios de aceite:

- app abre em ambiente de desenvolvimento e staging;
- banco conectado;
- autenticação básica funcionando;
- storage aceita upload privado;
- existe estrutura para jobs diários.

### Epic 0.2 — Multi-tenancy por academia

- Criar entidade Academia.
- Criar vínculo instrutor-academia.
- Garantir que consultas operacionais sejam filtradas por academia.
- Criar seed/setup inicial de academia e instrutor.

Critérios de aceite:

- instrutor acessa apenas dados da própria academia;
- entidades operacionais carregam `academy_id`;
- não é possível acessar dados de outra academia por URL/API.

## Milestone 1 — Instrutor, academia e alunos

### Epic 1.1 — Perfil da academia

Histórias:

- Como instrutor, quero configurar nome e logo da academia.
- Como instrutor, quero configurar endereço, telefone/WhatsApp e Instagram.
- Como instrutor, quero configurar chave Pix ou copia-e-cola da academia.

Critérios de aceite:

- dados são editáveis pelo instrutor;
- alunos com acesso conseguem ver dados da academia;
- dados não ficam públicos sem login.

### Epic 1.2 — Cadastro de alunos

Histórias:

- Como instrutor, quero cadastrar aluno com nome, nascimento, matrícula e status.
- Como instrutor, quero editar dados do aluno.
- Como instrutor, quero inativar e reativar aluno.
- Como instrutor, quero adicionar responsável para aluno menor.
- Como instrutor, quero definir valor individual e dia de vencimento da mensalidade.

Critérios de aceite:

- nascimento e matrícula são obrigatórios;
- menor de idade exige responsável;
- aluno inativo sai das chamadas e da geração futura de mensalidade;
- reativação preserva histórico.

### Epic 1.3 — Importação/exportação CSV

Histórias:

- Como instrutor, quero importar alunos por CSV.
- Como instrutor, quero ver erros e alertas por linha importada.
- Como instrutor, quero exportar alunos em CSV.

Critérios de aceite:

- CSV cria alunos sem acesso ao app;
- duplicidade por nome + nascimento gera alerta;
- email existente gera alerta;
- não importa histórico antigo.

## Milestone 2 — Turmas e agenda

### Epic 2.1 — Turmas

Histórias:

- Como instrutor, quero criar turma com dias/horários e duração padrão.
- Como instrutor, quero adicionar etiquetas livres à turma.
- Como instrutor, quero vincular alunos a uma ou mais turmas.
- Como instrutor, quero arquivar e reativar turma.

Critérios de aceite:

- turma arquivada não aparece para novas chamadas;
- vínculos históricos são preservados;
- aluno pode estar em múltiplas turmas.

### Epic 2.2 — Agenda semanal

Histórias:

- Como instrutor, quero ver agenda semanal com turmas recorrentes.
- Como instrutor, quero ver agenda de hoje no painel.
- Como instrutor, quero criar aula avulsa para agora ou para data futura.
- Como instrutor, quero definir duração própria para aula avulsa.
- Como instrutor, quero cancelar e reverter cancelamento de aula.

Critérios de aceite:

- aula cancelada aparece como cancelada;
- cancelamento não exige motivo;
- aula cancelada precisa ser reativada antes de iniciar;
- aulas avulsas aparecem na agenda.

## Milestone 3 — Chamada, QR e presenças

### Epic 3.1 — Iniciar aula e QR

Histórias:

- Como instrutor, quero iniciar chamada de uma turma do dia.
- Como instrutor, quero ver QR Code rotativo da aula ativa.
- Como instrutor, quero encerrar aula manualmente.

Critérios de aceite:

- QR usa token assinado stateless;
- QR renova a cada 30 segundos;
- QR aceita tolerância curta do token anterior;
- QR vale até 15 minutos após fim calculado pelo início real;
- encerramento manual fecha o QR;
- tokens rotativos não são persistidos a cada 30 segundos.

### Epic 3.2 — Confirmação de presença pelo aluno

Histórias:

- Como aluno, quero escanear QR para confirmar presença.
- Como aluno, quero ver minha presença registrada.
- Como aluno, quero confirmar presença mesmo em aula fora da minha turma.

Critérios de aceite:

- aluno precisa estar logado;
- QR inativo/expirado não registra presença;
- presença fora da turma fica marcada;
- não existe confirmação antecipada.

### Epic 3.3 — Presença manual e correções

Histórias:

- Como instrutor, quero adicionar presença manual.
- Como instrutor, quero adicionar presença manual após encerramento.
- Como instrutor, quero invalidar presença com motivo obrigatório.
- Como aluno, quero ver presença invalidada no meu histórico.

Critérios de aceite:

- presença manual é distinguível de QR;
- invalidação preserva histórico;
- motivo aparece só para instrutor;
- presença invalidada não conta para frequência/elegibilidade.

## Milestone 4 — Acesso do aluno

### Epic 4.1 — Convite e primeiro acesso

Histórias:

- Como instrutor, quero gerar convite para aluno.
- Como instrutor, quero reenviar ou revogar convite.
- Como aluno, quero aceitar convite criando conta nova.
- Como aluno, quero aceitar convite com conta existente.
- Como aluno, quero aceitar termo simples no primeiro acesso.

Critérios de aceite:

- convite expira em 7 dias;
- convite vincula conta à ficha existente;
- acesso pode ser revogado sem inativar aluno;
- aluno menor pode aceitar se convidado.

### Epic 4.2 — Área do aluno

Histórias:

- Como aluno, quero ver próximas aulas dos próximos 7 dias.
- Como aluno, quero ver presenças dos últimos 12 meses.
- Como aluno, quero ver evolução e promoções.
- Como aluno, quero ver mensalidades dos últimos 12 meses.
- Como aluno, quero alterar telefone, email e foto.

Critérios de aceite:

- aluno vê apenas dados próprios;
- aluno não vê agenda pública da academia;
- alteração de telefone/email mantém auditoria simples;
- aluno inativo acessa somente leitura por 12 meses.

## Milestone 5 — Graduação e evolução

### Epic 5.1 — Faixas, graus e histórico

Histórias:

- Como instrutor, quero definir faixa/grau atual do aluno.
- Como instrutor, quero registrar promoção de grau.
- Como instrutor, quero registrar promoção de faixa.
- Como aluno, quero ver meu histórico de promoções.

Critérios de aceite:

- promoção registra graduação anterior e nova;
- promoção registra data e instrutor;
- observação opcional é visível ao aluno;
- troca de faixa reinicia grau em 0 por padrão, com ajuste permitido.

### Epic 5.2 — Elegibilidade

Histórias:

- Como instrutor, quero ver alunos elegíveis para grau.
- Como instrutor, quero ver alunos elegíveis para faixa.
- Como instrutor, quero editar regras de tempo e presença.
- Como instrutor, quero adiar sugestão por padrão 30 dias.

Critérios de aceite:

- elegibilidade é interna do instrutor;
- aluno não vê elegibilidade;
- presenças válidas contam, inclusive fora da turma;
- presenças invalidadas não contam;
- sugestão não promove automaticamente.

## Milestone 6 — Mensalidades e Pix

### Epic 6.1 — Geração de mensalidades

Histórias:

- Como sistema, quero gerar mensalidades automaticamente 5 dias antes do vencimento.
- Como sistema, quero marcar mensalidade em aberto como atrasada no dia seguinte ao vencimento.
- Como instrutor, quero criar mensalidade manual excepcional.
- Como instrutor, quero ajustar valor de mensalidade específica com motivo.
- Como instrutor, quero dispensar mensalidade com motivo.

Critérios de aceite:

- uma mensalidade por aluno/mês de referência;
- aluno inativo não gera mensalidade futura;
- em verificação não vira atrasada visualmente;
- ajuste não afeta mensalidades futuras;
- aluno vê valor final, não motivo interno.

### Epic 6.2 — Pagamento Pix com comprovante

Histórias:

- Como aluno, quero ver Pix da academia na mensalidade.
- Como aluno, quero enviar comprovante Pix obrigatório.
- Como instrutor, quero ver fila de pagamentos em verificação.
- Como instrutor, quero aprovar comprovante.
- Como instrutor, quero rejeitar comprovante com motivo.
- Como aluno, quero reenviar comprovante após rejeição.
- Como instrutor, quero marcar pagamento manual com observação opcional.

Critérios de aceite:

- comprovante aceita imagem/PDF até 10 MB;
- aluno não reenvia enquanto pendente;
- rejeição exige motivo visível ao aluno;
- aprovação marca mensalidade paga;
- pagamento manual aparece ao aluno apenas como paga;
- instrutor pode visualizar e baixar comprovante;
- aluno pode visualizar o próprio comprovante.

## Milestone 7 — Anotações, indicadores e painel

### Epic 7.1 — Anotações do aluno

Histórias:

- Como instrutor, quero criar anotação no perfil do aluno.
- Como instrutor, quero escolher se anotação é visível ou privada.
- Como instrutor, quero editar e arquivar anotação.
- Como aluno, quero ver anotações visíveis.

Critérios de aceite:

- anotação é visível ao aluno por padrão;
- aluno não responde;
- sem anexos;
- sem histórico de versões;
- nova anotação visível gera indicador interno.

### Epic 7.2 — Painel do instrutor

Histórias:

- Como instrutor, quero ver aulas de hoje.
- Como instrutor, quero ver pagamentos em verificação.
- Como instrutor, quero ver mensalidades atrasadas.
- Como instrutor, quero ver elegíveis para grau/faixa.
- Como instrutor, quero ver convites pendentes/expirados.

Critérios de aceite:

- painel prioriza pendências acionáveis;
- presença fora da turma aparece como filtro/informação, não alerta principal.

### Epic 7.3 — Indicadores internos do aluno

Histórias:

- Como aluno, quero ver indicador de comprovante aprovado/rejeitado.
- Como aluno, quero ver indicador de mensalidade aberta/atrasada.
- Como aluno, quero ver indicador de nova anotação visível.
- Como aluno, quero ver indicador de nova promoção.
- Como aluno, quero ver indicador de aula cancelada.

Critérios de aceite:

- sem push/email/WhatsApp;
- indicador limpa ao abrir/ver detalhe quando aplicável.

## Milestone 8 — Exportações e polimento piloto

### Epic 8.1 — Exportações finais

Histórias:

- Como instrutor, quero exportar presenças em CSV.
- Como instrutor, quero exportar mensalidades em CSV.

Critérios de aceite:

- exportações respeitam academia atual;
- exportações aceitam filtros básicos.

### Epic 8.2 — Pronto para piloto

Histórias:

- Como instrutor, quero operar por uma semana sem planilha.
- Como equipe de produto, quero validar o uso real em academia piloto.

Critérios de aceite:

- instrutor cadastra alunos/turmas;
- inicia aulas e registra presenças;
- aluno confirma via QR;
- mensalidades são geradas e verificadas;
- graduação/elegibilidade funciona;
- principais erros têm mensagens compreensíveis;
- dados podem ser exportados.
