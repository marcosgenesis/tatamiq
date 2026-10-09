# Gestão de Alunos de Artes Marciais

Sistema para apoiar a operação diária de uma academia/tatame pequeno de artes marciais, inicialmente focado em uma ou mais pessoas responsáveis pela operação da academia.

## Language

**Academia**:
Organização local que usa o app para gerir alunos, turmas, aulas, presenças, evolução e mensalidades, com nome, logo, endereço, telefone/WhatsApp e Instagram personalizáveis na V0.
_Avoid_: equipe, filial, federação, organization como termo de UI/domínio

**Responsável da Academia**:
Pessoa com permissão operacional total para administrar e conduzir a operação da **Academia**, incluindo alunos, turmas, aulas, presenças, graduação, mensalidades, configurações e pré-cadastros. Uma **Academia** pode ter um ou mais responsáveis com os mesmos poderes; não há hierarquia interna entre responsáveis na primeira versão multi-instrutor.
_Avoid_: administrador da plataforma, operador, professor com permissão parcial, funcionário sem poderes operacionais, dono único obrigatório

**Propriedade da Academia**:
Vínculo operacional entre uma conta de autenticação e uma **Academia** que torna essa conta um **Responsável da Academia**; pode ser atribuída no **Provisionamento de Academia**, ampliada com novos responsáveis, removida individualmente ou removida temporariamente até deixar a **Academia** sem responsável após **Exclusão de Usuário**.
_Avoid_: membro genérico, equipe administrativa sem permissão total, posse informal sem vínculo técnico, dono único obrigatório

**Adição de Responsável da Academia**:
Ação executada por um **Administrador da Plataforma** para vincular uma conta existente ou reservada como mais um **Responsável da Academia**, preservando todos os responsáveis já vinculados à **Academia**.
_Avoid_: transferência de academia, substituição automática de responsável, convite de aluno, suporte assistido

**Operador da Plataforma**:
Pessoa interna do App do Sensei autorizada a prestar suporte operacional a usuários e academias sem conhecer senhas nem acessar caixas de email; fora da primeira versão da administração interna.
_Avoid_: admin da academia, instrutor, suporte genérico, administrador sem contexto, papel obrigatório na V0

**Administrador da Plataforma**:
Pessoa interna do App do Sensei com permissão global para gerir usuários e academias da plataforma, incluindo impersonação, bloqueio, revogação de sessões, exclusão de usuários, alteração de papel global de administrador e ações destrutivas quando disponíveis; é o único papel interno ativo na primeira versão, e o bloqueio de um usuário não altera automaticamente academias ou dados operacionais associados.
_Avoid_: dono da academia, owner da academia, instrutor, admin da academia, super user como termo de domínio

**Auditoria Administrativa**:
Registro das ações sensíveis executadas por **Administradores da Plataforma** fora do **Suporte Assistido**, incluindo autor, alvo, ação, resultado, timestamp, motivo opcional, acessos a arquivos privados sensíveis e resumo de impacto de exclusões destrutivas, sem persistir payload completo na V1.
_Avoid_: log técnico bruto, payload completo, auditoria apenas de suporte, motivo obrigatório

**Exclusão de Usuário**:
Ação destrutiva executada por um **Administrador da Plataforma** sobre uma conta de autenticação, escolhendo explicitamente entre exclusão definitiva quando aceitável ou exclusão preservando histórico, que revoga sessões, remove credenciais quando possível, anonimiza nome, email e imagem da conta mantendo o ID para auditoria; quando o usuário é responsável único de uma **Academia**, exige decidir explicitamente se a academia ficará sem responsável antes de concluir.
_Avoid_: remoção automática sem impacto, inativação de academia, apagar histórico por acidente, excluir academia junto automaticamente, anonimizar ficha de aluno operacional

**Exclusão de Academia**:
Ação destrutiva geral executada por um **Administrador da Plataforma** para remover definitivamente uma **Academia** da plataforma por hard delete real, incluindo seus dados operacionais, vínculos de acesso naquela academia e arquivos associados, sem excluir automaticamente as contas de autenticação associadas.
_Avoid_: suspensão de academia, remoção de responsável, exclusão automática ao excluir usuário, arquivamento operacional, soft delete invisível, exclusão automática de contas, deixar arquivos órfãos

**Suporte Assistido**:
Acesso temporário de até 1 hora e auditado em que um **Administrador da Plataforma** atua na plataforma com a perspectiva e permissões de um usuário não-administrador para diagnosticar ou resolver um problema reportado, com motivo opcional, indicador visível durante a sessão e registro de auditoria da sessão e das ações assistidas, sem armazenar payload completo na V1; permite executar as mesmas ações operacionais do usuário assistido, mas não ações globais de administração da plataforma dentro da sessão assistida.
_Avoid_: login pelo email do cliente, acesso à senha, acesso oculto, backdoor, impersonação silenciosa, permissão global disfarçada, impersonar administrador

**Administração da Plataforma**:
Área operacional separada da área da **Academia**, acessada pela rota `/platform` e usada por **Administradores da Plataforma** para gerir o App do Sensei sem serem membros das academias atendidas; na primeira versão cobre dashboard operacional simples, academias, usuários, administradores da plataforma, auditoria administrativa e auditoria de suporte assistido, permite visualizar dados operacionais completos das academias, tem edição direta limitada a dados básicos de provisionamento da academia e busca simples por nome, email ou slug, e expõe ações destrutivas de academia apenas no detalhe da academia.
_Avoid_: admin da academia, painel do instrutor, member role global, billing interno, relatório avançado, operação paralela de edição de dados da academia, filtros analíticos avançados, rota /admin, exclusão direta pela listagem

