# V0 Data Model — Gestão de Alunos de BJJ

## Princípios

- O sistema é multi-tenant por **Academia** desde o início.
- Toda entidade operacional deve pertencer direta ou indiretamente a uma academia.
- A V0 distingue apenas dois papéis: instrutor e aluno.
- Histórico operacional não deve ser apagado em fluxos normais; usar inativação, arquivamento, cancelamento ou invalidação.
- Pagamentos são manuais via Pix com comprovante e verificação pelo instrutor.

## Diagramas

Os diagramas Mermaid do modelo de dados e dos fluxos principais estão em [`docs/architecture/diagrams-v0.md`](./diagrams-v0.md).

A stack técnica da V0 está documentada em [`docs/architecture/technical-stack-v0.md`](./technical-stack-v0.md).

## Entidades principais

### Academy

Representa a academia cliente/tenant.

Campos sugeridos:

- `id`
- `name`
- `logo_url`
- `address`
- `phone_whatsapp`
- `instagram`
- `pix_key`
- `pix_copy_paste`
- `created_at`
- `updated_at`

Regras:

- cada instrutor da V0 pertence a uma única academia;
- dados da academia aparecem apenas para alunos vinculados.

### User

Conta de autenticação.

Campos sugeridos:

- `id`
- `email`
- `password_hash`
- `role`: `instructor | student`
- `created_at`
- `updated_at`

Regras:

- email + senha na V0;
- confirmação de email não bloqueia uso;
- recuperação de senha deve existir;
- uma conta de aluno só se vincula a uma academia na V0.

### InstructorProfile

Perfil operacional do instrutor.

Campos sugeridos:

- `id`
- `user_id`
- `academy_id`
- `name`
- `created_at`
- `updated_at`

Regras:

- na V0, uma academia tem um dono/instrutor solo.

### Student

Ficha de aluno dentro da academia.

Campos sugeridos:

- `id`
- `academy_id`
- `user_id` nullable
- `name`
- `birth_date`
- `enrollment_date`
- `status`: `active | inactive`
- `inactive_at`
- `read_only_access_until`
- `phone`
- `email`
- `photo_url`
- `monthly_amount`
- `monthly_due_day`
- `current_belt_id`
- `current_degree`
- `graduation_path`: `adult | child`
- `created_at`
- `updated_at`

Regras:

- nome, nascimento, matrícula e status são obrigatórios;
- aluno ativo aparece em chamadas e gera mensalidades;
- aluno inativo não gera mensalidades futuras;
- inativo preserva histórico e acesso somente leitura por 12 meses;
- reativação preserva histórico e retoma mensalidades futuras.

### Guardian

Responsável por aluno menor.

Campos sugeridos:

- `id`
- `academy_id`
- `name`
- `phone`
- `email`
- `created_at`
- `updated_at`

### StudentGuardian

Associação entre aluno e responsável.

Campos sugeridos:

- `student_id`
- `guardian_id`
- `created_at`

Regras:

- aluno menor deve ter responsável;
- responsável não tem acesso próprio na V0;
- cobrança continua por aluno.

### StudentAccessInvite

Convite para ativar acesso do aluno.

Campos sugeridos:

- `id`
- `academy_id`
- `student_id`
- `token_hash`
- `status`: `pending | accepted | expired | revoked`
- `expires_at`
- `accepted_at`
- `revoked_at`
- `created_by_user_id`
- `created_at`

Regras:

- expira em 7 dias;
- pode ser reenviado;
- instrutor copia link/código e envia por fora;
- vincula conta nova ou existente à ficha do aluno.

### StudentAcceptance

Aceite simples no primeiro acesso.

Campos sugeridos:

- `id`
- `academy_id`
- `student_id`
- `user_id`
- `accepted_at`
- `terms_version`

## Turmas e agenda

### ClassGroup

Turma recorrente.

Campos sugeridos:

- `id`
- `academy_id`
- `name`
- `default_duration_minutes`
- `status`: `active | archived`
- `archived_at`
- `created_at`
- `updated_at`

### ClassGroupSchedule

Dias/horários semanais da turma.

Campos sugeridos:

- `id`
- `academy_id`
- `class_group_id`
- `weekday`
- `start_time`
- `effective_from`
- `effective_until` nullable
- `created_at`

