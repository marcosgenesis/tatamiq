# V0 Architecture Diagrams

Diagramas Mermaid para visualizar o modelo de dados e os principais fluxos da V0.

## ER — visão geral

```mermaid
erDiagram
  ACADEMY ||--|| INSTRUCTOR_PROFILE : has
  USER ||--o| INSTRUCTOR_PROFILE : owns
  ACADEMY ||--o{ STUDENT : has
  USER ||--o| STUDENT : accesses
  ACADEMY ||--o{ CLASS_GROUP : has
  STUDENT }o--o{ CLASS_GROUP : joins
  CLASS_GROUP ||--o{ CLASS_SESSION : produces
  CLASS_SESSION ||--o{ ATTENDANCE : records
  STUDENT ||--o{ ATTENDANCE : has
  STUDENT ||--o{ MONTHLY_FEE : owes
  MONTHLY_FEE ||--o{ PAYMENT_VERIFICATION : verifies
  STUDENT ||--o{ GRADUATION_PROMOTION : receives
  STUDENT ||--o{ STUDENT_NOTE : has
```

## ER — academia, usuários e acesso do aluno

```mermaid
erDiagram
  ACADEMY {
    uuid id PK
    string name
    string logo_url
    string address
    string phone_whatsapp
    string instagram
    string pix_key
    string pix_copy_paste
  }

  USER {
    uuid id PK
    string email
    string password_hash
    enum role
  }

  INSTRUCTOR_PROFILE {
    uuid id PK
    uuid user_id FK
    uuid academy_id FK
    string name
  }

  STUDENT {
    uuid id PK
    uuid academy_id FK
    uuid user_id FK "nullable"
    string name
    date birth_date
    date enrollment_date
    enum status
    date inactive_at
    date read_only_access_until
    string phone
    string email
    string photo_url
    decimal monthly_amount
    int monthly_due_day
    uuid current_belt_id FK
    int current_degree
    enum graduation_path
  }

  GUARDIAN {
    uuid id PK
    uuid academy_id FK
    string name
    string phone
    string email
  }

  STUDENT_GUARDIAN {
    uuid student_id FK
    uuid guardian_id FK
  }

  STUDENT_ACCESS_INVITE {
    uuid id PK
    uuid academy_id FK
    uuid student_id FK
    string token_hash
    enum status
    datetime expires_at
    datetime accepted_at
    datetime revoked_at
    uuid created_by_user_id FK
  }

  STUDENT_ACCEPTANCE {
    uuid id PK
    uuid academy_id FK
    uuid student_id FK
    uuid user_id FK
    datetime accepted_at
    string terms_version
  }

  ACADEMY ||--|| INSTRUCTOR_PROFILE : owns
  USER ||--o| INSTRUCTOR_PROFILE : instructor_account
  ACADEMY ||--o{ STUDENT : has
  USER ||--o| STUDENT : student_account
  ACADEMY ||--o{ GUARDIAN : has
  STUDENT ||--o{ STUDENT_GUARDIAN : has
  GUARDIAN ||--o{ STUDENT_GUARDIAN : responsible_for
  STUDENT ||--o{ STUDENT_ACCESS_INVITE : receives
  STUDENT ||--o{ STUDENT_ACCEPTANCE : accepts
  USER ||--o{ STUDENT_ACCEPTANCE : performs
```

## ER — turmas, agenda e presenças

```mermaid
erDiagram
  CLASS_GROUP {
    uuid id PK
    uuid academy_id FK
    string name
    int default_duration_minutes
    enum status
    datetime archived_at
  }

  CLASS_GROUP_SCHEDULE {
    uuid id PK
    uuid academy_id FK
    uuid class_group_id FK
    int weekday
    time start_time
    date effective_from
    date effective_until
  }

  CLASS_GROUP_TAG {
    uuid id PK
    uuid academy_id FK
    uuid class_group_id FK
    string label
  }

  STUDENT_CLASS_GROUP {
    uuid student_id FK
    uuid class_group_id FK
    date active_from
    date active_until
  }

  CLASS_SESSION {
    uuid id PK
    uuid academy_id FK
    uuid class_group_id FK
    enum kind
    datetime scheduled_start_at
    datetime actual_start_at
    int duration_minutes
    datetime ended_at
    enum status
    datetime cancelled_at
    uuid cancelled_by_user_id FK
    uuid created_by_user_id FK
  }

  CLASS_CANCELLATION {
    uuid id PK
    uuid academy_id FK
    uuid class_group_id FK
    date occurrence_date
    uuid created_by_user_id FK
    datetime cancelled_at
    datetime reverted_at
    uuid reverted_by_user_id FK
  }

  CLASS_QR_TOKEN {
    uuid id PK
    uuid academy_id FK
    uuid class_session_id FK
    string token_hash
    datetime valid_from
    datetime valid_until
  }

  ATTENDANCE {
    uuid id PK
    uuid academy_id FK
    uuid class_session_id FK
    uuid student_id FK
    enum source
    boolean outside_class_group
    enum status
    datetime confirmed_at
    uuid created_by_user_id FK
    datetime invalidated_at
    uuid invalidated_by_user_id FK
    string invalidation_reason
  }

  ACADEMY ||--o{ CLASS_GROUP : has
  CLASS_GROUP ||--o{ CLASS_GROUP_SCHEDULE : schedules
  CLASS_GROUP ||--o{ CLASS_GROUP_TAG : tagged_with
  STUDENT }o--o{ CLASS_GROUP : joins
  STUDENT_CLASS_GROUP }o--|| STUDENT : links
  STUDENT_CLASS_GROUP }o--|| CLASS_GROUP : links
  CLASS_GROUP ||--o{ CLASS_SESSION : has
  CLASS_GROUP ||--o{ CLASS_CANCELLATION : cancels_occurrence
  CLASS_SESSION ||--o{ CLASS_QR_TOKEN : rotates
  CLASS_SESSION ||--o{ ATTENDANCE : has
  STUDENT ||--o{ ATTENDANCE : confirms
```