**Acesso do Aluno**:
Capacidade do **Aluno**, inclusive menor de idade quando convidado pelo instrutor, consultar as próximas aulas dos próximos 7 dias das suas turmas, as próprias presenças e mensalidades dos últimos 12 meses, evolução e turmas vinculadas, e alterar contato pessoal e foto, sem administrar a academia/tatame; nasce somente a partir de um **Convite do Aluno** para uma ficha de **Aluno** já existente, pode coexistir com acesso de instrutor na mesma conta com escolha explícita de área ao entrar, pode ser revogado pelo instrutor sem inativar o aluno ou apagar a conta de autenticação, e alterações de telefone e email mantêm auditoria simples.
_Avoid_: portal completo, conta administrativa, autovínculo por email

**Totem da Academia**:
Experiência compartilhada da **Academia**, executada por um aplicativo próprio e independente do gestor, para apoiar o **Responsável da Academia** durante a operação, exibindo o **QR Code Dinâmico da Aula** em andamento ou permitindo iniciar uma **Aula** para então exibi-lo.
_Avoid_: Acesso do Aluno, portal público, painel administrativo completo, dispositivo pessoal do instrutor

**Modo Totem**:
Autorização operacional restrita concedida a um **Totem da Academia** pelo **Responsável da Academia**, limitada às ações necessárias para selecionar ou iniciar a **Aula** e exibir seu **QR Code Dinâmico da Aula**, sem acesso ao restante da gestão da Academia.
_Avoid_: sessão completa do instrutor, conta compartilhada, login de aluno, permissão administrativa parcial genérica

**Pareamento do Totem**:
Processo em que o **Responsável da Academia** concede o **Modo Totem** a um **Totem da Academia** principalmente por meio de um código curto de uso único, válido por 10 minutos e substituível antes do uso, com QR Code opcional, sem inserir ou deixar a senha do responsável no dispositivo compartilhado.
_Avoid_: senha do totem, conta compartilhada, login permanente do instrutor, convite do aluno

**Student App**:
Aplicativo Expo/React Native separado em `apps/student-app`, dedicado ao **Acesso do Aluno** e tratado como a superfície móvel principal do MVP; usa navegação, telas e integrações nativas no núcleo dos fluxos do aluno, compartilha contratos, cliente de API, autenticação, regras puras e tokens visuais com o restante do monorepo, e mantém o painel do **Responsável da Academia** na web. Pode incorporar **DOM Components híbridos seletivos** em telas isoladas e auxiliares, sem transformar o app inteiro em WebView nem importar a árvore de componentes de `apps/web` como padrão.
_Avoid_: `apps/mobile` genérico, app único de aluno e instrutor, painel operacional nativo no MVP, web app inteiro dentro de WebView, compartilhar componentes DOM como fronteira principal

**DOM Components híbridos seletivos**:
Componentes React DOM renderizados pelo Expo em uma WebView, usados somente quando a reutilização de uma tela web isolada ou uma migração gradual compensar as limitações da ponte assíncrona, do estado separado e da integração nativa; não substituem as telas nativas de autenticação, pré-cadastro, QR Code, navegação, agenda, presença, mensalidades e perfil do **Student App**.
_Avoid_: tratar componente DOM como componente nativo, colocar filhos nativos dentro dele, depender dele para navegação principal ou usar WebView como arquitetura do app inteiro

**Autenticação nativa do Student App**:
Integração do **Student App** com o plugin oficial `@better-auth/expo`, mantendo o modelo de sessão por cookie do backend do App do Sensei; no Expo, o cliente Better Auth persiste sessão e cookies com `expo-secure-store`, usa o scheme/deep link do app quando necessário e fornece o cookie para as requisições nativas autenticadas. Não cria uma autenticação Bearer paralela nem uma conta/sessão diferente da web.
_Avoid_: `localStorage` ou `AsyncStorage` para credenciais, autenticação Bearer separada sem necessidade, sessão duplicada por plataforma, importar o cliente web sem o adaptador Expo

**Roteamento do Student App**:
Estrutura Expo Router separada em grupos de rotas públicas, autenticação e área protegida do **Acesso do Aluno**; links de pré-cadastro, acompanhamento, primeiro acesso e convite entram sem sessão e preservam seus tokens opacos, enquanto a solicitação aprovada conduz à definição de senha com o **Link de Primeiro Acesso** separado. Após autenticar, a escolha explícita de área abre o **Acesso do Aluno** nativamente ou encaminha o acesso do **Responsável da Academia** para a web, mantendo URLs HTTPS canônicas compatíveis com o fallback PWA.
_Avoid_: proteger pré-cadastro com login, misturar token de acompanhamento com sessão, colocar painel do instrutor no stack nativo, rotas nativas paralelas sem deep link equivalente

**Estilização do Student App**:
Uso da trilha estável do NativeWind sobre componentes nativos do React Native, compartilhando tokens, convenções de utilitários e identidade visual com o web sem exigir que `apps/web` e `apps/student-app` compartilhem a mesma árvore de componentes; os componentes de interface continuam próprios de cada plataforma, e a adoção de NativeWind v5 em pré-release ou de Tamagui fica para avaliação futura.
_Avoid_: NativeWind v5 em produção antes de estabilizar, Shopify Restyle como tentativa de compartilhar Tailwind com o web, importar componentes DOM do painel, criar um design system multiplataforma grande antes do MVP

**Diferenças por plataforma do Student App**:
O comportamento e os fluxos de negócio permanecem comuns no Expo, com módulos `.native.tsx` ou seleções de plataforma somente para APIs que realmente diferem, como câmera/QR Code, SecureStore, seletor de arquivos, permissões e deep links; a versão web do Expo pode existir para desenvolvimento ou compatibilidade técnica, mas o fallback PWA oficial continua sendo `apps/web`, sem criar uma segunda PWA do **Acesso do Aluno**.
_Avoid_: duplicar regras por plataforma, manter três superfícies de produto, usar DOM como base do app nativo, implementar o fallback PWA dentro do Expo

