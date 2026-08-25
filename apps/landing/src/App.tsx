import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  GraduationCap,
  Menu,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { useState } from "react";

const whatsappHref = "https://wa.me/?text=Oi%20quero%20conhecer%20o%20Tatamiq";

const benefits = [
  {
    number: "01",
    icon: UsersRound,
    title: "Alunos sem planilha",
    copy: "Cadastros, turmas e histórico organizados para você encontrar o que importa em poucos toques.",
    tone: "orange",
  },
  {
    number: "02",
    icon: GraduationCap,
    title: "Graduação com memória",
    copy: "Faixas, graus, promoções e elegibilidade registrados para cada aluno — sem depender da cabeça do professor.",
    tone: "cream",
  },
  {
    number: "03",
    icon: CreditCard,
    title: "Mensalidade sob controle",
    copy: "Pendências, vencimentos e comprovantes Pix em uma visão simples, pronta para a rotina do tatame.",
    tone: "ink",
  },
];

const faqs = [
  [
    "O Tatamiq é feito só para Jiu-Jitsu?",
    "A primeira versão foi desenhada para CTs de Brazilian Jiu-Jitsu, com faixas, graus e regras de graduação que fazem sentido para essa rotina.",
  ],
  [
    "Quanto tempo leva para começar?",
    "Você começa com uma importação da sua planilha e acompanhamento próximo. A ideia é colocar o Tatamiq na rotina sem trocar tudo de uma vez.",
  ],
  [
    "Como funciona o teste?",
    "Você pode testar por 30 dias com acompanhamento. A ideia é colocar o Tatamiq na rotina real antes de tomar uma decisão.",
  ],
  [
    "O aluno também usa o sistema?",
    "Sim. O portal do aluno mostra próximas aulas, presenças, evolução e mensalidades, além de permitir o envio de comprovante Pix.",
  ],
  [
    "Posso cancelar quando quiser?",
    "Sim. O plano mensal não tem fidelidade ou taxa de cancelamento.",
  ],
];

function Mark({ small = false }: { small?: boolean }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Tatamiq"
      className={`brand-mark ${small ? "brand-mark-small" : ""}`}
    >
      <path
        d="M119.656 63.4746C124.388 60.931 130.094 60.9779 134.784 63.599L190.824 94.9215C197.504 98.6551 200.514 106.65 197.951 113.85L178.179 169.377C176.905 172.953 174.376 175.947 171.059 177.803L134.078 198.497C129.366 201.134 123.626 201.169 118.881 198.592L80.5917 177.792C77.192 175.945 74.5952 172.911 73.2992 169.271L53.6397 114.059C51.0434 106.768 54.1663 98.6766 60.9933 95.0069L119.656 63.4746Z"
        fill="#A22000"
      />
      <path
        d="M133.754 175.149C129.368 177.682 123.963 177.693 119.566 175.178L39.1464 129.183C29.6348 123.743 29.6137 110.06 39.1085 104.591L121.035 57.3998C125.357 54.9104 130.67 54.8647 135.034 57.2793L216.678 102.452C226.339 107.797 226.465 121.615 216.905 127.135L133.754 175.149Z"
        fill="#FF4F00"
      />
    </svg>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <a className={`brand ${light ? "brand-light" : ""}`} href="#top" aria-label="Tatamiq — início">
      <Mark />
      <span>Tatamiq</span>
    </a>
  );
}

