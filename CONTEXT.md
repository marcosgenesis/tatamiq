# Gestão de Alunos de Artes Marciais

Sistema para apoiar a operação diária de uma academia/tatame pequeno de artes marciais, inicialmente focado no dono ou instrutor principal.

## Language

**Academia**:
Organização local que usa o app para gerir alunos, turmas, aulas, presenças, evolução e mensalidades, com nome, logo, endereço, telefone/WhatsApp e Instagram personalizáveis na V0.
_Avoid_: equipe, filial, federação, organization como termo de UI/domínio

**Dono/Instrutor Solo**:
Pessoa responsável por administrar e conduzir a maior parte da operação da **Academia**; na V0, todo cadastro público cria esse tipo de conta.
_Avoid_: administrador genérico, operador, gestor como papel separado

**Operador da Plataforma**:
Pessoa interna do Tatamiq autorizada a prestar suporte operacional a usuários e academias sem conhecer senhas nem acessar caixas de email; fora da primeira versão da administração interna.
_Avoid_: admin da academia, instrutor, suporte genérico, administrador sem contexto, papel obrigatório na V0

**Administrador da Plataforma**:
Pessoa interna do Tatamiq com permissão global para gerir usuários e academias da plataforma, incluindo impersonação, bloqueio, revogação de sessões, exclusão de usuários, alteração de papel global de administrador e ações destrutivas quando disponíveis; é o único papel interno ativo na primeira versão, e o bloqueio de um usuário não altera automaticamente academias ou dados operacionais associados.
_Avoid_: dono da academia, owner da academia, instrutor, admin da academia, super user como termo de domínio

**Auditoria Administrativa**:
Registro das ações sensíveis executadas por **Administradores da Plataforma** fora do **Suporte Assistido**, incluindo autor, alvo, ação, resultado, timestamp, motivo opcional e acessos a arquivos privados sensíveis, sem persistir payload completo na V1.
_Avoid_: log técnico bruto, payload completo, auditoria apenas de suporte, motivo obrigatório

**Exclusão de Usuário**:
Ação destrutiva executada por um **Administrador da Plataforma** sobre uma conta de autenticação, escolhendo explicitamente entre exclusão definitiva quando aceitável ou exclusão preservando histórico, que revoga sessões, remove credenciais quando possível, anonimiza nome, email e imagem da conta mantendo o ID para auditoria; quando o usuário é dono único de uma **Academia**, exige decidir entre manter a academia sem dono ou transferir a propriedade antes de concluir.
_Avoid_: remoção automática sem impacto, inativação de academia, apagar histórico por acidente, excluir academia junto na V1, anonimizar ficha de aluno operacional

**Suporte Assistido**:
Acesso temporário de até 1 hora e auditado em que um **Administrador da Plataforma** atua na plataforma com a perspectiva e permissões de um usuário não-administrador para diagnosticar ou resolver um problema reportado, com motivo opcional, indicador visível durante a sessão e registro de auditoria da sessão e das ações assistidas, sem armazenar payload completo na V1; permite executar as mesmas ações operacionais do usuário assistido, mas não ações globais de administração da plataforma dentro da sessão assistida.
_Avoid_: login pelo email do cliente, acesso à senha, acesso oculto, backdoor, impersonação silenciosa, permissão global disfarçada, impersonar administrador

**Administração da Plataforma**:
Área operacional separada da área da **Academia**, acessada pela rota `/platform` e usada por **Administradores da Plataforma** para gerir o Tatamiq sem serem membros das academias atendidas; na primeira versão cobre dashboard operacional simples, academias, usuários, administradores da plataforma, auditoria administrativa e auditoria de suporte assistido, permite visualizar dados operacionais completos das academias, tem edição direta limitada a dados básicos de provisionamento da academia e busca simples por nome, email ou slug.
_Avoid_: admin da academia, painel do instrutor, member role global, billing interno, relatório avançado, operação paralela de edição de dados da academia, filtros analíticos avançados, rota /admin

**Acesso do Aluno**:
Capacidade do **Aluno**, inclusive menor de idade quando convidado pelo instrutor, consultar as próximas aulas dos próximos 7 dias das suas turmas, as próprias presenças e mensalidades dos últimos 12 meses, evolução e turmas vinculadas, e alterar contato pessoal e foto, sem administrar a academia/tatame; nasce somente a partir de um **Convite do Aluno** para uma ficha de **Aluno** já existente, pode coexistir com acesso de instrutor na mesma conta com escolha explícita de área ao entrar, pode ser revogado pelo instrutor sem inativar o aluno ou apagar a conta de autenticação, e alterações de telefone e email mantêm auditoria simples.
_Avoid_: portal completo, conta administrativa, autovínculo por email