**Testes do Student App**:
Estratégia em camadas que preserva Vitest para contratos e regras puras, usa Jest com `jest-expo` e React Native Testing Library para componentes/hooks nativos, Expo Router Testing Library para navegação e deep links, Playwright para o fallback PWA em `apps/web` e Maestro para jornadas reais em builds Android/iOS; fixtures e contratos podem ser compartilhados, mas os caminhos críticos de onboarding, ativação, login, presença e consulta do aluno devem ser verificados em cada superfície relevante.
_Avoid_: confiar apenas em snapshots, testar o native somente pelo web, duplicar toda a suíte em todas as plataformas, aceitar paridade declarada sem E2E nativo dos fluxos críticos

**Baseline do Student App**:
Baseline conservador e estável para o MVP: Expo SDK 55, React Native 0.83, React 19.2, Expo Router da linha 55, módulos Expo instalados pela ferramenta de compatibilidade do SDK, `@better-auth/expo` alinhado à versão Better Auth do monorepo, NativeWind v4 estável com Tailwind 3.4.x no app e Node mínimo 22.22.1; development build é o ambiente canônico para as capacidades nativas, enquanto Expo Go fica restrito a smoke tests simples. SDKs posteriores e NativeWind v5 exigem uma atualização deliberada.
_Avoid_: iniciar com SDK canary/beta, misturar SDK57 sem validar Better Auth/NativeWind, NativeWind v5 preview no MVP, versões independentes dos módulos Expo, executar o baseline com Node abaixo de 22.22.1

**Onboarding da Academia**:
Etapa inicial em que um **Responsável da Academia** autenticado, mas ainda sem **Academia**, informa o nome obrigatório da organização local que irá gerir.
_Avoid_: app demo, academia implícita, tenant padrão, perfil completo obrigatório

**Provisionamento de Academia**:
Criação de uma **Academia** por um **Administrador da Plataforma**, vinculando-a a um email de futuro ou atual **Responsável da Academia** sem exigir acesso à caixa de email dele; quando a conta ainda não existe, cria uma **Conta Reservada** e um link para definição de senha no primeiro acesso com expiração de 7 dias.
_Avoid_: onboarding pelo suporte, academia demo, assumir senha do instrutor, convite de aluno, senha temporária

**Remoção de Responsável da Academia**:
Ação executada por um **Administrador da Plataforma** para remover o vínculo operacional de uma conta como **Responsável da Academia**, preservando a conta, os dados operacionais e os demais responsáveis da **Academia**.
_Avoid_: excluir a academia, excluir o usuário automaticamente, transferência implícita, remover responsável sem auditoria

**Conta Reservada**:
Conta de autenticação criada pelo sistema para um email conhecido, vinculada a um acesso futuro e sem login por senha até a definição de senha no primeiro acesso; pode ser usada para futuro **Responsável da Academia** ou futuro **Administrador da Plataforma**, seu link de primeiro acesso pode ser regenerado sem criar nova conta, e o envio inicial pode ocorrer por link copiável sem email automático obrigatório.
_Avoid_: senha temporária, conta fake, conta compartilhada, acesso pelo email do cliente, email automático obrigatório

**Convite do Aluno**:
Link completo que o instrutor copia e envia por fora para vincular uma conta de acesso ao cadastro de um **Aluno** existente, podendo abrir a ativação no Expo ou na PWA, expirando em 7 dias; reenviar convite na V0 significa invalidar qualquer convite pendente anterior para aquele aluno e criar um novo link com nova expiração de 7 dias, desde que ainda não exista **Acesso do Aluno** ativo para aquela ficha; quando já existe acesso ativo, o instrutor precisa revogar o acesso antes de recriar convite.
_Avoid_: cadastro livre, conta solta, envio integrado obrigatório, múltiplos acessos ativos para o mesmo aluno, código curto digitado pelo aluno na V0, reutilizar link pendente antigo ao reenviar

**Link de Pré-Cadastro da Academia**:
Link compartilhável único e sem expiração automática por **Academia**, copiado para canais externos como grupo de WhatsApp ou representado por QR Code, que pode ser aberto por URL/deep link, lido pelo scanner de pré-cadastro do Expo sem exigir conta ou aberto pela PWA quando o app não estiver instalado; pode ser pausado, reativado ou regenerado pelo instrutor, mostrando apenas dados públicos da academia, com proteção mínima por limite de tentativas por IP/email na V0, para interessados preencherem uma **Solicitação de Pré-Cadastro** sem virar **Aluno** automaticamente.
_Avoid_: convite do aluno, cadastro livre direto, matrícula automática, link de turma, link descartável por aluno, página pública com Pix ou dados internos, CAPTCHA obrigatório na V0

**Solicitação de Pré-Cadastro**:
Pedido criado por uma pessoa interessada a partir do **Link de Pré-Cadastro da Academia**, com estados em análise, aprovada ou rejeitada, contendo nome, data de nascimento, telefone/WhatsApp, email obrigatório não confirmado na V0, responsável quando menor e observação opcional, revisado pelo instrutor antes de virar ficha de **Aluno** e **Acesso do Aluno**; ao aprovar, o sistema cria automaticamente a conta/acesso para o email informado, mesmo sem confirmação prévia de posse do email na V0; para menor de idade, o email pode ser do aluno ou do responsável, mas será a conta que acessa a área do aluno após aprovação; enquanto em análise, fica somente leitura para o interessado; por **Academia**, não pode existir outra solicitação pendente ou aprovada com o mesmo email, nome e data de nascimento iguais a um **Aluno** existente sinalizam possível duplicidade que exige escolha explícita entre vincular ao aluno existente, criar novo aluno mesmo assim ou rejeitar como duplicado, uma solicitação rejeitada pode ser reenviada como nova tentativa, e a rejeição pode ter motivo opcional visível apenas ao instrutor.
_Avoid_: aluno pendente, conta solta, lead genérico, matrícula confirmada, ficha completa de aluno, motivo público obrigatório, conta de responsável na V0, edição de solicitação pendente, confirmação de email obrigatória na V0