function DashboardMockup() {
  return (
    <div className="dashboard-stage" role="img" aria-label="Prévia ilustrativa do painel Tatamiq">
      <div className="dashboard-glow" />
      <div className="dashboard-window">
        <div className="window-bar">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>prévia ilustrativa · tatamiq.app / painel</span>
          <span className="window-status">
            <span /> online
          </span>
        </div>
        <div className="dashboard-body">
          <aside className="dashboard-side">
            <Mark small />
            <div className="side-nav active">
              <BarChart3 size={15} /> <span>Painel</span>
            </div>
            <div className="side-nav">
              <UsersRound size={15} /> <span>Alunos</span>
            </div>
            <div className="side-nav">
              <ScanLine size={15} /> <span>Presenças</span>
            </div>
            <div className="side-nav">
              <GraduationCap size={15} /> <span>Graduação</span>
            </div>
            <div className="side-nav">
              <CreditCard size={15} /> <span>Financeiro</span>
            </div>
            <div className="side-nav muted">
              <BellRing size={15} /> <span>Atividade</span>
            </div>
            <div className="side-bottom">
              <div className="avatar">RM</div>
              <span>Rafael · responsável</span>
            </div>
          </aside>
          <main className="dashboard-main">
            <div className="dashboard-heading">
              <div>
                <p className="dash-kicker">TERÇA, 18 DE AGOSTO</p>
                <h3>Boa noite, Rafael.</h3>
              </div>
              <button type="button" className="dash-button">
                <QrCode size={14} /> Iniciar chamada
              </button>
            </div>
            <div className="dash-stats">
              <div>
                <span>Alunos ativos</span>
                <strong>86</strong>
                <small>
                  <b>+4</b> neste mês
                </small>
              </div>
              <div>
                <span>Presenças hoje</span>
                <strong>
                  64<span>/86</span>
                </strong>
                <small>
                  <b>74%</b> do CT
                </small>
              </div>
              <div>
                <span>Em aberto</span>
                <strong>R$ 2.480</strong>
                <small>
                  <em>12 mensalidades</em>
                </small>
              </div>
            </div>
            <div className="dash-columns">
              <div className="dash-panel attendance-panel">
                <div className="panel-title">
                  <span>Próximas aulas</span>
                  <a href="#recursos">
                    Ver agenda <ArrowRight size={12} />
                  </a>
                </div>
                <div className="class-row now">
                  <div className="class-time">
                    18:00<small>em aula</small>
                  </div>
                  <div className="class-info">
                    <strong>Jiu-Jitsu adulto</strong>
                    <span>Faixa branca · 24 alunos</span>
                  </div>
                  <div className="class-count">
                    18 <small>/ 24</small>
                  </div>
                </div>
                <div className="class-row">
                  <div className="class-time">
                    19:00<small>próxima</small>
                  </div>
                  <div className="class-info">
                    <strong>Jiu-Jitsu iniciante</strong>
                    <span>Faixa branca · 17 alunos</span>
                  </div>
                  <div className="class-count muted-count">—</div>
                </div>
                <div className="class-row">
                  <div className="class-time">
                    20:00<small>próxima</small>
                  </div>
                  <div className="class-info">
                    <strong>Jiu-Jitsu avançado</strong>
                    <span>Faixa azul · 21 alunos</span>
                  </div>
                  <div className="class-count muted-count">—</div>
                </div>
              </div>
              <div className="dash-panel graduation-panel">
                <div className="panel-title">
                  <span>Prontos para graduar</span>
                  <a href="#recursos">
                    Ver todos <ArrowRight size={12} />
                  </a>
                </div>
                <div className="belt-person">
                  <span className="person-avatar orange-avatar">AL</span>
                  <span>
                    <strong>André Lima</strong>
                    <small>Azul · 11 meses</small>
                  </span>
                  <b>Apto</b>
                </div>
                <div className="belt-person">
                  <span className="person-avatar purple-avatar">MD</span>
                  <span>
                    <strong>Marina Duarte</strong>
                    <small>Roxa · 16 meses</small>
                  </span>
                  <b>Apto</b>
                </div>
                <div className="belt-person">
                  <span className="person-avatar black-avatar">HC</span>
                  <span>
                    <strong>Helena Castro</strong>
                    <small>Branca · 5 meses</small>
                  </span>
                  <b className="wait">+2 meses</b>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="dashboard-tag tag-left">
        <span className="tag-dot" /> Presença em tempo real
      </div>
      <div className="dashboard-tag tag-right">
        <GraduationCap size={15} /> graduação organizada
      </div>
    </div>
  );
}