**Onboarding da Academia**:
Etapa inicial em que um **Dono/Instrutor Solo** autenticado, mas ainda sem **Academia**, informa o nome obrigatório da organização local que irá gerir.
_Avoid_: app demo, academia implícita, tenant padrão, perfil completo obrigatório

**Provisionamento de Academia**:
Criação de uma **Academia** por um **Administrador da Plataforma**, vinculando-a como propriedade de um email de futuro ou atual **Dono/Instrutor Solo** sem exigir acesso à caixa de email dele; quando a conta ainda não existe, cria uma **Conta Reservada** e um link para definição de senha no primeiro acesso com expiração de 7 dias.
_Avoid_: onboarding pelo suporte, academia demo, assumir senha do instrutor, convite de aluno, senha temporária

**Transferência de Academia**:
Mudança de propriedade operacional de uma **Academia** para outro email por decisão de um **Administrador da Plataforma**, reutilizando uma conta existente ou criando uma **Conta Reservada** com link de primeiro acesso de 7 dias quando necessário.
_Avoid_: convite de equipe, transferência automática por exclusão, compartilhar senha, mudar dono sem auditoria

**Conta Reservada**:
Conta de autenticação criada pelo sistema para um email conhecido, vinculada a um acesso futuro e sem login por senha até a definição de senha no primeiro acesso; pode ser usada para futuro **Dono/Instrutor Solo** ou futuro **Administrador da Plataforma**, seu link de primeiro acesso pode ser regenerado sem criar nova conta, e o envio inicial pode ocorrer por link copiável sem email automático obrigatório.
_Avoid_: senha temporária, conta fake, conta compartilhada, acesso pelo email do cliente, email automático obrigatório

**Convite do Aluno**:
Link completo que o instrutor copia e envia por fora para vincular uma conta de acesso ao cadastro de um **Aluno** existente, expirando em 7 dias; reenviar convite na V0 significa invalidar qualquer convite pendente anterior para aquele aluno e criar um novo link com nova expiração de 7 dias, desde que ainda não exista **Acesso do Aluno** ativo para aquela ficha; quando já existe acesso ativo, o instrutor precisa revogar o acesso antes de recriar convite.
_Avoid_: cadastro livre, conta solta, envio integrado obrigatório, múltiplos acessos ativos para o mesmo aluno, código curto digitado pelo aluno na V0, reutilizar link pendente antigo ao reenviar

**Link de Pré-Cadastro da Academia**:
Link compartilhável único e sem expiração automática por **Academia**, copiado para canais externos como grupo de WhatsApp, que pode ser pausado, reativado ou regenerado pelo instrutor, mostrando apenas dados públicos da academia, com proteção mínima por limite de tentativas por IP/email na V0, para interessados preencherem uma **Solicitação de Pré-Cadastro** sem virar **Aluno** automaticamente.
_Avoid_: convite do aluno, cadastro livre direto, matrícula automática, link de turma, link descartável por aluno, página pública com Pix ou dados internos, CAPTCHA obrigatório na V0

**Solicitação de Pré-Cadastro**:
Pedido criado por uma pessoa interessada a partir do **Link de Pré-Cadastro da Academia**, com estados em análise, aprovada ou rejeitada, contendo nome, data de nascimento, telefone/WhatsApp, email obrigatório não confirmado na V0, responsável quando menor e observação opcional, revisado pelo instrutor antes de virar ficha de **Aluno** e **Acesso do Aluno**; ao aprovar, o sistema cria automaticamente a conta/acesso para o email informado, mesmo sem confirmação prévia de posse do email na V0; para menor de idade, o email pode ser do aluno ou do responsável, mas será a conta que acessa a área do aluno após aprovação; enquanto em análise, fica somente leitura para o interessado; por **Academia**, não pode existir outra solicitação pendente ou aprovada com o mesmo email, nome e data de nascimento iguais a um **Aluno** existente sinalizam possível duplicidade que exige escolha explícita entre vincular ao aluno existente, criar novo aluno mesmo assim ou rejeitar como duplicado, uma solicitação rejeitada pode ser reenviada como nova tentativa, e a rejeição pode ter motivo opcional visível apenas ao instrutor.
_Avoid_: aluno pendente, conta solta, lead genérico, matrícula confirmada, ficha completa de aluno, motivo público obrigatório, conta de responsável na V0, edição de solicitação pendente, confirmação de email obrigatória na V0

**Link de Primeiro Acesso**:
Link copiável com expiração de 7 dias gerado quando uma **Solicitação de Pré-Cadastro** é aprovada para que o instrutor envie por fora, normalmente WhatsApp, permitindo que a conta criada automaticamente, ainda sem login por senha antes do primeiro acesso, defina senha e acesse a área do aluno pela primeira vez; quando o email já pertence a uma conta existente, o acesso é vinculado a essa conta e o link leva ao login/área do aluno sem redefinir senha; é distinto de **Convite do Aluno** no domínio, embora possa reutilizar infraestrutura técnica de token de ativação.
_Avoid_: senha temporária, email obrigatório de aprovação, convite do aluno para ficha pré-aprovada, duplicar conta por email