**Link de Acompanhamento da Solicitação**:
Link/token individual e opaco gerado ao enviar uma **Solicitação de Pré-Cadastro**, associado exclusivamente àquela solicitação, que permite ao interessado acompanhar o próprio status antes de ter **Acesso do Aluno**; pode ser salvo e copiado pelo interessado e deve abrir a experiência equivalente no Expo ou na PWA, sem permitir consulta por email/data de nascimento, acesso a outras solicitações ou edição de uma solicitação ainda pendente; permanece válido enquanto a solicitação está em análise e continua abrindo a página de status após aprovação ou rejeição; enquanto em análise mostra somente o status, quando aprovada apresenta na mesma experiência contínua a ação **Definir senha**, mas usa por baixo um token separado de **Link de Primeiro Acesso**, de uso único e com expiração de 7 dias, antes do **Aceite do Aluno**, e quando rejeitada mostra a rejeição sem expor motivo interno e permite iniciar nova solicitação pelo **Link de Pré-Cadastro da Academia**; não tem recuperação por email/data de nascimento, então o interessado deve salvá-lo/copiá-lo ou contatar a **Academia** se o perder.
_Avoid_: consulta pública por email, token compartilhado da academia, edição de solicitação pendente, acesso ao cadastro de outro interessado

**Link de Primeiro Acesso**:
Link copiável com expiração de 7 dias gerado quando uma **Solicitação de Pré-Cadastro** é aprovada para que o instrutor envie por fora, normalmente WhatsApp, ou apresentado como a etapa final da mesma experiência contínua de acompanhamento no Expo/PWA, permitindo que a conta criada automaticamente, ainda sem login por senha antes do primeiro acesso, defina senha e acesse a área do aluno pela primeira vez; o token é de uso único; quando o email já pertence a uma conta existente, o acesso é vinculado a essa conta e o link leva ao login/área do aluno sem redefinir senha; é distinto de **Link de Acompanhamento da Solicitação** e de **Convite do Aluno** no domínio, embora possa reutilizar infraestrutura técnica de token de ativação.
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
Código temporário e rotativo vinculado a uma **Aula**, exibido pelo instrutor para reduzir fraude na **Confirmação de Presença**, renovado a cada 30 segundos, válido durante toda a aula e por 15 minutos após o fim calculado a partir do início real da aula, ou até o encerramento manual pelo instrutor, com tolerância curta para o código anterior, apontando o aluno para a URL canônica do portal e sem exigir geolocalização na V0.
_Avoid_: link fixo, código permanente, geolocalização obrigatória

**Aluno**:
Pessoa matriculada ou em acompanhamento pela academia/tatame, com nome, data de nascimento, data de matrícula e estado ativo ou inativo obrigatórios.
_Avoid_: cliente, usuário, membro

**Aluno Ativo**:
**Aluno** que aparece nas chamadas e no controle de mensalidades.
_Avoid_: membro ativo, usuário ativo

**Aluno Inativo**:
**Aluno** mantido no histórico, removido de chamadas e da geração de mensalidades ou diárias futuras, preservando cobranças já existentes e acesso somente leitura por 12 meses; nesse período pode consultar histórico e dados visíveis, mas não confirma presença por QR, não envia comprovante Pix, não altera contato/foto e não executa ações operacionais de aluno; ao ser reativado, preserva o histórico e retoma a geração de cobranças futuras conforme sua **Forma de Cobrança**.
_Avoid_: deletado, cancelado, excluído

**Aula**:
Ocorrência concreta de treino criada quando o instrutor inicia a chamada de uma **Turma**, registrando o horário real de início e mantendo referência ao horário previsto para calcular o fim previsto com a duração padrão da turma; é encerrada automaticamente ao fim calculado ou manualmente pelo instrutor.
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

**Cobrança Financeira**:
Registro de valor devido por um **Aluno**, que é uma **Mensalidade** ou uma **Diária**.
_Avoid_: cobrança sem aluno, pagamento, caixa

**Configuração de Diária**:
Regra financeira definida pela **Academia**, com o valor padrão aplicável a todos os alunos cuja cobrança é por diária, que só pode ser usada após informar um valor maior que zero.
_Avoid_: valor de diária no aluno, mensalidade diária, plano individual

**Forma de Cobrança**:
Escolha exclusiva de um **Aluno Ativo** entre mensalidade e diária, com histórico de vigência usado pela data da presença, que passa a valer imediatamente para cobranças futuras sem alterar o histórico financeiro já criado, exibindo os ajustes manuais necessários no momento da troca.
_Avoid_: plano, duas cobranças simultâneas, assinatura

**Diária**:
Cobrança única por aluno e dia-calendário criada automaticamente pela primeira **Presença** válida de um aluno com **Forma de Cobrança** diária, preservando o valor da **Configuração de Diária** vigente naquele momento e vencendo nessa mesma data.
_Avoid_: mensalidade diária, lançamento financeiro desconectado da presença, pacote

**Pagamento de Diária**:
Registro de um valor pago para uma **Diária**, integral ou parcial, feito pelo responsável na chamada ou solicitado pelo aluno com **Comprovante Pix** que declara o valor e é confirmado ou corrigido pelo responsável na verificação.
_Avoid_: confirmação automática, pagamento sem diária, conciliação bancária

**Histórico de Diárias**:
Lista das diárias de um aluno visível no **Acesso do Aluno** pelos últimos 12 meses, com data da aula, valor e status, permitindo enviar **Comprovante Pix** quando estiver em aberto.
_Avoid_: visão das cobranças de outros alunos, comprovante sem cobrança

