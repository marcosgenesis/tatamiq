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
Capacidade do **Aluno**, inclusive menor de idade quando convidado pelo instrutor, consultar as próximas aulas dos próximos 7 dias das suas turmas, as próprias presenças e mensalidades dos últimos 12 meses, evolução e turmas vinculadas, e alterar contato pessoal e foto, sem administrar a academia/tatame; pode ser revogado pelo instrutor sem inativar o aluno, e alterações de telefone e email mantêm auditoria simples.
_Avoid_: portal completo, conta administrativa

**Onboarding da Academia**:
Etapa inicial em que um **Dono/Instrutor Solo** autenticado, mas ainda sem **Academia**, informa o nome obrigatório da organização local que irá gerir.
_Avoid_: app demo, academia implícita, tenant padrão, perfil completo obrigatório

**Convite do Aluno**:
Link ou código que o instrutor copia e envia por fora para vincular uma conta de acesso ao cadastro de um **Aluno** existente, expirando em 7 dias e podendo ser reenviado.
_Avoid_: cadastro livre, conta solta, envio integrado obrigatório

**Aceite do Aluno**:
Registro do aceite simples de uso do app no primeiro acesso do **Aluno**, inclusive menor de idade quando convidado pelo instrutor, necessário por envolver dados pessoais, foto e comprovante Pix.
_Avoid_: contrato jurídico complexo, consentimento implícito

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
**Aluno** mantido no histórico, removido de chamadas e da geração de mensalidades futuras, preservando mensalidades já existentes e acesso somente leitura por 12 meses; ao ser reativado, preserva o histórico e retoma a geração de mensalidades futuras.
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
Graduação principal de um **Aluno** dentro da hierarquia da arte marcial praticada.
_Avoid_: nível, rank

**Grau**:
Incremento dentro de uma **Faixa**, usado para indicar progressão antes da próxima faixa; ao trocar de **Faixa**, reinicia em 0 por padrão, com ajuste permitido pelo instrutor.
_Avoid_: subnível, estrela

**Promoção de Graduação**:
Registro formal de mudança de **Faixa**, de **Grau**, ou de ambos, incluindo data, graduação anterior, nova graduação, instrutor responsável e observação opcional visível ao aluno.
_Avoid_: atualização simples de faixa, edição sem histórico

**Elegibilidade de Graduação**:
Sinal interno para o instrutor, baseado em regras editáveis de tempo e presenças válidas, incluindo presenças fora da turma, com defaults inspirados na IBJJF para Brazilian Jiu-Jitsu, separado entre grau e faixa e podendo ser adiado pelo instrutor por padrão por 30 dias, sem substituir a decisão do instrutor.
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
Mudança do caminho de graduação infantil para o adulto ao atingir uma idade configurável, com decisão final de faixa feita pelo instrutor.
_Avoid_: conversão automática de faixa, promoção por idade

**Mensalidade**:
Cobrança recorrente mensal única por aluno e mês de referência, gerada por rotina automática diária para um **Aluno Ativo** alguns dias antes do vencimento, com padrão de 5 dias, ou criada manualmente pelo instrutor para casos excepcionais, com valor individual do aluno, dia de vencimento, pagamento por Pix exibido ao aluno e verificação manual pelo instrutor na V0, sem pagamento parcial, e status financeiro do mês; mudanças no valor individual afetam apenas mensalidades futuras por padrão.
_Avoid_: assinatura, invoice, pagamento, plano, taxa avulsa, produto

**Pix da Academia**:
Chave Pix simples ou payload Pix copia-e-cola da **Academia** exibido ao aluno para pagamento manual de mensalidades na V0.
_Avoid_: integração bancária, conciliação automática

**Comprovante Pix**:
Arquivo de imagem ou PDF de até 10 MB enviado pelo **Aluno** para solicitar verificação de pagamento de uma **Mensalidade**, preservado no histórico financeiro após aprovação ou rejeição.
_Avoid_: confirmação automática, recibo emitido pelo app

**Verificação de Pagamento**:
Análise manual feita pelo instrutor sobre um **Comprovante Pix** obrigatório, aprovando a **Mensalidade** como paga ou rejeitando a solicitação com motivo obrigatório visível ao aluno; uma mensalidade pode ter novas tentativas após rejeição.
_Avoid_: conciliação bancária, pagamento automático

**Pagamento Manual**:
Marcação de uma **Mensalidade** como paga diretamente pelo instrutor, sem **Comprovante Pix** enviado pelo aluno, com observação opcional visível apenas ao instrutor.
_Avoid_: pagamento verificado, conciliação automática

**Status Financeiro do Mês**:
Situação visível para instrutor e aluno sobre a **Mensalidade** em um mês específico: em aberto, em verificação, paga, atrasada ou dispensada; uma mensalidade em aberto vira atrasada no dia seguinte ao vencimento, e uma mensalidade em verificação não é exibida como atrasada até ser rejeitada.
_Avoid_: estado da assinatura, score financeiro

**Ajuste de Mensalidade**:
Alteração pontual do valor de uma **Mensalidade** específica, com motivo obrigatório visível apenas ao instrutor, sem afetar o valor individual futuro do **Aluno**.
_Avoid_: mudança de plano, alteração retroativa geral

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
- Uma **Mensalidade** pode ter uma **Verificação de Pagamento** baseada em **Comprovante Pix**
- Uma **Verificação de Pagamento** aprovada transforma a **Mensalidade** em paga
- Um **Pagamento Manual** transforma a **Mensalidade** em paga sem exigir **Comprovante Pix**
- Um **Dono/Instrutor Solo** acompanha muitos **Alunos**
- Um **Aluno** pode ter **Acesso do Aluno** para consultar os próprios dados, incluindo mensalidades mesmo quando for menor de idade
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
- A **Evolução** de um **Aluno** é expressa por uma **Faixa** e, quando aplicável, um **Grau**
- Uma **Faixa** de Brazilian Jiu-Jitsu pertence ao caminho adulto ou ao caminho infantil
- A **Transição Infantil-Adulto** pode gerar alerta, mas não muda a **Faixa** automaticamente
- A **Evolução** de um **Aluno** é composta por uma graduação atual e um histórico de **Promoções de Graduação**
- A **Elegibilidade de Graduação** pode sugerir uma promoção, mas o instrutor decide e registra uma **Promoção de Graduação**
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
