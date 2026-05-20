# V0 Product Spec — Gestão de Alunos de Brazilian Jiu-Jitsu

## Visão geral

A V0 é uma PWA instalável para academias pequenas de Brazilian Jiu-Jitsu, operadas principalmente por um dono/instrutor solo. O produto deve substituir a operação básica feita em planilhas ou controles manuais: alunos, turmas, aulas, presenças, graduação e mensalidades.

## Objetivo da V0

Validar se uma academia piloto consegue operar por pelo menos uma semana usando o app para:

- cadastrar alunos e turmas;
- iniciar aulas e registrar presenças por QR Code;
- acompanhar evolução por faixa/grau;
- controlar mensalidades via Pix com comprovante;
- dar acesso básico ao aluno para consulta e confirmação de presença.

## Personas

### Dono/Instrutor Solo

Pessoa responsável pela operação da academia. Na V0, ele administra alunos, turmas, aulas, presenças, graduação, mensalidades, convites e verificações de pagamento.

### Aluno

Pessoa matriculada na academia. Pode ter acesso ao app por convite para consultar dados próprios, confirmar presença por QR Code, enviar comprovante Pix, consultar agenda e atualizar contato/foto.

### Responsável

Pessoa associada a um aluno menor de idade como contato e eventual pagador. Na V0, não tem acesso próprio ao app.

## Plataforma e arquitetura de produto

- PWA instalável.
- Online obrigatório na V0.
- Sem app nativo nas lojas.
- Sem modo offline.
- Multi-tenant por academia desde o início.
- Uma conta de instrutor gerencia uma única academia na V0.
- Papéis mínimos: instrutor e aluno.
- Sem permissões granulares.
- Autenticação por email e senha.
- Confirmação de email não bloqueia uso.
- Recuperação de senha simples obrigatória.

## Escopo incluído

### Academia

A academia possui:

- nome;
- logo;
- endereço;
- telefone/WhatsApp;
- Instagram;
- Pix da Academia: chave Pix simples ou payload Pix copia-e-cola.

Esses dados aparecem apenas para alunos com acesso, não em página pública.

### Alunos

Cadastro obrigatório:

- nome;
- data de nascimento;
- data de matrícula;
- status: ativo ou inativo.

Dados opcionais/operacionais:

- telefone;
- email;
- foto;
- responsável, obrigatório para menores de idade;
- faixa/grau atual;
- valor individual da mensalidade;
- dia de vencimento da mensalidade;
- turmas vinculadas.

Regras:

- aluno ativo aparece em chamadas e gera mensalidades futuras;
- aluno inativo sai de chamadas e da geração futura de mensalidades;
- inativação preserva histórico e mensalidades existentes;
- aluno inativo mantém acesso somente leitura por 12 meses;
- reativação preserva histórico e retoma mensalidades futuras;
- não há exclusão definitiva na interface principal, apenas inativação.

### Responsável

- Obrigatório para alunos menores de idade.
- Opcional para adultos.
- Não tem acesso próprio ao app na V0.
- Pode estar associado a mais de um aluno, mas a cobrança continua por aluno.

### Acesso do aluno

O aluno acessa por convite do instrutor.

Convite:

- link ou código copiado pelo instrutor e enviado por fora;
- expira em 7 dias;
- pode ser reenviado;
- permite criar conta nova ou vincular conta existente;
- cria vínculo com uma ficha de aluno já existente;
- pode ser revogado pelo instrutor sem inativar o aluno;
- acesso revogado pode ser recriado com novo convite.

No primeiro acesso, o aluno deve aceitar termo simples de uso do app.

Aluno pode:

- consultar próximas aulas dos próximos 7 dias das suas turmas;
- consultar próprias presenças dos últimos 12 meses;
- consultar próprias mensalidades dos últimos 12 meses, inclusive se for menor de idade;
- consultar evolução e histórico de graduação;
- consultar turmas vinculadas;
- confirmar presença via QR Code ativo;
- enviar comprovante Pix;
- alterar contato pessoal e foto.

Aluno não pode:

- administrar academia;
- alterar faixa/grau;
- alterar turma;
- alterar mensalidade;
- alterar status ativo/inativo;
- responder anotações;
- confirmar presença antecipadamente.