## ER — graduação

```mermaid
erDiagram
  BELT {
    uuid id PK
    enum path
    string name
    int order_index
    string color
  }

  GRADUATION_PROMOTION {
    uuid id PK
    uuid academy_id FK
    uuid student_id FK
    uuid previous_belt_id FK
    int previous_degree
    uuid new_belt_id FK
    int new_degree
    datetime promoted_at
    uuid instructor_user_id FK
    string note_visible_to_student
  }

  GRADUATION_RULE {
    uuid id PK
    uuid academy_id FK
    uuid from_belt_id FK
    int from_degree
    enum target_type
    int minimum_days
    int minimum_attendances
  }

  GRADUATION_SUGGESTION_SNOOZE {
    uuid id PK
    uuid academy_id FK
    uuid student_id FK
    enum target_type
    datetime snoozed_until
    string reason
    uuid created_by_user_id FK
  }

  STUDENT }o--|| BELT : current_belt
  STUDENT ||--o{ GRADUATION_PROMOTION : receives
  BELT ||--o{ GRADUATION_PROMOTION : previous
  BELT ||--o{ GRADUATION_PROMOTION : next
  BELT ||--o{ GRADUATION_RULE : starts_from
  STUDENT ||--o{ GRADUATION_SUGGESTION_SNOOZE : snoozes
```

## ER — mensalidades, Pix e verificações

```mermaid
erDiagram
  MONTHLY_FEE {
    uuid id PK
    uuid academy_id FK
    uuid student_id FK
    string reference_month
    date due_date
    decimal amount
    enum status
    enum generated_by
    uuid created_by_user_id FK
    datetime paid_at
    enum paid_by
    string manual_payment_note
    datetime waived_at
    uuid waived_by_user_id FK
    string waiver_reason
  }

  MONTHLY_FEE_ADJUSTMENT {
    uuid id PK
    uuid academy_id FK
    uuid monthly_fee_id FK
    decimal previous_amount
    decimal new_amount
    string reason
    uuid created_by_user_id FK
    datetime created_at
  }

  PAYMENT_VERIFICATION {
    uuid id PK
    uuid academy_id FK
    uuid monthly_fee_id FK
    uuid student_id FK
    string receipt_file_url
    string receipt_file_type
    int receipt_file_size
    enum status
    datetime submitted_at
    datetime reviewed_at
    uuid reviewed_by_user_id FK
    string rejection_reason
  }

  STUDENT ||--o{ MONTHLY_FEE : owes
  MONTHLY_FEE ||--o{ MONTHLY_FEE_ADJUSTMENT : adjusted_by
  MONTHLY_FEE ||--o{ PAYMENT_VERIFICATION : verified_by
  STUDENT ||--o{ PAYMENT_VERIFICATION : submits
```

## ER — anotações e importação

```mermaid
erDiagram
  STUDENT_NOTE {
    uuid id PK
    uuid academy_id FK
    uuid student_id FK
    string body
    enum visibility
    datetime archived_at
    uuid created_by_user_id FK
    datetime created_at
    datetime updated_at
  }

  STUDENT_IMPORT {
    uuid id PK
    uuid academy_id FK
    string file_url
    enum status
    uuid created_by_user_id FK
    datetime created_at
    datetime processed_at
  }

  STUDENT_IMPORT_ROW {
    uuid id PK
    uuid student_import_id FK
    int row_number
    enum status
    string message
    uuid created_student_id FK
  }

  STUDENT ||--o{ STUDENT_NOTE : has
  STUDENT_IMPORT ||--o{ STUDENT_IMPORT_ROW : contains
  STUDENT ||--o{ STUDENT_IMPORT_ROW : created_from
```

## Sequência — convite e primeiro acesso do aluno

