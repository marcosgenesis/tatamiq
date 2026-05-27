# Gestão de Alunos de Artes Marciais

Sistema para apoiar a operação diária de uma academia/tatame pequeno de artes marciais, inicialmente focado no dono ou instrutor principal.

## Language

**Academia**:
Organização local que usa o app para gerir alunos, turmas, aulas, presenças, evolução e mensalidades, com nome, logo, endereço, telefone/WhatsApp e Instagram personalizáveis na V0.
_Avoid_: equipe, filial, federação, organization como termo de UI/domínio

**Dono/Instrutor Solo**:
Pessoa responsável por administrar e conduzir a maior parte da operação da **Academia**; na V0, todo cadastro público cria esse tipo de conta.
_Avoid_: administrador genérico, operador, gestor como papel separado

**Acesso do Aluno**:
Capacidade do **Aluno**, inclusive menor de idade quando convidado pelo instrutor, consultar as próximas aulas dos próximos 7 dias das suas turmas, as próprias presenças e mensalidades dos últimos 12 meses, evolução e turmas vinculadas, e alterar contato pessoal e foto, sem administrar a academia/tatame; nasce somente a partir de um **Convite do Aluno** para uma ficha de **Aluno** já existente, pode coexistir com acesso de instrutor na mesma conta com escolha explícita de área ao entrar, pode ser revogado pelo instrutor sem inativar o aluno ou apagar a conta de autenticação, e alterações de telefone e email mantêm auditoria simples.
_Avoid_: portal completo, conta administrativa, autovínculo por email

**Onboarding da Academia**:
Etapa inicial em que um **Dono/Instrutor Solo** autenticado, mas ainda sem **Academia**, informa o nome obrigatório da organização local que irá gerir.
_Avoid_: app demo, academia implícita, tenant padrão, perfil completo obrigatório

**Convite do Aluno**:
Link completo que o instrutor copia e envia por fora para vincular uma conta de acesso ao cadastro de um **Aluno** existente, expirando em 7 dias; reenviar convite na V0 significa invalidar qualquer convite pendente anterior para aquele aluno e criar um novo link com nova expiração de 7 dias, desde que ainda não exista **Acesso do Aluno** ativo para aquela ficha; quando já existe acesso ativo, o instrutor precisa revogar o acesso antes de recriar convite.
_Avoid_: cadastro livre, conta solta, envio integrado obrigatório, múltiplos acessos ativos para o mesmo aluno, código curto digitado pelo aluno na V0, reutilizar link pendente antigo ao reenviar

**Aceite do Aluno**:
Registro do aceite simples de uso do app no primeiro acesso do **Aluno**, inclusive menor de idade quando convidado pelo instrutor, feito depois de autenticar a conta e antes de ativar o **Acesso do Aluno**, necessário por envolver dados pessoais, foto e comprovante Pix; a versão inicial do termo é `student-access-v1` e cobre consulta da própria ficha, confirmação de presença por QR, envio de foto e comprovante Pix, recebimento de informações internas da academia e solicitação de correções diretamente à academia/instrutor.
_Avoid_: contrato jurídico complexo, consentimento implícito, aceite anônimo antes do login

**Confirmação de Presença**:
Ação do **Aluno** para registrar a própria **Presença** em uma **Aula** usando um QR Code dinâmico exibido pelo instrutor.
_Avoid_: chamada manual do aluno, check-in livre

**QR Code Dinâmico da Aula**:
Código temporário e rotativo vinculado a uma **Aula**, exibido pelo instrutor para reduzir fraude na **Confirmação de Presença**, renovado a cada 30 segundos, válido durante toda a aula e por 15 minutos após o fim calculado a partir do início real da aula, ou até o encerramento manual pelo instrutor, com tolerância curta para o código anterior e sem exigir geolocalização na V0.
_Avoid_: link fixo, código permanente, geolocalização obrigatória

**Aluno**:
Pessoa matriculada ou em acompanhamento pela academia/tatame, com nome, data de nascimento, data de matrícula e estado ativo ou inativo obrigatórios.
_Avoid_: cliente, usuário, membro

**Aluno Ativo**:
**Aluno** que aparece nas chamadas e no controle de mensalidades.
_Avoid_: membro ativo, usuário ativo