Alterações de telefone/email feitas pelo aluno mantêm auditoria simples. Foto não precisa de histórico.

### Turmas e agenda

A V0 suporta uma modalidade principal: Brazilian Jiu-Jitsu.

Uma turma possui:

- nome;
- dias/horários semanais;
- duração padrão;
- etiquetas opcionais livres, como infantil, adulto, feminino, competição, iniciante ou avançado.

Regras:

- aluno pode pertencer a várias turmas;
- turma pode ter vários alunos;
- não há limite de capacidade por turma na V0;
- turma pode ser arquivada sem apagar histórico;
- turma arquivada não aparece para novas chamadas nem agenda futura;
- turma arquivada aparece apenas em histórico de presenças;
- turma arquivada pode ser reativada;
- mudanças de horário/duração da turma afetam ocorrências futuras;
- passado permanece histórico;
- cancelamentos futuros são preservados por data se o horário da turma mudar.

Agenda:

- painel mostra turmas previstas de hoje;
- há agenda semanal simples;
- agenda semanal mostra turmas recorrentes e aulas avulsas;
- alunos veem próximas aulas dos próximos 7 dias das próprias turmas.

### Aulas

Aula é criada quando o instrutor inicia a chamada de uma turma.

A aula registra:

- turma;
- horário previsto;
- horário real de início;
- fim previsto calculado pela duração da turma ou duração própria;
- encerramento manual, quando houver.

Regras:

- instrutor pode iniciar aula a partir do painel de hoje;
- se iniciar atrasado, o registro usa horário real de início e mantém referência ao horário previsto;
- instrutor pode encerrar aula manualmente;
- encerramento manual fecha o QR para alunos;
- instrutor ainda pode adicionar presença manual após encerramento;
- sem limite de tempo para o instrutor corrigir/adicionar/invalidar presenças na V0;
- alterações registram a conta do instrutor.

### Aulas avulsas

Aula avulsa é aula criada ou agendada fora dos dias/horários semanais da turma.

Regras:

- pode ser criada na hora ou agendada para o futuro;
- pertence a uma turma;
- aparece para alunos vinculados à turma;
- pode ter duração própria ou usar a duração padrão da turma;
- conta normalmente para frequência e elegibilidade quando válida;
- pode ser cancelada sem apagar.

### Cancelamento de aula

Aplica-se a aula avulsa ou ocorrência recorrente prevista.

Regras:

- aparece como cancelada para aluno e instrutor;
- não some da agenda;
- não exige motivo;
- gera indicador interno para o aluno;
- pode ser revertido;
- aula cancelada precisa ser reativada antes de iniciar chamada;
- reversão não exige motivo.

### Presença

Presença pode ser criada por QR Code ou manualmente pelo instrutor.

QR Code:

- exibido pelo instrutor durante aula ativa;
- rotativo a cada 30 segundos;
- aceita tolerância curta para código anterior;
- não exige geolocalização na V0;
- válido durante toda a aula e até 15 minutos após o fim calculado a partir do início real;
- fecha imediatamente se o instrutor encerrar a aula manualmente.

Confirmação por aluno:

- aluno precisa estar logado;
- só pode confirmar quando QR estiver ativo;
- não existe RSVP ou confirmação antecipada.

Presença manual:

- instrutor pode lançar quando aluno não consegue usar QR;
- deve ficar distinguível de presença por QR;
- pode ser lançada após encerramento da aula.

Presença fora da turma:

- aluno pode confirmar presença em turma à qual não está vinculado;
- presença fica marcada como fora da turma;
- conta normalmente para frequência/elegibilidade quando válida;
- aparece como informação/filtro, não como alerta principal.

Presença invalidada:

- instrutor pode invalidar presença por erro ou fraude;
- não apaga o registro;
- exige motivo obrigatório;
- motivo é visível apenas ao instrutor;
- aluno vê status invalidada;
- não conta para frequência nem elegibilidade.

### Graduação e evolução

A V0 é focada em Brazilian Jiu-Jitsu.

Deve suportar:

- faixas adultas;
- faixas infantis;
- graus;
- transição infantil-adulto por idade configurável;
- defaults de regras inspirados na IBJJF;
- regras editáveis de tempo e presenças.

Evolução:

