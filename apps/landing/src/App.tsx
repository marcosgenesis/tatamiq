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

const whatsappHref =
  "https://wa.me/5585992855994?text=Oi%20quero%20ver%20uma%20demo%20do%20App%20do%20Sensei";

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
        <nav
          className={open ? "main-nav open" : "main-nav"}
          id="main-navigation"
          aria-label="Navegação principal"
        >
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
            Ver demo <ArrowUpRight aria-hidden="true" />
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
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
        />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

const capabilities = [
  {
    icon: UsersRound,
    label: "Alunos e turmas",
    copy: "Ficha, contato e histórico sem procurar em várias abas.",
  },
  {
    icon: ScanLine,
    label: "Presença por QR",
    copy: "QR rotativo, ajuste manual e presença salva no histórico.",
  },
  {
    icon: GraduationCap,
    label: "Graduação",
    copy: "Faixas, graus e alunos aptos sem depender da memória.",
  },
  {
    icon: CreditCard,
    label: "Financeiro",
    copy: "Mensalidades, diárias e comprovantes Pix em uma fila clara.",
  },
];

function App() {
  return (
    <div className="site" id="top">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <section className="hero">
          <div className="hero-sash" aria-hidden="true">
            <span>APP DO SENSEI</span>
            <span>GESTÃO PARA O TATAME</span>
            <span>APP DO SENSEI</span>
          </div>
          <div className="hero-layout">
            <div className="hero-copy">
              <p className="audience-note">
                Para CTs de Jiu-Jitsu que ainda rodam no WhatsApp, planilha e memória.
              </p>
              <h1>
                Tire a operação <span className="hero-emphasis">da sua cabeça.</span>
              </h1>
              <p className="hero-lead">
                Organize alunos, turmas, presença por QR, graduação e mensalidades em uma rotina
                simples — antes, durante e depois do treino.
              </p>
              <div className="hero-actions">
                <a className="primary-action" href={whatsappHref} target="_blank" rel="noreferrer">
                  Ver demo de 15 min <ArrowUpRight aria-hidden="true" />
                </a>
                <a className="text-action" href="#produto">
                  Ver como organiza o CT <ArrowDown aria-hidden="true" />
                </a>
              </div>
              <div className="hero-trust">
                <span>
                  <CheckCircle2 /> teste acompanhado por 30 dias
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
              caption="Painel real do responsável da academia, com dados fictícios de demonstração."
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
              <span className="margin-note">O custo do improviso</span>
              <h2>Planilha aberta. WhatsApp lotado. A próxima faixa dependendo da memória.</h2>
            </div>
            <div className="problem-copy">
              <p>
                O problema não é falta de dedicação. É administrar presença, graduação e mensalidade
                em ferramentas que não conversam entre si.
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
            <h2>Do cadastro à próxima faixa, cada parte alimenta a outra.</h2>
            <p>Uma rotina contínua, não cinco ferramentas isoladas.</p>
          </div>
          <div className="routine-board">
            <div className="routine-step">
              <span>ANTES DA AULA</span>
              <CalendarDays aria-hidden="true" />
              <h3>Deixe turmas e alunos prontos</h3>
              <p>Cadastre contatos, responsáveis, faixas e a agenda semanal do CT.</p>
            </div>
            <ArrowRight className="routine-arrow" aria-hidden="true" />
            <div className="routine-step active">
              <span>NO TATAME</span>
              <QrCode aria-hidden="true" />
              <h3>Faça a chamada sem travar a aula</h3>
              <p>Use QR rotativo, corrija manualmente quando precisar e preserve o histórico.</p>
            </div>
            <ArrowRight className="routine-arrow" aria-hidden="true" />
            <div className="routine-step">
              <span>DEPOIS DO TREINO</span>
              <GraduationCap aria-hidden="true" />
              <h3>Veja graduação e caixa com clareza</h3>
              <p>Identifique alunos aptos a graduar e mensalidades que precisam de atenção.</p>
            </div>
          </div>
          <div className="real-screen-grid">
            <ProductScreenshot
              className="routine-product-shot"
              src="/screenshots/admin-schedule.png"
              alt="Tela real da agenda semanal do App do Sensei com as turmas organizadas por dia e horário"
              label="APP REAL"
              detail="AGENDA SEMANAL"
              caption="Agenda semanal real para preparar as aulas antes do treino."
            />
            <ProductScreenshot
              className="routine-product-shot"
              src="/screenshots/admin-monthly-fees.png"
              alt="Tela real de mensalidades do App do Sensei com alunos, valores, vencimentos e status"
              label="APP REAL"
              detail="MENSALIDADES"
              caption="Mensalidades reais organizadas por aluno, vencimento e status."
            />
          </div>
        </section>

        <section className="student-section">
          <div className="student-copy">
            <span className="margin-note">Para quem treina</span>
            <h2>O aluno consulta o que precisa sem chamar você no WhatsApp.</h2>
            <p>
              No celular, ele vê próximas aulas, confirma presença, acompanha faixa e grau e
              consulta mensalidades sem pedir tudo de novo ao responsável da academia.
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
              Ver a experiência do aluno <ArrowRight />
            </a>
          </div>
          <ProductScreenshot
            className="student-product-shot"
            src="/screenshots/student-home.png"
            alt="Tela real do portal mobile do aluno com faixa, próxima aula, presença e atividade recente"
            label="APP REAL"
            detail="PORTAL DO ALUNO"
            caption="Portal mobile real com agenda, presença, evolução e mensalidades do aluno."
          />
        </section>

        <section className="proof-section">
          <div className="proof-quote">
            <span className="quote-mark">“</span>
            <blockquote>
              Quero usar como padrão no próximo mês porque a rotina de alunos, presença e
              mensalidades já ficou mais clara.
            </blockquote>
            <footer>
              <span>CT</span>
              <div className="proof-person">
                <strong>Responsável por CT-piloto de Jiu-Jitsu</strong>
                <small>Feedback após uso em rotina real</small>
              </div>
            </footer>
          </div>
          <div className="proof-aside">
            <strong>Produto validado na rotina, não só na tela.</strong>
            <p>
              Cada fluxo é ajustado com responsáveis de academia que precisam decidir rápido entre
              uma aula e outra.
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
              Uma mensalidade para tirar a operação do improviso.
              <br />
              Sem susto por aluno.
            </h2>
            <p>Use todos os módulos, cadastre quantos alunos precisar e cancele quando quiser.</p>
          </div>
          <PricingTable whatsappHref={whatsappHref} />
          <p className="pricing-note">
            <ShieldCheck /> Oferta atual · pagamento via Pix ou cartão · sem taxa de implantação
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
              As respostas que costumam aparecer antes de uma demonstração. Se faltar algo, fale
              direto com quem constrói o produto.
            </p>
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              Tirar dúvida no WhatsApp <ArrowUpRight />
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
          <span className="margin-note">Próximo passo</span>
          <h2>
            Veja onde sua rotina ainda está vazando tempo.
            <br />
            <span>E como o app fecha essas brechas.</span>
          </h2>
          <p>
            Em 15 minutos, mostramos o fluxo completo: alunos, presença, graduação e mensalidades.
          </p>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            Agendar demo de 15 min <ArrowUpRight />
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <Brand inverse />
        <nav aria-label="Navegação do rodapé">
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