Regras:

- mudanças afetam ocorrências futuras;
- passado permanece histórico.

### ClassGroupTag

Etiqueta livre da turma.

Campos sugeridos:

- `id`
- `academy_id`
- `class_group_id`
- `label`

### StudentClassGroup

Vínculo aluno-turma.

Campos sugeridos:

- `student_id`
- `class_group_id`
- `active_from`
- `active_until` nullable

Regras:

- manter vínculo histórico quando turma for arquivada;
- turma arquivada não conta como turma atual.

### ClassSession

Aula concreta iniciada ou aula avulsa agendada.

Campos sugeridos:

- `id`
- `academy_id`
- `class_group_id`
- `kind`: `recurring | ad_hoc`
- `scheduled_start_at`
- `actual_start_at` nullable
- `duration_minutes`
- `ended_at` nullable
- `status`: `scheduled | active | ended | cancelled`
- `cancelled_at`
- `cancelled_by_user_id`
- `created_by_user_id`
- `created_at`
- `updated_at`

Regras:

- aula recorrente nasce ao iniciar chamada, mas agenda pode exibir ocorrência prevista;
- aula avulsa pode ser agendada para o futuro;
- aula cancelada aparece como cancelada e não some;
- aula cancelada precisa ser reativada antes de iniciar;
- encerramento manual fecha QR.

### ClassCancellation

Cancelamento de ocorrência recorrente prevista sem sessão iniciada.

Campos sugeridos:

- `id`
- `academy_id`
- `class_group_id`
- `occurrence_date`
- `created_by_user_id`
- `cancelled_at`
- `reverted_at` nullable
- `reverted_by_user_id` nullable

Regras:

- preservado por data mesmo se horário da turma mudar;
- não exige motivo.

## Presença

### Attendance

Presença do aluno em aula.

Campos sugeridos:

- `id`
- `academy_id`
- `class_session_id`
- `student_id`
- `source`: `qr | manual`
- `outside_class_group`: boolean
- `status`: `valid | invalidated`
- `confirmed_at`
- `created_by_user_id` nullable
- `invalidated_at` nullable
- `invalidated_by_user_id` nullable
- `invalidation_reason` nullable
- `created_at`

Regras:

- única por aluno/aula enquanto válida;
- presença fora da turma é permitida;
- presença manual deve ser distinguível;
- presença invalidada não conta para frequência/elegibilidade;
- motivo da invalidação é obrigatório e visível só ao instrutor;
- aluno vê status invalidada.

### QR assinado stateless

O QR Code da aula não exige tabela própria na V0. O backend gera tokens assinados com dados da aula e janela de validade; o aluno envia o token ao confirmar presença, e o backend valida assinatura, validade, aula ativa e regras de confirmação antes de criar a **Attendance**.

Regras:

- token renova a cada 30 segundos;
- aceita tolerância curta do token anterior;
- sem geolocalização;
- token não é persistido a cada rotação;
- apenas a presença confirmada é persistida.

## Graduação

### Belt

Faixa do BJJ.

Campos sugeridos:

- `id`
- `path`: `adult | child`
- `name`
- `order_index`
- `color`

### GraduationPromotion

Histórico formal de promoção.

Campos sugeridos:

- `id`
- `academy_id`
- `student_id`
- `previous_belt_id`
- `previous_degree`
- `new_belt_id`
- `new_degree`
- `promoted_at`
- `instructor_user_id`
- `note_visible_to_student`
- `created_at`

Regras:

- pode mudar grau, faixa ou ambos;
- troca de faixa reinicia grau em 0 por padrão, com ajuste permitido;
- observação é visível ao aluno.

### GraduationRule

Regra editável de elegibilidade.

Campos sugeridos:

- `id`
- `academy_id`
- `from_belt_id`
- `from_degree`
- `target_type`: `degree | belt`
- `minimum_days`
- `minimum_attendances`
- `created_at`
- `updated_at`

Regras:

- defaults inspirados na IBJJF;
- instrutor pode editar.

### GraduationSuggestionSnooze

Adiamento de sugestão de elegibilidade.

Campos sugeridos:

- `id`
- `academy_id`
- `student_id`
- `target_type`: `degree | belt`
- `snoozed_until`
- `reason` nullable
- `created_by_user_id`
- `created_at`

Regras:

- padrão de adiamento: 30 dias;
- motivo opcional;
- visível apenas ao instrutor.

## Mensalidades e Pix

### MonthlyFee

Mensalidade do aluno.

Campos sugeridos:

- `id`
- `academy_id`
- `student_id`
- `reference_month`
- `due_date`
- `amount`
- `status`: `open | verifying | paid | overdue | waived`
- `generated_by`: `automatic | manual`
- `created_by_user_id` nullable
- `paid_at` nullable
- `paid_by`: `verification | manual` nullable
- `manual_payment_note` nullable
- `waived_at` nullable
- `waived_by_user_id` nullable
- `waiver_reason` nullable
- `created_at`
- `updated_at`

Regras:

- única por aluno e mês de referência;
- rotina diária gera 5 dias antes do vencimento;
- em aberto vira atrasada no dia seguinte ao vencimento;
- em verificação não aparece como atrasada;
- sem pagamento parcial;
- dispensada exige motivo visível só ao instrutor.

### MonthlyFeeAdjustment

Ajuste pontual de valor.

Campos sugeridos:

- `id`
- `academy_id`
- `monthly_fee_id`
- `previous_amount`
- `new_amount`
- `reason`
- `created_by_user_id`
- `created_at`

Regras:

- motivo obrigatório;
- motivo visível só ao instrutor;
- aluno vê valor final.

### PaymentVerification

Tentativa de verificação de comprovante Pix.

Campos sugeridos:

- `id`
- `academy_id`
- `monthly_fee_id`
- `student_id`
- `receipt_file_url`
- `receipt_file_type`
- `receipt_file_size`
- `status`: `pending | approved | rejected`
- `submitted_at`
- `reviewed_at` nullable
- `reviewed_by_user_id` nullable
- `rejection_reason` nullable

Regras:

- comprovante é obrigatório;
- imagem ou PDF até 10 MB;
- aluno só reenvia após rejeição;
- rejeição exige motivo visível ao aluno;
- aprovação marca mensalidade como paga;
- comprovante fica preservado no histórico;
- aluno pode visualizar;
- instrutor pode visualizar e baixar.

## Anotações

### StudentNote

Anotação livre no perfil do aluno.

Campos sugeridos:

- `id`
- `academy_id`
- `student_id`
- `body`
- `visibility`: `student_visible | private`
- `archived_at` nullable
- `created_by_user_id`
- `created_at`
- `updated_at`

Regras:

- visível ao aluno por padrão;
- instrutor pode tornar privada;
- aluno não comenta;
- sem anexos;
- sem histórico de versões na V0;
- pode ser editada e arquivada.

## Importação/exportação

### StudentImport

Execução de importação CSV.

Campos sugeridos:

- `id`
- `academy_id`
- `file_url`
- `status`: `pending | processed | failed`
- `created_by_user_id`
- `created_at`
- `processed_at`

### StudentImportRow

Resultado por linha da importação.

Campos sugeridos:

- `id`
- `student_import_id`
- `row_number`
- `status`: `created | skipped | error | duplicate_warning`
- `message`
- `created_student_id` nullable

Regras:

- duplicidade por nome + data de nascimento;
- alerta para email já existente;
- não cria acesso do aluno automaticamente.

## Índices e restrições importantes

- `academy_id` em todas as entidades operacionais.
- `MonthlyFee`: único por `(academy_id, student_id, reference_month)`.
- `Attendance`: evitar duas presenças válidas para `(academy_id, class_session_id, student_id)`.
- `Student`: índice para `(academy_id, status)`, `(academy_id, name)`, `(academy_id, birth_date)`.
- `ClassSession`: índice para `(academy_id, class_group_id, scheduled_start_at)`.
- `PaymentVerification`: índice para `(academy_id, status)`.
- `StudentAccessInvite`: índice para token e expiração.

## Questões para detalhamento técnico posterior

- Como representar ocorrências recorrentes previstas sem materializar todas as aulas?
- Como implementar isolamento tenant no banco: RLS, camada de aplicação, ou ambos?
