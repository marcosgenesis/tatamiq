// biome-ignore-all lint/a11y/useValidAnchor: hash links intentionally navigate within this landing page.
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Menu,
  MessageCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FaqAccordion } from "./components/faq-accordion";
import { PricingTable } from "./components/pricing-table";

const whatsappHref = "https://wa.me/5585992855994?text=Oi%20quero%20conhecer%20o%20App%20do%20Sensei";

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <a
      className={inverse ? "brand inverse" : "brand"}
      href="#top"
      aria-label="App do Sensei — início"
    >
      <span className="brand-symbol" aria-hidden="true">
        <img src="/app-do-sensei-logo.svg" alt="" />
      </span>
      <span className="brand-name">
        <small>APP DO</small>
        <strong>SENSEI</strong>
      </span>
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Brand />
        <button
          className="menu-button"
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="main-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav className={open ? "main-nav open" : "main-nav"} id="main-navigation">
          <a href="#produto" onClick={close}>
            Produto
          </a>
          <a href="#rotina" onClick={close}>
            Como funciona
          </a>
          <a href="#preco" onClick={close}>
            Preço
          </a>
          <a href="#duvidas" onClick={close}>
            Dúvidas
          </a>
          <a
            className="nav-cta"
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            onClick={close}
          >
            Ver em ação <ArrowUpRight aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  );
}

type ProductScreenshotProps = {
  alt: string;
  caption: string;
  className: string;
  detail: string;
  eager?: boolean;
  label: string;
  src: string;
};