**Compensação de Diária**:
Resolução explícita de um pagamento já recebido para uma **Diária** cuja **Presença** foi invalidada, por estorno ou crédito aplicado automaticamente à próxima diária do aluno.
_Avoid_: apagar pagamento, reversão financeira silenciosa, ignorar valor recebido

**Saldo de Diária**:
Valor ainda devido em uma **Diária** após a aplicação de crédito ou pagamento parcial.
_Avoid_: diária quitada sem valor integral, crédito perdido, status financeiro sem saldo

**Troca de Forma de Cobrança**:
Alteração imediata da **Forma de Cobrança** de um aluno que exige resolver explicitamente as cobranças em conflito, mantendo, dispensando ou ajustando cada uma sem mudança automática, e estornando ou aplicando à mensalidade qualquer crédito de diária pendente ao mudar para mensalidade.
_Avoid_: transição só no mês seguinte, dupla cobrança silenciosa, alteração retroativa automática

**Financeiro**:
Área operacional da **Academia** que reúne as cobranças de **Mensalidade** e **Diária** em visões separadas e mostra as pendências de ambas no dashboard.
_Avoid_: tela de mensalidades que também esconde diárias, caixa sem cobrança associada

**Pix da Academia**:
Chave Pix simples ou payload Pix copia-e-cola da **Academia** exibido ao aluno para pagamento manual de cobranças na V0.
_Avoid_: integração bancária, conciliação automática

**Comprovante Pix**:
Arquivo de imagem ou PDF de até 10 MB enviado pelo **Aluno** via presigned URL direto ao R2 para solicitar verificação de pagamento de uma **Cobrança Financeira**, podendo incluir observação opcional e valor declarado por comprovante para o instrutor, preservado no histórico financeiro após aprovação, rejeição ou substituição; pode ser enviado mesmo sem **Pix da Academia** configurado quando a orientação de pagamento foi passada por fora pelo instrutor; múltiplos comprovantes possíveis por cobrança, inclusive substituição pelo aluno enquanto ainda está pendente de verificação e nova tentativa após rejeição, mas aluno vê apenas o último relevante; rejeição tem motivo obrigatório inline no registro do comprovante, visível ao aluno.
_Avoid_: confirmação automática, recibo emitido pelo app, upload via proxy do backend

**Verificação de Pagamento**:
Análise manual feita pelo instrutor sobre um **Comprovante Pix** obrigatório, registrando o valor aprovado em uma **Cobrança Financeira** ou rejeitando a solicitação com motivo obrigatório visível ao aluno; rejeição volta status pra `open` (atrasada calculada se vencimento passou); nova tentativa permitida após rejeição; fila de verificação acessível no dashboard e no **Financeiro**.
_Avoid_: conciliação bancária, pagamento automático

**Pagamento Manual**:
Registro integral ou parcial de pagamento de uma **Cobrança Financeira** diretamente pelo instrutor, sem **Comprovante Pix** enviado pelo aluno, com observação opcional visível apenas ao instrutor.
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