- aluno tem graduação atual;
- aluno tem histórico formal de promoções;
- promoção pode alterar grau, faixa ou ambos;
- ao trocar de faixa, grau reinicia em 0 por padrão, mas instrutor pode ajustar.

Promoção de graduação registra:

- data;
- graduação anterior;
- nova graduação;
- instrutor responsável;
- observação opcional visível ao aluno.

Elegibilidade de graduação:

- é interna do instrutor;
- baseada em tempo e presenças válidas;
- presenças fora da turma contam;
- presenças invalidadas não contam;
- separa elegível para grau e elegível para faixa;
- sugere, mas nunca promove automaticamente;
- instrutor pode adiar sugestão;
- adiamento padrão: 30 dias;
- motivo do adiamento é opcional.

Aluno vê promoção quando acontece, mas não vê elegibilidade antes da decisão do instrutor.

### Mensalidades

Mensalidade é cobrança mensal única por aluno e mês de referência.

Dados/regras:

- uma mensalidade por aluno por mês de referência;
- mês de referência é separado da data de vencimento;
- padrão: mês de referência igual ao mês do vencimento;
- valor é individual por aluno;
- não existem planos/pacotes na V0;
- sem pagamento parcial;
- sem recibo gerado pelo app;
- sem integração bancária;
- sem conciliação automática;
- pagamento aceito na V0: Pix.

Geração automática:

- rotina diária gera mensalidades de alunos ativos;
- mensalidade é gerada 5 dias antes do vencimento por padrão;
- prazo de 5 dias é fixo na V0;
- se aluno é cadastrado no meio do mês e o vencimento ainda não passou, pode gerar a mensalidade do mês atual;
- se o vencimento já passou, instrutor resolve manualmente ou começa no próximo ciclo;
- aluno inativo não gera mensalidades futuras.

Criação manual:

- instrutor pode criar mensalidade manual excepcional;
- não deve ser usada para taxas avulsas/produtos;
- serve para correção, migração ou cadastro após vencimento.

Status financeiro:

- em aberto;
- em verificação;
- paga;
- atrasada;
- dispensada.

Regras de status:

- mensalidade em aberto vira atrasada no dia seguinte ao vencimento;
- não há tolerância extra;
- mensalidade em verificação não aparece como atrasada;
- se verificação é rejeitada depois do vencimento, volta para atrasada;
- instrutor pode marcar pagamento manual;
- aluno vê apenas status paga, não a origem manual.

Ajuste de mensalidade:

- permite alterar valor de uma mensalidade específica;
- exige motivo obrigatório;
- motivo é visível apenas ao instrutor;
- aluno vê valor final ajustado;
- não afeta valor individual futuro do aluno.

Mensalidade dispensada:

- cancela/abona uma mensalidade;
- exige motivo obrigatório;
- motivo é visível apenas ao instrutor;
- aluno vê status dispensada;
- não conta como inadimplência;
- não é tratada como paga.

Mudança no valor individual do aluno:

- afeta apenas mensalidades futuras por padrão;
- mensalidade específica pode ser ajustada separadamente.

### Pix e verificação de pagamento

A academia configura Pix da Academia:

- chave Pix simples; ou
- payload Pix copia-e-cola.

Na V0, o app só exibe o Pix cadastrado. Não gera Pix dinâmico por mensalidade.

Fluxo do aluno:

1. aluno visualiza mensalidade;
2. aluno usa Pix da Academia para pagar fora do app;
3. aluno envia comprovante Pix obrigatório;
4. mensalidade fica em verificação;
5. aluno não pode reenviar enquanto pendente;
6. se rejeitada, pode enviar novo comprovante.

Comprovante Pix:

- formatos: imagem ou PDF;
- limite: 10 MB;
- preservado no histórico financeiro após aprovação ou rejeição;
- aluno pode visualizar o próprio comprovante enviado;
- instrutor pode visualizar e baixar.

Verificação pelo instrutor:

- fila de pagamentos em verificação no painel;
- instrutor aprova ou rejeita;
- aprovação transforma mensalidade em paga;
- rejeição exige motivo obrigatório visível ao aluno;
- novas tentativas são permitidas após rejeição.

Pagamento manual:

- instrutor pode marcar mensalidade como paga sem comprovante;
- observação opcional;
- observação visível apenas ao instrutor;
- para o aluno aparece apenas como paga.

### Anotações do aluno