**Aluno Inativo**:
**Aluno** mantido no histórico, removido de chamadas e da geração de mensalidades futuras, preservando mensalidades já existentes e acesso somente leitura por 12 meses; nesse período pode consultar histórico e dados visíveis, mas não confirma presença por QR, não envia comprovante Pix, não altera contato/foto e não executa ações operacionais de aluno; ao ser reativado, preserva o histórico e retoma a geração de mensalidades futuras.
_Avoid_: deletado, cancelado, excluído

**Aula**:
Ocorrência concreta de treino criada quando o instrutor inicia a chamada de uma **Turma**, registrando o horário real de início e mantendo referência ao horário previsto para calcular o fim previsto com a duração padrão da turma; pode ser encerrada manualmente pelo instrutor.
_Avoid_: turma, sessão genérica, aula prevista

**Aula Avulsa**:
**Aula** criada ou agendada fora dos dias/horários semanais configurados da **Turma**, podendo ter duração própria ou usar a duração padrão da turma, podendo ser cancelada sem apagar, e contando normalmente para frequência e elegibilidade quando válida.
_Avoid_: reposição automática, turma extra

**Cancelamento de Aula**:
Marcação de uma aula avulsa ou ocorrência recorrente prevista como cancelada, sem motivo obrigatório, visível ao aluno sem apagar a ocorrência da agenda.
_Avoid_: exclusão de aula, sumiço da agenda

**Presença**:
Registro de que um **Aluno** participou de uma **Aula**, criado por QR Code ou lançado manualmente pelo instrutor.
_Avoid_: check-in genérico, comparecimento

**Presença Manual**:
**Presença** lançada pelo instrutor quando o **Aluno** não consegue usar o QR Code, inclusive após o encerramento manual da aula.
_Avoid_: ajuste invisível, presença sem origem

**Presença Fora da Turma**:
**Presença** registrada em uma **Aula** de uma **Turma** à qual o **Aluno** não está vinculado.
_Avoid_: presença inválida, erro de turma

**Presença Invalidada**:
**Presença** marcada pelo instrutor como inválida por erro ou fraude, com motivo obrigatório visível apenas ao instrutor, visível ao aluno como invalidada, preservada no histórico mas excluída de frequência e elegibilidade.
_Avoid_: presença deletada, remoção sem histórico

**Evolução**:
Progresso marcial observável de um **Aluno**, inicialmente expresso por **Faixa** e **Grau**.
_Avoid_: performance, analytics

**Faixa**:
Graduação principal de um **Aluno** dentro da hierarquia da arte marcial praticada, modelada como tabela `belts` por academia (com `organizationId`) contendo nome, slug, caminho (adulto/infantil), posição na hierarquia, máximo de graus e regras de elegibilidade editáveis (tempo mínimo e presenças mínimas para próximo grau e próxima faixa); seed no onboarding popula defaults IBJJF; aluno referencia faixa atual via FK `currentBeltId`.
_Avoid_: nível, rank, enum hardcoded

**Grau**:
Incremento dentro de uma **Faixa**, usado para indicar progressão antes da próxima faixa; ao trocar de **Faixa**, reinicia em 0 por padrão, com ajuste permitido pelo instrutor.
_Avoid_: subnível, estrela

**Promoção de Graduação**:
Registro formal de mudança de **Faixa**, de **Grau**, ou de ambos em tabela `promotions`, incluindo `previousBeltId`, `previousDegree`, `newBeltId`, `newDegree`, data, instrutor responsável e observação opcional visível ao aluno; cadastro inicial do aluno não gera promoção — estado inicial é setado direto no aluno; promoção é o único caminho pra alterar graduação do aluno após cadastro; ao trocar de faixa, grau pré-preenchido como 0 mas editável pelo instrutor; sem restrição de retrocesso (instrutor pode corrigir erros); acessível via tela `/graduation` e pelo perfil do aluno.
_Avoid_: atualização simples de faixa, edição sem histórico, promoção inicial no cadastro

