import { ChevronDown, CircleHelp, Clock3, Smartphone, WalletCards } from "lucide-react";
import { useState } from "react";

const items = [
  {
    icon: CircleHelp,
    question: "O App do Sensei é feito só para Jiu-Jitsu?",
    answer:
      "A primeira versão foi desenhada para CTs de Brazilian Jiu-Jitsu, incluindo faixas, graus e regras de graduação próprias dessa rotina.",
  },
  {
    icon: Clock3,
    question: "Quanto tempo leva para começar?",
    answer:
      "Você começa com a importação da sua planilha e acompanhamento próximo. A implantação entra aos poucos, sem parar a rotina do CT.",
  },
  {
    icon: Smartphone,
    question: "O aluno também usa o sistema?",
    answer:
      "Sim. O portal do aluno mostra próximas aulas, presenças, evolução e mensalidades, além de permitir o envio de comprovante Pix.",
  },
  {
    icon: WalletCards,
    question: "Existe fidelidade ou taxa de implantação?",
    answer:
      "Não. O teste acompanhado não tem taxa de implantação e o plano mensal pode ser cancelado quando você quiser.",
  },
];

/**
 * Adapted for App do Sensei from the icon-led FAQ accordion pattern by Tailark,
 * available in the 21st.dev community catalog.
 */
export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq-accordion">
      {items.map((item, index) => {
        const Icon = item.icon;
        const open = openIndex === index;
        return (
          <article className={open ? "faq-row open" : "faq-row"} key={item.question}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`faq-answer-${index}`}
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              <span className="faq-icon">
                <Icon aria-hidden="true" />
              </span>
              <span>{item.question}</span>
              <ChevronDown className="faq-chevron" aria-hidden="true" />
            </button>
            <div className="faq-answer" id={`faq-answer-${index}`}>
              <p>{item.answer}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
