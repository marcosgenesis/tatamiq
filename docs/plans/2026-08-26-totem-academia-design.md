# Design: Aplicativo do Totem da Academia

## Objetivo

O **Totem da Academia** é um cliente web independente do gestor para apoiar o **Responsável da Academia** durante a chamada. Ele mantém uma tela pública com o QR da aula ativa ou permite iniciar uma ocorrência prevista para o dia e então exibe o QR.

## Decisões validadas

- Aplicativo web separado, acessado por URL própria, sem instalação obrigatória.
- Mesma API e mesma fonte de dados do Tatamiq; não haverá backend ou regras de domínio duplicadas.
- **Modo Totem** restrito, concedido por código curto de uso único, válido por 10 minutos; QR de pareamento é opcional.
- Pareamento persistente até revogação, com nome do dispositivo e revogação individual. Não há saída local comum.
- Online-required: iniciar, consultar estado e renovar QR exigem servidor.
- Piso Apple oficial: iPad de 7ª geração; retrato e paisagem são suportados. Android terá suporte amplo em navegadores Chromium compatíveis, sem modelo obrigatório.
- Uma Academia pode ter várias aulas e vários totens simultaneamente.
- Uma aula ativa é aberta automaticamente; várias exigem seleção explícita. “Trocar aula” só muda o QR exibido.
- Sem aula ativa, o totem lista ocorrências previstas para hoje, incluindo Aulas Avulsas já cadastradas. O professor pode iniciar qualquer uma, cedo ou tarde, mediante confirmação; não há criação de aula nem início automático.
- A aula encerra automaticamente no servidor em `actualStartAt + durationMinutes`; o gestor pode encerrar antes, mas o totem não tem botão de encerramento.
- Após o fim, o totem volta à lista do dia.
- O QR exibido contém a URL canônica do portal do aluno, nunca a URL do totem.
- A tela ativa mostra somente QR grande, turma, início, previsão de término, renovação e conexão; não mostra alunos, presenças ou dados financeiros.

## Fluxo

1. O gestor gera um código de pareamento e informa o nome do dispositivo.
2. O totem abre a URL própria e recebe o código.
3. A API valida o código, vincula o dispositivo à Academia e emite uma sessão restrita persistente.
4. Com sessão válida, o totem consulta aulas ativas e ocorrências do dia.
5. Uma aula ativa é exibida; várias aparecem para seleção.
6. Sem aula ativa, o responsável seleciona e confirma uma ocorrência do dia.
7. O totem busca o token rotativo e monta a URL canônica do portal do aluno.
8. A cada renovação ou mudança de estado, o servidor continua sendo a fonte de verdade.
9. Revogação, bloqueio do responsável ou perda da Academia limpa a autorização local e retorna ao pareamento.

## API e segurança

O novo cliente deve usar endpoints restritos próprios para pareamento, estado do totem, lista de ocorrências iniciáveis, início de ocorrência, aula ativa e token QR. A sessão do totem não deve satisfazer guardas de organização do gestor por acidente nem receber permissões de `owner` no cliente.

O código de pareamento é temporário e de uso único. A sessão persistente é revogável por dispositivo, e toda consulta deve validar Academia, autorização e estado atual. O QR de presença continua sendo validado pela API existente e aponta para a origem configurada do portal do aluno.

## Compatibilidade e falhas

O cliente evita dependências de câmera e recursos nativos. Em perda de conexão, mostra estado explícito e não inicia aula nem publica um QR renovado. Em revogação detectada, remove a sessão local e não conserva QR em cache. O layout deve manter o QR inteiro e legível em retrato e paisagem.

## Verificação

- Testes unitários para expiração/uso único do pareamento, escopo da sessão, revogação e transição automática da aula.
- Testes de contrato para URLs do portal do aluno e endpoints restritos.
- Testes de integração para uma, várias e nenhuma aula ativa; início cedo/tarde; encerramento automático; reconexão e revogação.
- Teste manual ou Playwright em viewport de iPad 7ª geração, retrato e paisagem, além de viewport Android Chromium.