function ProductScreenshot({
  alt,
  caption,
  className,
  detail,
  eager = false,
  label,
  src,
}: ProductScreenshotProps) {
  return (
    <figure className={`product-shot ${className}`}>
      <div className="product-shot-label">
        <span>{label}</span>
        <small>{detail}</small>
      </div>
      <div className="product-shot-frame">
        <img src={src} alt={alt} loading="eager" fetchPriority={eager ? "high" : "auto"} />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const capabilities = [
  {
    icon: UsersRound,
    label: "Alunos e turmas",
    copy: "Cadastro, responsáveis e histórico no mesmo lugar.",
  },
  {
    icon: ScanLine,
    label: "Presença por QR",
    copy: "Chamada rápida, correção manual e histórico confiável.",
  },
  {
    icon: GraduationCap,
    label: "Graduação",
    copy: "Faixas, graus e elegibilidade sem depender da memória.",
  },
  {
    icon: CreditCard,
    label: "Financeiro",
    copy: "Mensalidades, diárias e comprovantes Pix organizados.",
  },
];

function App() {
  return (
    <div className="site" id="top">
      <Header />
      <main>
        <section className="hero">
          <div className="hero-sash" aria-hidden="true">
            <span>APP DO SENSEI</span>
            <span>GESTÃO PARA O TATAME</span>
            <span>APP DO SENSEI</span>
          </div>
          <div className="hero-layout">
            <div className="hero-copy">
              <p className="audience-note">Para quem ensina, organiza e mantém o CT de pé.</p>
              <h1>
                Seu CT não precisa morar <span>na sua cabeça.</span>
              </h1>
              <p className="hero-lead">
                O App do Sensei coloca alunos, aulas, presença, graduação e financeiro numa rotina
                simples — para você voltar a olhar para o tatame.
              </p>
              <div className="hero-actions">
                <a className="primary-action" href={whatsappHref} target="_blank" rel="noreferrer">
                  Quero ver em ação <ArrowUpRight aria-hidden="true" />
                </a>
                <a className="text-action" href="#produto">
                  Conhecer o produto <ArrowDown aria-hidden="true" />
                </a>
              </div>
              <div className="hero-trust">
                <span>
                  <CheckCircle2 /> 30 dias acompanhados
                </span>
                <span>
                  <ShieldCheck /> sem taxa de implantação
                </span>
              </div>
            </div>
            <ProductScreenshot
              className="hero-product-shot"
              src="/screenshots/admin-dashboard.png"
              alt="Dashboard real do App do Sensei exibindo alunos ativos, aulas, presenças e saúde financeira"
              label="APP REAL"
              detail="VISÃO GERAL DO CT"
              caption="Captura do apps/web com o seed oficial de desenvolvimento."
              eager
            />
          </div>
          <div className="hero-foot">
            <span>Construído a partir da rotina real de um CT de Jiu-Jitsu.</span>
            <span className="hero-foot-line" />
            <a href="#rotina">
              Ver a rotina <ArrowDown />
            </a>
          </div>
        </section>

        <section className="capability-strip" aria-label="Áreas do produto">
          <div className="capability-track">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <span key={item.label}>
                  <Icon aria-hidden="true" /> {item.label}
                </span>
              );
            })}
          </div>
        </section>

        <section className="problem-section" id="produto">
          <div className="problem-layout">
            <div className="problem-title">
              <span className="margin-note">A operação hoje</span>
              <h2>Planilha aberta. WhatsApp lotado. A memória fazendo hora extra.</h2>
            </div>
            <div className="problem-copy">
              <p>
                O problema não é falta de dedicação. É tentar ensinar e administrar com ferramentas
                que nunca foram feitas para um CT.
              </p>
              <blockquote>
                “Quando a aula começa, o sistema precisa acompanhar — não atrapalhar.”
              </blockquote>
            </div>
          </div>
          <div className="capability-list">
            {capabilities.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label}>
                  <Icon aria-hidden="true" />
                  <h3>{item.label}</h3>
                  <p>{item.copy}</p>
                  <ArrowUpRight aria-hidden="true" />
                </article>
              );
            })}
          </div>
        </section>

        <section className="routine-section" id="rotina">
          <div className="routine-heading">
            <h2>Do primeiro cadastro à próxima faixa, tudo conversa.</h2>
            <p>Uma operação contínua, não cinco ferramentas isoladas.</p>
          </div>
          <div className="routine-board">
            <div className="routine-step">
              <span>ANTES DA AULA</span>
              <CalendarDays aria-hidden="true" />
              <h3>Organize turmas e horários</h3>
              <p>Cadastre alunos, responsáveis, faixas e a agenda semanal do CT.</p>
            </div>
            <ArrowRight className="routine-arrow" aria-hidden="true" />
            <div className="routine-step active">
              <span>NO TATAME</span>
              <QrCode aria-hidden="true" />
              <h3>Abra a chamada em segundos</h3>
              <p>QR Code rotativo, presença manual quando necessário e histórico preservado.</p>
            </div>
            <ArrowRight className="routine-arrow" aria-hidden="true" />
            <div className="routine-step">
              <span>DEPOIS DO TREINO</span>
              <GraduationCap aria-hidden="true" />
              <h3>Acompanhe evolução e caixa</h3>
              <p>Veja quem está apto a graduar e quais cobranças precisam de atenção.</p>
            </div>
          </div>
          <div className="real-screen-grid">
            <ProductScreenshot
              className="routine-product-shot"
              src="/screenshots/admin-schedule.png"
              alt="Tela real da agenda semanal do App do Sensei com as turmas organizadas por dia e horário"
              label="APP REAL"
              detail="AGENDA SEMANAL"
              caption="Turmas e horários na interface real do instrutor."
            />
            <ProductScreenshot
              className="routine-product-shot"
              src="/screenshots/admin-monthly-fees.png"
              alt="Tela real de mensalidades do App do Sensei com alunos, valores, vencimentos e status"
              label="APP REAL"
              detail="MENSALIDADES"
              caption="Cobranças e status na interface real do instrutor."
            />
          </div>
        </section>

        <section className="student-section">
          <div className="student-copy">
            <span className="margin-note">Para quem treina</span>
            <h2>O aluno também entra no ritmo.</h2>
            <p>
              Uma experiência simples no celular para consultar a próxima aula, confirmar presença,
              acompanhar a evolução e manter pagamentos em dia.
            </p>
            <ul>
              <li>
                <Check /> Agenda e presença na mão
              </li>
              <li>
                <Check /> Faixa, grau e promoções visíveis
              </li>
              <li>
                <Check /> Mensalidades e comprovantes Pix
              </li>
            </ul>
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              Ver o portal do aluno <ArrowRight />
            </a>
          </div>
          <ProductScreenshot
            className="student-product-shot"
            src="/screenshots/student-home.png"
            alt="Tela real do portal mobile do aluno com faixa, próxima aula, presença e atividade recente"
            label="APP REAL"
            detail="PORTAL DO ALUNO"
            caption="Portal mobile real usando a conta de aluno do seed oficial."
          />
        </section>

        <section className="proof-section">
          <div className="proof-quote">
            <span className="quote-mark">“</span>
            <blockquote>
              O sistema está muito bom e quero começar a usar como padrão a partir do próximo mês.
            </blockquote>
            <footer>
              <span>CT</span>
              <div>
                <strong>Responsável pelo CT-piloto</strong>
                <small>Validação em rotina real de Jiu-Jitsu</small>
              </div>
            </footer>
          </div>
          <div className="proof-aside">
            <strong>Feito perto do tatame.</strong>
            <p>
              O App do Sensei é desenvolvido ouvindo quem precisa tomar decisões entre uma aula e
              outra.
            </p>
            <div>
              <MessageCircle />
              <span>
                feedback real
                <br />
                <b>produto em evolução</b>
              </span>
            </div>
          </div>
        </section>

        <section className="pricing-section" id="preco">
          <div className="pricing-heading">
            <h2>
              Preço simples.
              <br />
              Operação completa.
            </h2>
            <p>Sem módulo escondido, sem cobrança por aluno e sem contrato que prende você.</p>
          </div>
          <PricingTable whatsappHref={whatsappHref} />
          <p className="pricing-note">
            <ShieldCheck /> Valores da oferta atual · pagamento via Pix ou cartão
          </p>
        </section>

        <section className="faq-section" id="duvidas">
          <div className="faq-heading">
            <h2>
              O básico,
              <br />
              sem letra miúda.
            </h2>
            <p>
              Se a sua pergunta não estiver aqui, fale diretamente com quem está construindo o
              produto.
            </p>
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              Conversar pelo WhatsApp <ArrowUpRight />
            </a>
          </div>
          <FaqAccordion />
        </section>

        <section className="final-cta">
          <div className="cta-lines" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="margin-note">Próximo treino</span>
          <h2>
            Mais presença no tatame.
            <br />
            <span>Menos operação na cabeça.</span>
          </h2>
          <p>Veja como o App do Sensei pode entrar na rotina do seu CT.</p>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            Agendar demonstração <ArrowUpRight />
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <Brand inverse />
        <nav>
          <a href="#produto">Produto</a>
          <a href="#rotina">Como funciona</a>
          <a href="#preco">Preço</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <div>
          <span>© 2026 App do Sensei</span>
          <span>Feito no tatame.</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
