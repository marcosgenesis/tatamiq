import { ChevronDown, CircleHelp, Clock3, Smartphone, WalletCards } from "lucide-react";
import { useState } from "react";

const items = [
  {
    icon: CircleHelp,
    question: "Funciona para qualquer arte marcial?",
    answer:
      "A primeira versão foi desenhada para CTs de Brazilian Jiu-Jitsu. As regras de faixas, graus e graduação seguem essa rotina desde o início.",
  },
  {
    icon: Clock3,
    question: "Como começo sem parar a rotina do CT?",
    answer:
      "Você começa pela configuração da academia e pela importação da planilha atual. A entrada acontece aos poucos, com acompanhamento nos primeiros treinos.",
  },
  {
    icon: Smartphone,
    question: "O aluno precisa baixar outro app?",
    answer:
      "Não. O aluno acessa o portal pelo celular para ver próximas aulas, presenças, faixa, grau e mensalidades, além de enviar comprovante Pix.",
  },
  {
    icon: WalletCards,
    question: "Tenho fidelidade ou taxa de implantação?",
    answer:
      "Não. A entrada assistida não tem taxa de implantação e o plano mensal pode ser cancelado quando você quiser.",
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
            <div
              className="faq-answer"
              id={`faq-answer-${index}`}
              aria-hidden={!open}
              hidden={!open}
            >
              <p>{item.answer}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