**Notificação de Pré-Cadastro**:
Email operacional opcional enviado via Resend no fluxo de pré-cadastro quando o instrutor escolhe enviar por email após aprovar uma solicitação, com fallback de log em desenvolvimento quando a chave de envio não estiver configurada, sem confirmar email no envio da solicitação, sem envio automático obrigatório na aprovação e sem expor motivo interno de rejeição na V0.
_Avoid_: comunicação promocional, motivo público de rejeição, chat integrado, confirmação de email obrigatória na V0, email automático obrigatório

**Consentimento de Pré-Cadastro**:
Confirmação simples dada pela pessoa interessada ao enviar uma **Solicitação de Pré-Cadastro**, autorizando a **Academia** a analisar os dados informados para decidir sobre o cadastro.
_Avoid_: aceite do aluno, contrato jurídico completo, autorização de uso do portal

**Aceite do Aluno**:
Registro do aceite simples de uso do app no primeiro acesso do **Aluno**, inclusive menor de idade quando convidado pelo instrutor ou aprovado por pré-cadastro, feito depois de autenticar a conta e antes de ativar o **Acesso do Aluno**, necessário por envolver dados pessoais, foto e comprovante Pix; a versão inicial do termo é `student-access-v1` e cobre consulta da própria ficha, confirmação de presença por QR, envio de foto e comprovante Pix, recebimento de informações internas da academia e solicitação de correções diretamente à academia/instrutor.
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
- Um **Operador da Plataforma** é um papel futuro, não ativo na primeira versão da administração interna
- Um **Administrador da Plataforma** não é membro da **Academia** por padrão; quando usa **Suporte Assistido**, sua atuação deve ser temporária, auditada e visivelmente indicada na interface
- Durante o **Suporte Assistido**, ações operacionais permitidas ao usuário assistido também são permitidas ao administrador, mas devem ser registradas como ações assistidas
- A auditoria de **Suporte Assistido** registra sessão, motivo opcional, participantes, academia quando aplicável, início/fim, IP/user agent e ações realizadas, sem persistir payload completo na V1
- **Suporte Assistido** não pode ser iniciado sobre outro **Administrador da Plataforma**
- A **Auditoria Administrativa** registra ações como provisionar academia, transferir academia, bloquear/desbloquear usuário, revogar sessões, excluir usuário e adicionar/remover administrador
- Um **Administrador da Plataforma** tem poder global fora do escopo de uma **Academia** e não deve ser confundido com o papel `owner` da academia
- A **Administração da Plataforma** fica fora da área normal da **Academia**, não depende de `activeOrganizationId`, na primeira versão é acessada por **Administradores da Plataforma** e é o destino padrão após login de uma conta com papel global de administrador
- Uma conta que combina papel de **Administrador da Plataforma** com vínculos próprios de academia ou aluno troca de área por seletor explícito; isso não é **Suporte Assistido**
- A **Administração da Plataforma** pode visualizar dados operacionais completos da **Academia**, incluindo arquivos privados sensíveis como fotos e **Comprovantes Pix**, preferencialmente reaproveitando telas operacionais em modo somente leitura, mas não edita diretamente alunos, turmas, mensalidades, presenças, Pix ou graduação; esse suporte ocorre por **Suporte Assistido**
- Acesso administrativo a arquivos privados sensíveis deve registrar **Auditoria Administrativa**
- Um **Administrador da Plataforma** pode realizar **Provisionamento de Academia** para um email de futuro ou atual **Dono/Instrutor Solo**
- O **Provisionamento de Academia** cria ou reutiliza uma conta pelo email informado, cria a **Academia**, vincula o dono como `owner` técnico e entrega um link de primeiro acesso para definição de senha quando necessário
- Um **Administrador da Plataforma** pode adicionar outro administrador por email, reutilizando uma conta existente ou criando uma **Conta Reservada** com link de primeiro acesso quando necessário
- Remover o papel de **Administrador da Plataforma** não exclui a conta nem remove acessos de academia ou aluno, mas deve revogar sessões por segurança e nunca pode remover o último administrador ativo
- A **Transferência de Academia** cria ou reutiliza uma conta pelo email informado, vincula o novo dono como `owner` técnico e entrega um link de primeiro acesso para definição de senha quando necessário
- Uma **Conta Reservada** não permite login por senha até que a pessoa defina senha no primeiro acesso
- Regenerar o link de primeiro acesso de uma **Conta Reservada** invalida o link anterior, cria nova expiração de 7 dias e registra **Auditoria Administrativa**
- Um **Dono/Instrutor Solo** sem **Academia** acessa apenas o **Onboarding da Academia**
- Uma **Academia** tem um **Dono/Instrutor Solo** no MVP, mas pode ficar temporariamente sem dono após **Exclusão de Usuário** decidida por um **Administrador da Plataforma**
- Bloquear o usuário de um **Dono/Instrutor Solo** impede login e revoga sessões, mas não inativa nem altera automaticamente a **Academia** ou seu histórico operacional
- Uma **Exclusão de Usuário** exige escolha explícita entre exclusão definitiva e exclusão preservando histórico, com aviso de impacto antes da confirmação; a exclusão definitiva é permitida mesmo com histórico, desde que vínculos de dono de academia sejam resolvidos antes e o impacto seja confirmado
- Uma **Academia** sem dono preserva histórico e acessos existentes, mas fica sem operação administrativa e pausa a geração futura automática de **Mensalidades** até receber novo dono
- Uma **Transferência de Academia** reativa a operação administrativa e a geração futura automática de **Mensalidades** quando a academia estava sem dono
- Uma **Academia** tem muitos **Alunos**
- Uma **Academia** pode ter um **Pix da Academia** para orientar pagamentos de mensalidades
- Uma **Mensalidade** pode ter múltiplos **Comprovantes Pix** (rejeição → nova tentativa)
- Uma **Verificação de Pagamento** aprovada transforma a **Mensalidade** em paga
- Um **Pagamento Manual** transforma a **Mensalidade** em paga sem exigir **Comprovante Pix**
- Uma **Mensalidade** pode ter muitos **Eventos de Mensalidade** (auditoria)
- Um **Ajuste de Mensalidade** preserva `originalAmountInCents` e registra **Evento de Mensalidade**
- Um **Dono/Instrutor Solo** acompanha muitos **Alunos**
- A fila de **Solicitações de Pré-Cadastro** é revisada pelo instrutor dentro da área de **Alunos**, separada da lista de fichas de **Aluno**
- O **Link de Pré-Cadastro da Academia** é gerenciado no topo da fila de **Solicitações de Pré-Cadastro**
- Uma **Solicitação de Pré-Cadastro** só pode ser vinculada a um **Aluno** existente se ele ainda não tiver **Acesso do Aluno** ativo
- Um **Aluno** pode ter **Acesso do Aluno** para consultar os próprios dados, incluindo mensalidades mesmo quando for menor de idade
- Um **Acesso do Aluno** vincula exatamente uma conta de autenticação a exatamente um **Aluno** na V0
- Uma conta com acesso de instrutor e **Acesso do Aluno** escolhe explicitamente a área ao entrar e pode trocar de área sem mudar os vínculos de domínio
- Uma **Solicitação de Pré-Cadastro** com email de uma conta que já atua como instrutor pode ser aprovada, mas deve alertar o instrutor antes de criar o **Acesso do Aluno**
- Um **Convite do Aluno** pertence a um **Aluno** já cadastrado
- Um **Link de Pré-Cadastro da Academia** pertence a uma **Academia** e pode gerar muitas **Solicitações de Pré-Cadastro**
- Uma **Solicitação de Pré-Cadastro** só vira **Aluno** e **Acesso do Aluno** após aprovação do instrutor
- Ao aprovar uma **Solicitação de Pré-Cadastro**, o sistema cria um **Aluno Ativo** com data de matrícula no dia da aprovação, faixa branca, grau 0, sem turma vinculada e sem mensalidade configurada, cria automaticamente conta/acesso para o email informado e gera um **Link de Primeiro Acesso** copiável pelo instrutor
- Antes da aprovação, a pessoa pode ter conta autenticada e solicitação pendente, mas não tem ficha de **Aluno** nem **Acesso do Aluno** naquela **Academia**
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
- Um **Aluno Ativo** gera **Mensalidades** automaticamente a cada mês, exceto quando a **Academia** está temporariamente sem dono
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
- "convite" agora tem duas intenções possíveis; resolvido: **Convite do Aluno** vincula acesso a **Aluno** existente, enquanto **Link de Pré-Cadastro da Academia** coleta **Solicitações de Pré-Cadastro** de interessados ainda não aprovados.
- "usuário já tem conta" foi separado de **Aluno** e **Acesso do Aluno**; no pré-cadastro V0, a solicitação não exige confirmação de email antes da análise, e só a aprovação cria a ficha de **Aluno** e o **Acesso do Aluno**.
- "super user" foi tratado como apelido técnico/informal; o termo de domínio é **Administrador da Plataforma**.
- **Academia Suspensa** fica fora da primeira versão; bloqueio de acesso pela plataforma ocorre sobre usuários, não sobre a **Academia**.
- "deletar usuário" foi resolvido como **Exclusão de Usuário**, com escolha explícita no momento da ação entre exclusão definitiva e exclusão controlada.