Instrutor pode criar notas livres no perfil do aluno.

Regras:

- texto livre;
- sem anexos;
- data e autor;
- visível ao aluno por padrão;
- instrutor pode tornar privada;
- aluno não comenta nem responde;
- instrutor pode editar;
- instrutor pode arquivar;
- sem histórico de versões na V0;
- aluno recebe indicador interno de nova anotação visível.

### Importação e exportação CSV

Importação:

- CSV simples de alunos;
- cria alunos sem acesso ao app;
- instrutor envia convites depois;
- não importa histórico antigo de presenças, graduações ou mensalidades;
- campos mínimos: nome, data de nascimento, data de matrícula/status quando disponível;
- campos opcionais: email, telefone, faixa/grau, mensalidade, turma;
- valida duplicidade por nome + data de nascimento;
- alerta se email já existir.

Exportação:

- exportação CSV básica de alunos;
- exportação CSV básica de presenças;
- exportação CSV básica de mensalidades.

### Painel do instrutor

O painel principal da V0 deve mostrar:

1. aulas de hoje;
2. pagamentos em verificação;
3. mensalidades atrasadas;
4. alunos elegíveis para grau/faixa;
5. convites pendentes/expirados.

Presenças fora da turma devem estar disponíveis como filtro/informação, não como alerta principal.

### Listas e filtros obrigatórios

- alunos por status, turma e faixa;
- presenças por período, turma e aluno;
- mensalidades por status, vencimento e aluno;
- alunos elegíveis para grau/faixa.

Gráficos ficam fora da V0.

### Indicadores internos do aluno

Sem push, email, SMS ou WhatsApp automático na V0.

Indicadores internos obrigatórios:

- comprovante aprovado/rejeitado;
- mensalidade em aberto/atrasada;
- nova anotação visível;
- nova promoção de graduação;
- aula cancelada.

Indicadores de promoção/anotação limpam automaticamente ao abrir/ver o detalhe.

## Fora de escopo da V0

- app nativo publicado em loja;
- modo offline;
- geolocalização para presença;
- notificações push;
- envio integrado de WhatsApp/SMS/email;
- pagamentos integrados;
- Pix dinâmico gerado pelo app;
- conciliação bancária automática;
- cartão/boleto;
- recibo formal emitido pelo app;
- pagamento parcial;
- planos/pacotes;
- produtos, taxas avulsas ou marketplace;
- multiunidade/franquia;
- múltiplos instrutores/equipe;
- permissões granulares;
- portal do responsável;
- página pública da academia;
- ficha de saúde/emergência;
- visitantes/aula experimental;
- competições;
- checklist técnico/currículo detalhado;
- comunidade/social/gamificação;
- gráficos/dashboard analítico;
- importação de histórico antigo.

## Critério de sucesso da V0

A V0 está pronta para piloto quando uma academia consegue operar por uma semana sem planilha para os fluxos centrais:

- cadastrar alunos/turmas;
- iniciar aulas;
- registrar presença por QR e manualmente;
- corrigir/invalidar presenças;
- acompanhar graduação/elegibilidade;
- gerar e acompanhar mensalidades;
- receber e verificar comprovantes Pix;
- dar acesso básico aos alunos.

## Roadmap pós-V0

### Fase 1 — Robustez operacional

- relatórios e filtros melhores;
- correções de presença mais refinadas;
- histórico operacional mais claro;
- melhorias no painel;
- melhorias de UX da PWA;
- ajustes a partir do piloto real.

### Fase 2 — Pagamentos integrados

- Pix dinâmico;
- possível integração bancária/gateway;
- conciliação automática;
- recibos, se necessário;
- lembretes financeiros, se fizer sentido.

### Fase 3+ — Expansões futuras

- multi-instrutor/equipe;
- permissões granulares;
- responsável com acesso próprio;
- comunicação automática;
- currículo/checklist técnico;
- competições;
- multiunidade/franquias;
- app nativo, se validado.

## ADRs relacionados

- `docs/adr/0001-pwa-online-first.md`
- `docs/adr/0002-manual-pix-verification.md`
- `docs/adr/0003-rotating-qr-attendance.md`
- `docs/adr/0004-single-academy-solo-instructor-v0.md`
- `docs/adr/0005-academy-tenant-isolation.md`