**Elegibilidade de Graduação**:
Sinal interno para o instrutor, calculado a partir de regras editáveis na tabela `belts` (`minMonthsForNextDegree`, `minAttendancesForNextDegree`, `minMonthsForNextBelt`, `minAttendancesForNextBelt`) com defaults IBJJF (30 presenças/grau, proporcional pra faixa); tempo e presenças contados desde `lastPromotion.promotedAt` ou `student.enrollmentDate` quando sem promoção anterior; presenças fora da turma contam, invalidadas não; separado entre grau e faixa — se `currentDegree >= belt.maxDegrees`, elegibilidade de grau desaparece e só resta faixa; adiamento por 30 dias (default) via colunas no aluno (`degreeEligibilityDismissedUntil`, `beltEligibilityDismissedUntil`), motivo opcional; visível no dashboard (card) e tela `/graduation` com filtros, nunca visível ao aluno.
_Avoid_: promoção automática, aprovação automática

**Turma**:
Grupo recorrente de treino dentro da mesma modalidade, normalmente separado por horário, idade ou nível, com dias/horários semanais, duração padrão e etiquetas opcionais configuradas; pode ser arquivada sem apagar histórico.
_Avoid_: classe, aula avulsa, modalidade

**Etiqueta de Turma**:
Marcador livre opcional usado para classificar uma **Turma**, como infantil, adulto, feminino, competição, iniciante ou avançado.
_Avoid_: tipo rígido de turma, modalidade

**Modalidade**:
Arte marcial praticada pela academia/tatame; no MVP a modalidade principal é Brazilian Jiu-Jitsu, compartilhada por todas as **Turmas**.
_Avoid_: turma, plano

**Brazilian Jiu-Jitsu**:
Modalidade inicial do produto, usada como padrão para regras de faixa, grau e elegibilidade de graduação adulta e infantil.
_Avoid_: arte marcial genérica, BJJ sem regras próprias

**Faixa Infantil**:
Graduação de Brazilian Jiu-Jitsu para alunos abaixo da idade adulta, distinta da sequência adulta.
_Avoid_: faixa adulta adaptada, nível infantil genérico

**Faixa Adulta**:
Graduação de Brazilian Jiu-Jitsu para alunos adultos, distinta da sequência infantil.
_Avoid_: faixa única, nível adulto genérico

**Transição Infantil-Adulto**:
Mudança do caminho de graduação infantil para o adulto ao atingir `childToAdultAge` (int, default 16) configurado na `organization`; sistema sinaliza via mesmo mecanismo de elegibilidade (aparece na tela `/graduation` como tipo "transição"), mas nunca muda faixa automaticamente; instrutor promove pra faixa adulta adequada via promoção normal; adiamento via `transitionDismissedUntil` (date, nullable) no aluno.
_Avoid_: conversão automática de faixa, promoção por idade

**Mensalidade**:
Cobrança recorrente mensal única por aluno e mês de referência (`referenceYear` + `referenceMonth`), gerada por rotina automática diária (cron + catch-up no dashboard) para um **Aluno Ativo** 5 dias antes do vencimento, ou criada manualmente pelo instrutor para casos excepcionais (mês passado, migração), com valor snapshot do aluno no momento da geração e data de vencimento persistida (clamp ao último dia do mês quando necessário); unique constraint `(student_id, reference_year, reference_month)` garante uma por aluno/mês; mudanças no valor individual ou dia de vencimento do aluno afetam apenas mensalidades futuras.
_Avoid_: assinatura, invoice, pagamento, plano, taxa avulsa, produto

**Pix da Academia**:
Chave Pix simples ou payload Pix copia-e-cola da **Academia** exibido ao aluno para pagamento manual de mensalidades na V0.
_Avoid_: integração bancária, conciliação automática

**Comprovante Pix**:
Arquivo de imagem ou PDF de até 10 MB enviado pelo **Aluno** via presigned URL direto ao R2 para solicitar verificação de pagamento de uma **Mensalidade**, podendo incluir observação opcional por comprovante para o instrutor, preservado no histórico financeiro após aprovação, rejeição ou substituição; pode ser enviado mesmo sem **Pix da Academia** configurado quando a orientação de pagamento foi passada por fora pelo instrutor; múltiplos comprovantes possíveis por mensalidade, inclusive substituição pelo aluno enquanto ainda está pendente de verificação e nova tentativa após rejeição, mas aluno vê apenas o último relevante; rejeição tem motivo obrigatório inline no registro do comprovante, visível ao aluno.
_Avoid_: confirmação automática, recibo emitido pelo app, upload via proxy do backend