```mermaid
sequenceDiagram
  actor Instrutor
  participant App
  participant DB
  actor Aluno

  Instrutor->>App: Gera convite para aluno existente
  App->>DB: Cria StudentAccessInvite pendente com expiração de 7 dias
  App-->>Instrutor: Mostra link/código para copiar
  Instrutor-->>Aluno: Envia link por fora
  Aluno->>App: Abre convite
  App->>DB: Valida token, status e expiração
  Aluno->>App: Cria conta ou entra com conta existente
  App->>DB: Vincula User ao Student
  Aluno->>App: Aceita termo simples
  App->>DB: Cria StudentAcceptance e marca convite aceito
  App-->>Aluno: Libera área do aluno
```

## Sequência — chamada com QR e confirmação de presença

```mermaid
sequenceDiagram
  actor Instrutor
  participant App
  participant DB
  actor Aluno

  Instrutor->>App: Inicia chamada da turma
  App->>DB: Cria ClassSession ativa com início real
  loop A cada 30 segundos
    App->>DB: Gera ClassQrToken temporário
    App-->>Instrutor: Exibe QR atual
  end
  Aluno->>App: Escaneia QR logado
  App->>DB: Valida token, aula ativa e janela de validade
  App->>DB: Verifica vínculo aluno-turma
  App->>DB: Cria Attendance source=qr, outside_class_group conforme vínculo
  App-->>Aluno: Confirma presença registrada
  Instrutor->>App: Encerra aula manualmente
  App->>DB: Marca ClassSession encerrada
  App-->>Instrutor: QR fechado
```

## Sequência — presença manual e invalidação

```mermaid
sequenceDiagram
  actor Instrutor
  participant App
  participant DB
  actor Aluno

  Instrutor->>App: Adiciona presença manual
  App->>DB: Cria Attendance source=manual
  App-->>Instrutor: Presença registrada
  Aluno->>App: Consulta histórico
  App-->>Aluno: Mostra presença válida
  Instrutor->>App: Invalida presença com motivo
  App->>DB: Marca Attendance invalidated com motivo e autor
  App-->>Instrutor: Presença invalidada
  Aluno->>App: Consulta histórico
  App-->>Aluno: Mostra presença como invalidada, sem motivo
```

## Sequência — geração de mensalidade e verificação Pix

```mermaid
sequenceDiagram
  participant Job
  participant DB
  actor Aluno
  participant App
  actor Instrutor

  Job->>DB: Busca alunos ativos com vencimento em 5 dias
  Job->>DB: Cria MonthlyFee se não existir para aluno/mês
  Aluno->>App: Abre mensalidade
  App-->>Aluno: Mostra valor, vencimento e Pix da Academia
  Aluno->>App: Envia Comprovante Pix obrigatório
  App->>DB: Cria PaymentVerification pending
  App->>DB: Marca MonthlyFee como verifying
  Instrutor->>App: Abre fila de pagamentos em verificação
  Instrutor->>App: Aprova comprovante
  App->>DB: Marca PaymentVerification approved
  App->>DB: Marca MonthlyFee paid
  App-->>Aluno: Mostra mensalidade paga
```

## Sequência — rejeição e reenvio de comprovante

```mermaid
sequenceDiagram
  actor Instrutor
  participant App
  participant DB
  actor Aluno

  Instrutor->>App: Rejeita comprovante com motivo
  App->>DB: Marca PaymentVerification rejected com motivo
  App->>DB: Retorna MonthlyFee para open ou overdue conforme vencimento
  App-->>Aluno: Mostra rejeição e motivo
  Aluno->>App: Envia novo comprovante
  App->>DB: Cria nova PaymentVerification pending
  App->>DB: Marca MonthlyFee como verifying
```

## Sequência — elegibilidade e promoção de graduação

```mermaid
sequenceDiagram
  actor Instrutor
  participant App
  participant DB

  Instrutor->>App: Abre lista de elegíveis
  App->>DB: Busca graduação atual, regras, presenças válidas e snoozes
  App-->>Instrutor: Mostra elegíveis separados por grau/faixa
  Instrutor->>App: Adia sugestão
  App->>DB: Cria GraduationSuggestionSnooze por 30 dias
  Instrutor->>App: Registra promoção
  App->>DB: Cria GraduationPromotion com graduação anterior e nova
  App->>DB: Atualiza graduação atual do Student
  App-->>Instrutor: Promoção registrada
```

## Sequência — cancelamento de aula prevista

```mermaid
sequenceDiagram
  actor Instrutor
  participant App
  participant DB
  actor Aluno

  Instrutor->>App: Cancela ocorrência prevista
  App->>DB: Cria ClassCancellation por data
  App-->>Instrutor: Ocorrência aparece cancelada
  Aluno->>App: Abre agenda dos próximos 7 dias
  App->>DB: Carrega agenda e cancelamentos
  App-->>Aluno: Mostra aula cancelada e indicador interno
  Instrutor->>App: Reverte cancelamento
  App->>DB: Marca ClassCancellation reverted
  App-->>Aluno: Aula volta à agenda
```