- O cadastro público cria uma conta de **Responsável da Academia** e o vincula à **Academia** criada no onboarding
- Um **Operador da Plataforma** é um papel futuro, não ativo na primeira versão da administração interna
- Um **Administrador da Plataforma** não é membro da **Academia** por padrão; quando usa **Suporte Assistido**, sua atuação deve ser temporária, auditada e visivelmente indicada na interface
- Durante o **Suporte Assistido**, ações operacionais permitidas ao usuário assistido também são permitidas ao administrador, mas devem ser registradas como ações assistidas
- Durante o **Suporte Assistido**, a navegação inicial segue as mesmas áreas disponíveis para o usuário assistido: entrada direta quando há uma única área disponível e seletor explícito quando há duas ou mais
- A auditoria de **Suporte Assistido** registra sessão, motivo opcional, participantes, academia quando aplicável, início/fim, IP/user agent e ações realizadas, sem persistir payload completo na V1
- **Suporte Assistido** não pode ser iniciado sobre outro **Administrador da Plataforma** nem sobre uma conta sem área operacional disponível
- A **Auditoria Administrativa** registra ações como provisionar academia, adicionar/remover responsável de academia, bloquear/desbloquear usuário, revogar sessões, excluir usuário, excluir academia e adicionar/remover administrador
- Um **Administrador da Plataforma** tem poder global fora do escopo de uma **Academia** e não deve ser confundido com o papel `owner` da academia
- A **Administração da Plataforma** fica fora da área normal da **Academia**, não depende de `activeOrganizationId`, na primeira versão é acessada por **Administradores da Plataforma** e é o destino padrão após login de uma conta com papel global de administrador
- Uma conta com uma única área disponível entra diretamente nessa área; o seletor explícito só aparece quando a conta combina duas ou mais áreas disponíveis
- Uma conta que combina papel de **Administrador da Plataforma** com vínculos próprios de academia ou aluno troca de área por seletor explícito; isso não é **Suporte Assistido**
- A **Administração da Plataforma** pode visualizar dados operacionais completos da **Academia**, incluindo arquivos privados sensíveis como fotos e **Comprovantes Pix**, preferencialmente reaproveitando telas operacionais em modo somente leitura, mas não edita diretamente alunos, turmas, mensalidades, presenças, Pix ou graduação; esse suporte ocorre por **Suporte Assistido**
- Acesso administrativo a arquivos privados sensíveis deve registrar **Auditoria Administrativa**
- Um **Administrador da Plataforma** pode realizar **Provisionamento de Academia** para um email de futuro ou atual **Responsável da Academia**
- Cada **Aluno Ativo** tem exatamente uma **Forma de Cobrança** ativa: mensalidade ou diária
- A **Forma de Cobrança** aplicável a uma **Presença** é a que estava vigente na data da presença
- Uma **Troca de Forma de Cobrança** passa a valer imediatamente e exige decisão explícita para cada cobrança em conflito
- Inativar um aluno exige decidir sobre cada **Diária** em aberto e estornar qualquer crédito de diária não utilizado
- A **Configuração de Diária** da **Academia** fornece o valor padrão para alunos com **Forma de Cobrança** diária
- Uma ou mais **Presenças** válidas de um mesmo aluno com **Forma de Cobrança** diária no mesmo dia geram uma única **Diária**
- Uma **Diária** só é cancelada quando não resta nenhuma **Presença** válida do aluno naquele dia
- Uma **Diária** pode ser paga manualmente na chamada ou por **Verificação de Pagamento** de um **Comprovante Pix**
- Uma **Diária** só é quitada quando seus **Pagamentos de Diária** e créditos aplicados alcançam seu valor total
- O **Aluno** consulta o próprio **Histórico de Diárias** no **Acesso do Aluno**
- O **Financeiro** separa as visões de **Mensalidade** e **Diária**, mas consolida suas pendências no dashboard
- O export do **Financeiro** permite filtrar **Mensalidade** ou **Diária** e inclui valor, pagamentos, créditos, saldo, status e origem
- Invalidar uma **Presença** associada a uma **Diária** paga exige uma **Compensação de Diária** explícita
- Um crédito aplicado a uma **Diária** pode deixá-la com **Saldo de Diária** em aberto
- Na primeira versão multi-instrutor, somente **Administradores da Plataforma** adicionam ou removem **Responsáveis da Academia**; responsáveis não gerenciam outros responsáveis dentro da área da **Academia**
- A **Adição de Responsável da Academia** preserva os responsáveis existentes e apenas amplia quem pode operar a **Academia**
- A **Remoção de Responsável da Academia** remove um responsável específico sem substituir automaticamente por outro
- Um **Administrador da Plataforma** pode remover o último **Responsável da Academia** com confirmação forte e auditoria, deixando a **Academia** temporariamente sem responsável
- Não há **Transferência de Academia** como ação de domínio separada na primeira versão multi-instrutor; uma troca de responsáveis é feita por adições e remoções explícitas
- O **Provisionamento de Academia** cria ou reutiliza uma conta pelo email informado, cria a **Academia**, vincula o responsável e entrega um link de primeiro acesso para definição de senha quando necessário
- Um **Administrador da Plataforma** pode adicionar outro administrador por email, reutilizando uma conta existente ou criando uma **Conta Reservada** com link de primeiro acesso quando necessário
- Remover o papel de **Administrador da Plataforma** não exclui a conta nem remove acessos de academia ou aluno, mas deve revogar sessões por segurança e nunca pode remover o último administrador ativo
- Uma **Conta Reservada** não permite login por senha até que a pessoa defina senha no primeiro acesso
- Regenerar o link de primeiro acesso de uma **Conta Reservada** invalida o link anterior, cria nova expiração de 7 dias e registra **Auditoria Administrativa**
- Um **Responsável da Academia** sem **Academia** acessa apenas o **Onboarding da Academia** no login normal
- Uma **Academia** pode ter um ou mais **Responsáveis da Academia**, mas pode ficar temporariamente sem responsável após **Exclusão de Usuário** decidida por um **Administrador da Plataforma**
- Um **Pareamento do Totem** concede a um **Totem da Academia** um **Modo Totem** revogável, vinculado à **Academia** e ao **Responsável da Academia** que autorizou o dispositivo
- Qualquer **Responsável da Academia** pode parear ou revogar um **Totem da Academia** da própria **Academia**, pois os responsáveis têm os mesmos poderes operacionais
- Um código de **Pareamento do Totem** expira em 10 minutos, deixa de valer após o uso e é invalidado quando outro código é gerado
- Uma **Academia** pode ter vários **Totens da Academia** nomeados, e cada **Modo Totem** pode ser revogado individualmente sem afetar os demais dispositivos
- O nome de um **Totem da Academia** é definido no **Pareamento do Totem** ou recebe um nome sugerido automaticamente para permitir identificação e revogação no gestor
- O aplicativo do **Totem da Academia** é independente da interface e da entrega do gestor, mas usa a mesma API e a mesma fonte de dados para autorização, **Aulas** e **QR Code Dinâmico da Aula**
- Um **Totem da Academia** opera somente dentro do **Modo Totem** e não acessa a área completa da **Academia**
- Uma **Academia** pode ter várias **Aulas** simultaneamente em andamento; o **Totem da Academia** abre diretamente a única aula ativa ou exige seleção explícita quando há mais de uma
- Quando há várias **Aulas** ativas, trocar a aula no **Totem da Academia** altera somente o QR exibido; não encerra, inicia novamente nem modifica as aulas
- Sem **Aula** ativa, o **Totem da Academia** permite iniciar somente ocorrências previstas para o dia, incluindo **Aulas Avulsas** já cadastradas; criar uma aula sem ocorrência prevista continua sendo responsabilidade do gestor
- Uma ocorrência prevista para hoje pode ser iniciada pelo **Totem da Academia** antes ou depois do horário previsto, mediante confirmação; o horário real do início passa a governar a duração e o encerramento automático
- O **Modo Totem** permanece ativo após atualizar a página ou reiniciar o dispositivo e termina somente por revogação ou perda de validade da autorização
- O **Modo Totem** exige conexão com o servidor para iniciar aulas, consultar aulas ativas e renovar o **QR Code Dinâmico da Aula**; sem conexão, o totem sinaliza indisponibilidade e não executa novas operações
- Quando o **Modo Totem** é revogado ou o responsável perde acesso à **Academia**, o **Totem da Academia** apaga a autorização local, interrompe o QR e retorna à tela de **Pareamento do Totem**, sem conservar QR em cache
- O **Totem da Academia** não oferece saída local comum; desvincular o dispositivo é uma ação do gestor, e apagar os dados do navegador é apenas um reset técnico
- Uma **Aula** passa automaticamente de `active` para `ended` no servidor ao atingir o fim calculado por seu início real e duração; o encerramento manual continua permitido antes desse limite
- O **Totem da Academia** não encerra **Aulas** manualmente; após o fim calculado, deixa de exibir a aula como ativa e o servidor aplica a janela de tolerância do **QR Code Dinâmico da Aula**
- Após o encerramento automático de uma **Aula**, o **Totem da Academia** retorna à seleção das ocorrências do dia e nunca inicia a próxima automaticamente
- O **QR Code Dinâmico da Aula** exibido pelo **Totem da Academia** sempre contém a URL canônica do **Acesso do Aluno**, nunca a URL do aplicativo do totem
- A **Administração da Plataforma** deve apresentar responsáveis no plural, sem responsável principal; quando não houver nenhum, exibe **Sem responsável**
- Bloquear o usuário de um **Responsável da Academia** impede login e revoga sessões, mas não inativa nem altera automaticamente a **Academia** ou seu histórico operacional
- Uma **Exclusão de Academia** é independente de **Exclusão de Usuário**: excluir uma academia não exclui automaticamente as contas dos responsáveis ou alunos, apenas remove os vínculos e acessos associados à academia excluída
- Uma **Exclusão de Academia** deve revogar sessões dos **Responsáveis da Academia** e dos usuários com **Acesso do Aluno** naquela academia para evitar operação com contexto removido, sem excluir as contas desses usuários; a sessão do **Administrador da Plataforma** que executa a exclusão é preservada, e sessões de administradores globais não são revogadas apenas por terem usado **Suporte Assistido** naquela academia
- Uma **Exclusão de Academia** pode ser executada mesmo quando a academia possui dados operacionais reais, incluindo alunos, presenças, mensalidades pagas e comprovantes, desde que o impacto seja explicitamente confirmado
- Uma **Exclusão de Academia** remove definitivamente os dados operacionais da academia por hard delete real; recuperação depois da confirmação depende apenas de backup infra, não de restauração pelo produto
- Uma **Exclusão de Academia** também remove arquivos associados à academia, públicos ou privados, como logo, fotos de alunos e **Comprovantes Pix**, evitando deixar objetos órfãos no storage
- Se a remoção dos arquivos associados falhar, a **Exclusão de Academia** deve ser abortada antes de apagar os dados operacionais, mantendo a academia intacta para nova tentativa
- Qualquer **Administrador da Plataforma** pode executar uma **Exclusão de Academia**; não há papel separado de superadministrador na V1
- Uma **Exclusão de Academia** exige confirmação forte com resumo de impacto, digitação do slug exato da academia, aceite explícito de irreversibilidade e motivo opcional para auditoria
- A **Auditoria Administrativa** de uma **Exclusão de Academia** preserva no metadata o ID, nome e slug da academia excluída, contagens principais de impacto, quantidade de arquivos apagados e responsáveis afetados, sem persistir payload completo de alunos, mensalidades ou comprovantes
- Uma **Exclusão de Academia** não precisa bloquear ou coordenar sessões ativas de **Suporte Assistido**; a academia é excluída mesmo que exista suporte assistido em andamento
- Uma **Exclusão de Usuário** exige escolha explícita entre exclusão definitiva e exclusão preservando histórico, com aviso de impacto antes da confirmação; a exclusão definitiva é permitida mesmo com histórico, desde que vínculos de responsável de academia sejam resolvidos antes e o impacto seja confirmado
- Uma **Academia** sem responsável preserva histórico e acessos existentes, mas fica sem operação administrativa e pausa a geração futura automática de **Mensalidades** até receber novo responsável
- A **Adição de Responsável da Academia** reativa a operação administrativa e a geração futura automática de **Mensalidades** quando a academia estava sem responsável
- Uma **Academia** tem muitos **Alunos**
- Uma **Academia** pode ter um **Pix da Academia** para orientar pagamentos de mensalidades
- Uma **Mensalidade** pode ter múltiplos **Comprovantes Pix** (rejeição → nova tentativa)
- Uma **Verificação de Pagamento** aprovada transforma a **Mensalidade** em paga
- Um **Pagamento Manual** transforma a **Mensalidade** em paga sem exigir **Comprovante Pix**
- Uma **Mensalidade** pode ter muitos **Eventos de Mensalidade** (auditoria)
- Um **Ajuste de Mensalidade** preserva `originalAmountInCents` e registra **Evento de Mensalidade**
- Um **Responsável da Academia** acompanha muitos **Alunos**
- A fila de **Solicitações de Pré-Cadastro** é revisada pelo instrutor dentro da área de **Alunos**, separada da lista de fichas de **Aluno**
- O **Link de Pré-Cadastro da Academia** é gerenciado no topo da fila de **Solicitações de Pré-Cadastro**
- Uma **Solicitação de Pré-Cadastro** só pode ser vinculada a um **Aluno** existente se ele ainda não tiver **Acesso do Aluno** ativo
- Um **Aluno** pode ter **Acesso do Aluno** para consultar os próprios dados, incluindo mensalidades mesmo quando for menor de idade
- Um **Acesso do Aluno** vincula exatamente uma conta de autenticação a exatamente um **Aluno** na V0
- Uma conta com acesso de instrutor e **Acesso do Aluno** escolhe explicitamente a área ao entrar e pode trocar de área sem mudar os vínculos de domínio; no Expo, a área de **Acesso do Aluno** abre nativamente e a área de **Responsável da Academia** encaminha para o painel web, que permanece fora do app nativo
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
- Um **Aluno Ativo** gera **Mensalidades** automaticamente a cada mês, exceto quando a **Academia** está temporariamente sem responsável
- Um **Aluno** pode ter muitas **Mensalidades**
- Um **Ajuste de Mensalidade** afeta apenas uma **Mensalidade** específica
- Uma **Mensalidade Dispensada** permanece no histórico financeiro e não é considerada inadimplência
- Um **Aluno** pode ter muitas **Anotações do Aluno**
- Um **Aluno** pode ter no máximo um **Responsável** no MVP
- Um **Responsável** pode estar associado a muitos **Alunos**, mas a cobrança do MVP continua por **Aluno**