**Verificação de Pagamento**:
Análise manual feita pelo instrutor sobre um **Comprovante Pix** obrigatório, aprovando a **Mensalidade** como paga ou rejeitando a solicitação com motivo obrigatório visível ao aluno; rejeição volta status pra `open` (atrasada calculada se vencimento passou); nova tentativa permitida após rejeição; fila de verificação acessível no dashboard (card) e via filtro `under_review` na listagem de mensalidades.
_Avoid_: conciliação bancária, pagamento automático

**Pagamento Manual**:
Marcação de uma **Mensalidade** como paga diretamente pelo instrutor, sem **Comprovante Pix** enviado pelo aluno, com observação opcional visível apenas ao instrutor.
_Avoid_: pagamento verificado, conciliação automática

**Status Financeiro do Mês**:
Situação visível para instrutor e aluno sobre a **Mensalidade** em um mês específico; quatro status persistidos (`open`, `under_review`, `paid`, `waived`) e um calculado (`overdue` = `open` com vencimento passado, usando timezone `America/Sao_Paulo` na V0); uma mensalidade em verificação não é exibida como atrasada até ser rejeitada (ver ADR 0009).
_Avoid_: estado da assinatura, score financeiro, status overdue persistido

**Ajuste de Mensalidade**:
Alteração pontual do valor de uma **Mensalidade** específica, registrada como evento em `monthly_fee_events` com motivo obrigatório visível apenas ao instrutor; `originalAmountInCents` preservado na mensalidade, `amountInCents` atualizado pro valor efetivo; sem afetar o valor individual futuro do **Aluno**.
_Avoid_: mudança de plano, alteração retroativa geral

**Evento de Mensalidade**:
Registro de auditoria em tabela `monthly_fee_events` para ações sobre uma **Mensalidade**: dispensa, ajuste, aprovação/rejeição de comprovante, substituição de comprovante e pagamento manual; cada evento registra tipo, motivo quando aplicável, metadata, autor e timestamp; origem do pagamento é derivada dos eventos, não persistida na mensalidade.
_Avoid_: status da mensalidade, substituição do status persistido

**Mensalidade Dispensada**:
**Mensalidade** cancelada ou abonada pelo instrutor com motivo obrigatório visível apenas ao instrutor, sem ser tratada como paga.
_Avoid_: paga sem pagamento, exclusão de cobrança

**Responsável**:
Pessoa de contato e eventual pagador associado a um **Aluno**, obrigatório quando o aluno é menor de idade, sem acesso próprio ao app na V0.
_Avoid_: conta, usuário pai, cliente

**Anotação do Aluno**:
Nota livre criada pelo instrutor no perfil de um **Aluno**, com data e autor, editável e arquivável pelo instrutor sem histórico de versões na V0, visível ao aluno por padrão, com opção do instrutor tornar privada.
_Avoid_: tarefa, lembrete, prontuário, workflow, comentário do aluno, exclusão sem rastro

## Relationships