function StudentMockup() {
  return (
    <div className="student-device" role="img" aria-label="Prévia ilustrativa do portal do aluno">
      <div className="device-notch" />
      <div className="student-top">
        <span>20:42</span>
        <span>•••</span>
      </div>
      <div className="student-brand">
        <Mark small />
        <span>Tatamiq</span>
      </div>
      <div className="student-greeting">
        <small>TERÇA, 18 DE AGOSTO</small>
        <h4>Oss, Marina.</h4>
        <p>Pronta para mais um treino?</p>
      </div>
      <div className="student-belt">
        <div>
          <span>EVOLUÇÃO</span>
          <strong>Faixa roxa</strong>
          <small>2º grau · 16 meses</small>
        </div>
        <div className="belt-chip purple-chip" />
      </div>
      <div className="student-next">
        <div className="student-section-title">
          <span>Próxima aula</span>
          <span className="live-pill">HOJE</span>
        </div>
        <strong>Jiu-Jitsu adulto</strong>
        <span>18:00 · Tatame 1</span>
        <button type="button">
          <QrCode size={16} /> Confirmar presença
        </button>
      </div>
      <div className="student-tabs">
        <span className="active">Início</span>
        <span>Presenças</span>
        <span>Financeiro</span>
      </div>
    </div>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="site-shell" id="top">
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <div className="container nav-inner">
          <Logo />
          <button
            type="button"
            className="menu-trigger"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav id="primary-navigation" className={`main-nav ${menuOpen ? "open" : ""}`}>
            {/* biome-ignore lint/a11y/useValidAnchor: intentional same-page navigation */}
            <a href="#como-funciona" onClick={closeMenu}>
              Como funciona
            </a>
            {/* biome-ignore lint/a11y/useValidAnchor: intentional same-page navigation */}
            <a href="#recursos" onClick={closeMenu}>
              Recursos
            </a>
            {/* biome-ignore lint/a11y/useValidAnchor: intentional same-page navigation */}
            <a href="#preco" onClick={closeMenu}>
              Preço
            </a>
            {/* biome-ignore lint/a11y/useValidAnchor: intentional same-page navigation */}
            <a href="#faq" onClick={closeMenu}>
              FAQ
            </a>
            <a
              className="nav-cta"
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={closeMenu}
            >
              Agendar demonstração <ArrowUpRight />
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero section-dark">
          <div className="hero-grid" aria-hidden="true" />
          <div className="container hero-layout">
            <div className="hero-copy reveal reveal-one">
              <p className="hero-audience">Para professores e responsáveis por CTs de Jiu-Jitsu</p>
              <h1>
                Pare de administrar no improviso. <em>Volte a ensinar.</em>
              </h1>
              <p className="hero-subtitle">
                O Tatamiq reúne alunos, turmas, presença, graduação e mensalidades em um só lugar —
                para você saber o que está acontecendo no CT sem depender de planilhas, mensagens
                soltas ou memória.
              </p>
              <div className="hero-actions">
                <a
                  className="button button-primary"
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Agendar demonstração <ArrowUpRight size={17} />
                </a>
                <a className="button button-ghost" href="#como-funciona">
                  Ver como funciona <ArrowDownRight size={17} />
                </a>
              </div>
              <div className="hero-microproof">
                <span className="micro-check">
                  <Check size={12} />
                </span>
                <span>30 dias acompanhados</span>
                <span className="micro-separator" />
                <span>sem taxa de implantação</span>
              </div>
              <div className="hero-proof">
                <span className="hero-proof-dot" />
                <span>
                  <strong>Validado em rotina real</strong>
                  <small>Um CT-piloto já escolheu usar o Tatamiq como padrão.</small>
                </span>
              </div>
            </div>
            <div className="hero-visual reveal reveal-two">
              <DashboardMockup />
            </div>
          </div>
          <div className="hero-bottom container">
            <span>Gestão feita para a rotina real</span>
            <span className="scroll-line" />
            <span>
              Role para explorar <ArrowDownRight size={14} />
            </span>
          </div>
        </section>

        <section className="benefits-section section-paper" id="como-funciona">
          <div className="container">
            <div className="section-intro">
              <div>
                <span className="eyebrow eyebrow-dark">
                  <span className="eyebrow-line" /> O essencial, no lugar certo
                </span>
                <h2>
                  Menos tempo administrando.
                  <br />
                  <em>Mais tempo no tatame.</em>
                </h2>
              </div>
              <p>
                O Tatamiq transforma os pequenos atritos da operação em uma rotina clara — do
                primeiro cadastro à próxima graduação.
              </p>
            </div>
            <div className="benefits-grid">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <article className={`benefit-card ${benefit.tone}`} key={benefit.number}>
                    <div className="benefit-top">
                      <span>{benefit.number}</span>
                      <Icon size={22} strokeWidth={1.8} />
                    </div>
                    <h3>{benefit.title}</h3>
                    <p>{benefit.copy}</p>
                    <span className="card-arrow">
                      <ArrowUpRight size={17} />
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="process-section section-ink">
          <div className="container process-layout">
            <div className="process-copy">
              <span className="eyebrow">
                <span className="eyebrow-line" /> Do cadastro ao tatame
              </span>
              <h2>Começar é mais simples do que parece.</h2>
              <p>
                Você não precisa mudar tudo de uma vez. A gente coloca o sistema para rodar junto
                com a sua rotina.
              </p>
              <a className="text-link" href={whatsappHref} target="_blank" rel="noreferrer">
                Quero conhecer o Tatamiq <ArrowRight size={16} />
              </a>
            </div>
            <div className="process-steps">
              <div className="process-step">
                <span className="step-number">01</span>
                <div>
                  <h3>Configure o seu CT</h3>
                  <p>Cadastre turmas, horários, regras de graduação e importe seus alunos.</p>
                </div>
              </div>
              <div className="step-connector" />
              <div className="process-step">
                <span className="step-number">02</span>
                <div>
                  <h3>Coloque a operação no ritmo</h3>
                  <p>Abra a chamada, acompanhe a frequência e mantenha as mensalidades em dia.</p>
                </div>
              </div>
              <div className="step-connector" />
              <div className="process-step">
                <span className="step-number">03</span>
                <div>
                  <h3>Deixe o aluno participar</h3>
                  <p>O portal mostra agenda, presenças, evolução e comprovantes Pix.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section section-paper" id="recursos">
          <div className="container">
            <div className="section-heading-centered">
              <span className="eyebrow eyebrow-dark">
                <span className="eyebrow-line" /> Tudo conversa
              </span>
              <h2>
                Uma visão mais clara
                <br />
                <em>de cada aluno.</em>
              </h2>
            </div>
            <div className="feature-split feature-split-first">
              <div className="feature-copy">
                <span className="feature-index">01 / PRESENÇA</span>
                <h3>Chamada sem caderno, sem confusão.</h3>
                <p>
                  Um QR Code rotativo registra a presença em segundos. Quando alguém precisa, o
                  lançamento manual continua disponível — sem apagar o histórico.
                </p>
                <ul>
                  <li>
                    <CheckCircle2 size={17} /> QR Code que muda a cada 30 segundos
                  </li>
                  <li>
                    <CheckCircle2 size={17} /> Correção manual pelo responsável
                  </li>
                  <li>
                    <CheckCircle2 size={17} /> Histórico por aluno e por turma
                  </li>
                </ul>
              </div>
              <div className="feature-visual attendance-art">
                <div className="scan-card">
                  <div className="scan-card-top">
                    <span>CHAMADA ABERTA</span>
                    <span className="pulse-dot" />
                  </div>
                  <div className="qr-placeholder">
                    <QrCode size={134} strokeWidth={1.1} />
                    <div className="scan-corner corner-a" />
                    <div className="scan-corner corner-b" />
                    <div className="scan-corner corner-c" />
                    <div className="scan-corner corner-d" />
                  </div>
                  <div className="scan-card-bottom">
                    <span>Jiu-Jitsu adulto</span>
                    <strong>
                      18 <small>/ 24 presentes</small>
                    </strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="feature-split feature-split-reverse">
              <div className="feature-copy">
                <span className="feature-index">02 / PORTAL DO ALUNO</span>
                <h3>O aluno acompanha a própria evolução.</h3>
                <p>
                  Uma experiência simples no celular para consultar a próxima aula, presença,
                  mensalidades e o caminho até a próxima faixa.
                </p>
                <a
                  className="text-link dark-link"
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver o portal do aluno <ArrowRight size={16} />
                </a>
              </div>
              <div className="feature-visual student-art">
                <StudentMockup />
                <div className="float-note note-belt">
                  <Sparkles size={15} />
                  <span>
                    <strong>Progresso visível</strong>
                    <small>2º grau · faixa roxa</small>
                  </span>
                </div>
              </div>
            </div>
            <div className="feature-split feature-split-third">
              <div className="feature-copy">
                <span className="feature-index">03 / FINANCEIRO</span>
                <h3>Cobrar não precisa ser constrangedor.</h3>
                <p>
                  Tenha uma visão objetiva do que está aberto e receba comprovantes Pix sem
                  transformar cada mensalidade em uma conversa perdida.
                </p>
                <div className="mini-metric">
                  <span className="metric-icon">
                    <CreditCard size={17} />
                  </span>
                  <span>
                    <strong>R$ 2.480,00</strong>
                    <small>em aberto este mês</small>
                  </span>
                  <span className="metric-trend">↓ 18%</span>
                </div>
              </div>
              <div className="feature-visual finance-art">
                <div className="finance-card">
                  <div className="finance-top">
                    <span>RECEITA DO MÊS</span>
                    <MoreHorizontalDots />
                  </div>
                  <strong>R$ 18.640,00</strong>
                  <div className="finance-chart">
                    <i style={{ height: "35%" }} />
                    <i style={{ height: "48%" }} />
                    <i style={{ height: "42%" }} />
                    <i style={{ height: "66%" }} />
                    <i style={{ height: "58%" }} />
                    <i className="current" style={{ height: "88%" }} />
                    <i style={{ height: "72%" }} />
                    <i style={{ height: "96%" }} />
                  </div>
                  <div className="finance-axis">
                    <span>jun</span>
                    <span>jul</span>
                    <span>ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="proof-strip-section section-paper" aria-label="Prova da rotina">
          <div className="container proof-strip">
            <div>
              <span className="proof-strip-label">PROVA DA ROTINA</span>
              <strong>O Tatamiq já foi validado por um CT de Jiu-Jitsu em uso real.</strong>
            </div>
            <a className="text-link dark-link" href="#depoimento">
              Ler o depoimento <ArrowRight size={16} />
            </a>
          </div>
        </section>

        <section className="pricing-section section-orange" id="preco">
          <div className="container">
            <div className="pricing-heading">
              <div>
                <span className="eyebrow eyebrow-dark">
                  <span className="eyebrow-line" /> Comece com o essencial
                </span>
                <h2>
                  Um CT inteiro.
                  <br />
                  <em>Um preço simples.</em>
                </h2>
              </div>
              <p>Sem módulos escondidos, sem cobrança por aluno e sem contrato que prende você.</p>
            </div>
            <div className="pricing-grid">
              <article className="price-card price-card-light">
                <div className="price-label">TESTE ACOMPANHADO</div>
                <h3>Primeiros 30 dias</h3>
                <div className="price-value">
                  <sup>R$</sup>0<span>/30 dias</span>
                </div>
                <p>Veja o Tatamiq funcionando na sua rotina antes de decidir.</p>
                <a
                  className="price-button price-button-outline"
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Agendar teste <ArrowUpRight size={16} />
                </a>
                <ul>
                  <li>
                    <Check size={15} /> Configuração inicial
                  </li>
                  <li>
                    <Check size={15} /> Importação da sua planilha
                  </li>
                  <li>
                    <Check size={15} /> Suporte próximo
                  </li>
                </ul>
              </article>
              <article className="price-card price-card-dark popular-card">
                <div className="popular-ribbon">MAIS ESCOLHIDO</div>
                <div className="price-label">PLANO TATAMIQ</div>
                <h3>Operação completa</h3>
                <div className="price-value">
                  <sup>R$</sup>89<span>/mês</span>
                </div>
                <p>Tudo para organizar alunos, aulas, graduação e mensalidades.</p>
                <a
                  className="price-button price-button-orange"
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Quero começar <ArrowUpRight size={16} />
                </a>
                <ul>
                  <li>
                    <Check size={15} /> Alunos e responsáveis ilimitados
                  </li>
                  <li>
                    <Check size={15} /> Portal do aluno incluso
                  </li>
                  <li>
                    <Check size={15} /> Cancele quando quiser
                  </li>
                </ul>
              </article>
              <article className="price-card price-card-light">
                <div className="price-label">PLANO ANUAL</div>
                <h3>Mais tranquilidade</h3>
                <div className="price-value">
                  <sup>R$</sup>899<span>/ano</span>
                </div>
                <p>O equivalente a dois meses grátis para manter o foco no tatame.</p>
                <a
                  className="price-button price-button-outline"
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  Falar sobre o anual <ArrowUpRight size={16} />
                </a>
                <ul>
                  <li>
                    <Check size={15} /> Todos os recursos do Tatamiq
                  </li>
                  <li>
                    <Check size={15} /> Pagamento antecipado
                  </li>
                  <li>
                    <Check size={15} /> Suporte próximo
                  </li>
                </ul>
              </article>
            </div>
            <p className="pricing-footnote">
              <ShieldCheck size={14} /> Sem taxa de implantação · Pagamento via Pix ou cartão
            </p>
          </div>
        </section>

        <section className="testimonial-section section-dark" id="depoimento">
          <div className="container">
            <div className="testimonial-heading">
              <span className="eyebrow">
                <span className="eyebrow-line" /> Feito na rotina real
              </span>
              <h2>
                O sistema precisa funcionar
                <br />
                <em>quando a aula começa.</em>
              </h2>
            </div>
            <div className="testimonial-grid">
              <article className="testimonial-card featured-testimonial">
                <div className="quote-mark">“</div>
                <blockquote>
                  O sistema está muito bom e quero começar a usar como padrão a partir do próximo
                  mês.
                </blockquote>
                <div className="testimonial-author">
                  <div className="author-avatar">P</div>
                  <div>
                    <strong>Responsável pelo CT-piloto</strong>
                    <span>CT de Jiu-Jitsu · validação em rotina real</span>
                  </div>
                </div>
              </article>
              <article className="proof-card">
                <span className="proof-icon">
                  <Clock3 size={19} />
                </span>
                <strong>Rotina em primeiro lugar</strong>
                <p>Construído para as decisões rápidas entre uma aula e outra.</p>
                <span className="proof-number">01</span>
              </article>
              <article className="proof-card proof-card-accent">
                <span className="proof-icon">
                  <Sparkles size={19} />
                </span>
                <strong>Sem complicação</strong>
                <p>Uma experiência direta para responsáveis e alunos.</p>
                <span className="proof-number">02</span>
              </article>
            </div>
          </div>
        </section>

        <section className="faq-section section-paper" id="faq">
          <div className="container faq-layout">
            <div className="faq-heading">
              <span className="eyebrow eyebrow-dark">
                <span className="eyebrow-line" /> Ainda ficou uma dúvida?
              </span>
              <h2>
                O básico, sem
                <br />
                <em>letra miúda.</em>
              </h2>
              <p>Se a sua pergunta não estiver aqui, fale diretamente com a gente.</p>
              <a
                className="text-link dark-link"
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                Conversar pelo WhatsApp <ArrowRight size={16} />
              </a>
            </div>
            <div className="faq-list">
              {faqs.map(([question, answer], index) => (
                <div className={`faq-item ${openFaq === index ? "open" : ""}`} key={question}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    aria-expanded={openFaq === index}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span>{question}</span>
                    <ChevronDown size={18} />
                  </button>
                  <div id={`faq-answer-${index}`} className="faq-answer">
                    <p>{answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="final-cta section-orange" id="contato">
          <div className="container final-cta-inner">
            <div>
              <span className="eyebrow eyebrow-dark">
                <span className="eyebrow-line" /> Volte para o que importa
              </span>
              <h2>
                Mais tatame.
                <br />
                <em>Menos planilha.</em>
              </h2>
              <p>Veja como o Tatamiq pode entrar na rotina do seu CT.</p>
            </div>
            <a className="button button-dark" href={whatsappHref} target="_blank" rel="noreferrer">
              Agendar demonstração <ArrowUpRight size={17} />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-main">
          <Logo light />
          <div className="footer-links">
            <a href="#como-funciona">Como funciona</a>
            <a href="#recursos">Recursos</a>
            <a href="#preco">Preço</a>
            <a href="#faq">FAQ</a>
          </div>
          <a className="footer-social" href={whatsappHref} target="_blank" rel="noreferrer">
            Fale com a gente <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 Tatamiq. Feito no tatame.</span>
          <span>Privacidade · Termos</span>
        </div>
      </footer>
    </div>
  );
}

function MoreHorizontalDots() {
  return <span className="more-dots">•••</span>;
}

export default App;