## Example dialogue

> **Dev:** "O primeiro fluxo deve atender a recepção, o financeiro ou o professor?"
> **Domain expert:** "Primeiro o **Responsável da Academia**, que precisa acompanhar seus **Alunos** sem depender de uma equipe administrativa."

**Resumo da Home do Aluno**:
Projeção de leitura da área inicial do **Acesso do Aluno**, composta por dados reais da **Academia**, do **Aluno**, das próximas **Aulas**, da **Evolução**, das **Presenças** e das **Mensalidades**; não é uma entidade persistida nem uma nova fonte de verdade do domínio.
_Avoid_: dashboard administrativo, snapshot persistido, dado demonstrativo, regra de negócio exclusiva da Home

## Flagged ambiguities

- "gestão de alunos" foi delimitada inicialmente como **Presença**, **Evolução** e **Mensalidade**; cadastro e comunicação ficam como suporte, não como foco principal.
- "academia", "equipe" e "federação" são conceitos distintos; o MVP modela apenas a **Academia** usuária do app.
- "modalidade" e "turma" são conceitos distintos: a modalidade é a arte marcial; a turma é um grupo recorrente dentro dela.
- "aluno" pode significar pessoa matriculada ou usuário que acessa o sistema; resolvido como **Aluno** para a pessoa e **Acesso do Aluno** para a capacidade de entrar no app.
- "gestor" pode aparecer como linguagem informal na UI, mas não é um papel separado; no domínio, significa **Responsável da Academia**.
- Ficha de saúde e contato de emergência ficam fora da V0, apesar de serem comuns em academias.
- Aluno menor pode aceitar o uso do app na V0; a autorização do responsável fica como responsabilidade operacional da academia/instrutor, pois responsável não tem acesso próprio.
- "convite" agora tem duas intenções possíveis; resolvido: **Convite do Aluno** vincula acesso a **Aluno** existente, enquanto **Link de Pré-Cadastro da Academia** coleta **Solicitações de Pré-Cadastro** de interessados ainda não aprovados.
- "usuário já tem conta" foi separado de **Aluno** e **Acesso do Aluno**; no pré-cadastro V0, a solicitação não exige confirmação de email antes da análise, e só a aprovação cria a ficha de **Aluno** e o **Acesso do Aluno**.
- "super user" foi tratado como apelido técnico/informal; o termo de domínio é **Administrador da Plataforma**.
- "mesmo login do instrutor" foi resolvido como mesma identidade e autoridade do **Responsável da Academia**, concedidas ao totem por **Pareamento do Totem** e expressas como **Modo Totem**, sem reutilizar a sessão completa nem expor a senha no dispositivo compartilhado.
- "pareamento persistente" foi resolvido como autorização que sobrevive a refresh e reinício do tablet e permanece válida até revogação explícita ou expiração técnica da sessão; não há saída local comum.
- "revogar o totem" foi resolvido como invalidar a autorização no servidor e exigir novo **Pareamento do Totem**, com remoção da autorização local e interrupção do QR na próxima comunicação possível.
- "iPad antigo" foi concretizado como suporte oficial mínimo ao iPad de 7ª geração; o aplicativo do totem deve ser validado nesse dispositivo, sem transformar isso em promessa de compatibilidade com qualquer hardware legado.
- "funcionar em qualquer tablet" não inclui operação offline: o **Totem da Academia** depende de conexão para manter o estado da aula e o QR Code confiáveis.
- "alguma aula em andamento" foi resolvido como uma ou mais **Aulas** ativas; quando há mais de uma, o **Totem da Academia** não escolhe uma silenciosamente.
- "iniciar a aula" foi delimitado a iniciar uma ocorrência do dia já prevista; o **Totem da Academia** não cadastra novas **Aulas Avulsas** nem altera a agenda.
- "iniciar cedo ou tarde" foi resolvido como início manual permitido para qualquer ocorrência prevista no dia, usando o instante da confirmação como início real e sem início automático pelo relógio.
- "o totem" foi resolvido como qualquer dispositivo nomeado e pareado da **Academia**; uma academia pode operar vários **Totens da Academia** em paralelo.
- "outro app" foi resolvido como cliente independente na experiência e na entrega, não como backend ou domínio duplicado; a API do App do Sensei permanece a fonte única de verdade para o **Totem da Academia**.
- "código de pareamento" foi resolvido como credencial curta, única e temporária para ativar o **Modo Totem**, não como senha reutilizável do dispositivo.
- "deixar por tempo" foi resolvido como transição automática `active → ended` no servidor pelo início real mais a duração da **Aula**, mantendo o encerramento manual apenas como encerramento antecipado no gestor.
- "origem do QR" foi resolvida como o endereço canônico do **Acesso do Aluno**; o domínio independente do **Totem da Academia** não é destino de confirmação de presença.
- **Academia Suspensa** fica fora da primeira versão; bloqueio de acesso pela plataforma ocorre sobre usuários, não sobre a **Academia**.
- "deletar usuário" foi resolvido como **Exclusão de Usuário**, com escolha explícita no momento da ação entre exclusão definitiva e exclusão controlada.