- O cadastro público da V0 cria sempre um **Dono/Instrutor Solo**
- Um **Dono/Instrutor Solo** sem **Academia** acessa apenas o **Onboarding da Academia**
- Uma **Academia** tem um **Dono/Instrutor Solo** no MVP
- Uma **Academia** tem muitos **Alunos**
- Uma **Academia** pode ter um **Pix da Academia** para orientar pagamentos de mensalidades
- Uma **Mensalidade** pode ter múltiplos **Comprovantes Pix** (rejeição → nova tentativa)
- Uma **Verificação de Pagamento** aprovada transforma a **Mensalidade** em paga
- Um **Pagamento Manual** transforma a **Mensalidade** em paga sem exigir **Comprovante Pix**
- Uma **Mensalidade** pode ter muitos **Eventos de Mensalidade** (auditoria)
- Um **Ajuste de Mensalidade** preserva `originalAmountInCents` e registra **Evento de Mensalidade**
- Um **Dono/Instrutor Solo** acompanha muitos **Alunos**
- Um **Aluno** pode ter **Acesso do Aluno** para consultar os próprios dados, incluindo mensalidades mesmo quando for menor de idade
- Um **Acesso do Aluno** vincula exatamente uma conta de autenticação a exatamente um **Aluno** na V0
- Uma conta com acesso de instrutor e **Acesso do Aluno** escolhe explicitamente a área ao entrar e pode trocar de área sem mudar os vínculos de domínio
- Um **Convite do Aluno** pertence a um **Aluno** já cadastrado
- O **Acesso do Aluno** exige **Aceite do Aluno** no primeiro acesso
- Uma **Turma** gera muitas **Aulas**
- Uma **Aula Avulsa** pertence a uma **Turma**, mas ocorre fora da agenda semanal configurada
- Um **Cancelamento de Aula** pode se aplicar a uma **Aula Avulsa** ou a uma ocorrência recorrente prevista de uma **Turma**
- Um **Aluno** tem muitas **Presenças**
- Uma **Presença** pertence a exatamente uma **Aula** e um **Aluno**
- Uma **Confirmação de Presença** cria uma **Presença** para uma **Aula**
- Uma **Presença Manual** pertence a uma **Aula** e deve ser distinguível de uma presença por QR Code
- Uma **Presença Fora da Turma** é permitida e deve ser distinguível de uma presença em turma vinculada
- Uma **Presença Invalidada** permanece no histórico, mas não conta para frequência nem **Elegibilidade de Graduação**
- Um **QR Code Dinâmico da Aula** pertence a uma única **Aula**
- Um **Aluno** tem uma **Evolução** acompanhada ao longo do tempo
- A **Evolução** de um **Aluno** é expressa por uma **Faixa** (FK `currentBeltId` → `belts`) e um **Grau** (`currentDegree`)
- Uma **Faixa** pertence a uma **Academia** e ao caminho adulto ou infantil
- Uma **Academia** tem muitas **Faixas**, populadas via seed IBJJF no onboarding
- A **Transição Infantil-Adulto** sinaliza via mecanismo de elegibilidade mas não muda a **Faixa** automaticamente
- A **Evolução** de um **Aluno** é composta por uma graduação atual e um histórico de **Promoções de Graduação**
- Uma **Promoção de Graduação** é o único caminho pra alterar graduação após cadastro
- A **Elegibilidade de Graduação** é calculada a partir de regras na **Faixa** atual do aluno
- A **Elegibilidade de Graduação** pode sugerir uma promoção, mas o instrutor decide e registra uma **Promoção de Graduação**
- Um **Aluno** pode ter adiamentos ativos de elegibilidade (grau, faixa, transição) independentes entre si
- Uma **Modalidade** contém muitas **Turmas**
- Uma **Turma** pertence a uma única **Modalidade** no MVP
- Um **Aluno** pode pertencer a muitas **Turmas**
- Uma **Turma** pode ter muitos **Alunos**
- Um **Aluno Ativo** gera **Mensalidades** automaticamente a cada mês
- Um **Aluno** pode ter muitas **Mensalidades**
- Um **Ajuste de Mensalidade** afeta apenas uma **Mensalidade** específica
- Uma **Mensalidade Dispensada** permanece no histórico financeiro e não é considerada inadimplência
- Um **Aluno** pode ter muitas **Anotações do Aluno**
- Um **Aluno** pode ter no máximo um **Responsável** no MVP
- Um **Responsável** pode estar associado a muitos **Alunos**, mas a cobrança do MVP continua por **Aluno**

## Example dialogue

> **Dev:** "O primeiro fluxo deve atender a recepção, o financeiro ou o professor?"
> **Domain expert:** "Primeiro o **Dono/Instrutor Solo**, que precisa acompanhar seus **Alunos** sem depender de uma equipe administrativa."

## Flagged ambiguities

- "gestão de alunos" foi delimitada inicialmente como **Presença**, **Evolução** e **Mensalidade**; cadastro e comunicação ficam como suporte, não como foco principal.
- "academia", "equipe" e "federação" são conceitos distintos; o MVP modela apenas a **Academia** usuária do app.
- "modalidade" e "turma" são conceitos distintos: a modalidade é a arte marcial; a turma é um grupo recorrente dentro dela.
- "aluno" pode significar pessoa matriculada ou usuário que acessa o sistema; resolvido como **Aluno** para a pessoa e **Acesso do Aluno** para a capacidade de entrar no app.
- "gestor" pode aparecer como linguagem informal na UI, mas não é um papel separado; no domínio, significa **Dono/Instrutor Solo**.
- Ficha de saúde e contato de emergência ficam fora da V0, apesar de serem comuns em academias.
- Aluno menor pode aceitar o uso do app na V0; a autorização do responsável fica como responsabilidade operacional da academia/instrutor, pois responsável não tem acesso próprio.
