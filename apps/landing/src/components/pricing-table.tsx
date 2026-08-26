import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { useState } from "react";

export type BillingCycle = "monthly" | "yearly";

type PricingTableProps = {
  whatsappHref: string;
};

/**
 * Adapted for App do Sensei from Caio Bonato's "Modern Pricing Table"
 * published on the 21st.dev community catalog.
 */
export function PricingTable({ whatsappHref }: PricingTableProps) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const yearly = cycle === "yearly";

  return (
    <div className="pricing-table">
      <fieldset className="billing-toggle">
        <legend className="sr-only">Período de cobrança</legend>
        <button
          type="button"
          className={yearly ? "" : "active"}
          aria-pressed={!yearly}
          onClick={() => setCycle("monthly")}
        >
          Mensal
        </button>
        <button
          type="button"
          className={yearly ? "active" : ""}
          aria-pressed={yearly}
          onClick={() => setCycle("yearly")}
        >
          Anual <span>2 meses de vantagem</span>
        </button>
      </fieldset>

      <div className="pricing-cards">
        <article className="trial-card">
          <div>
            <span className="plan-stamp">PRIMEIRO ROUND</span>
            <h3>30 dias acompanhados</h3>
            <p>Coloque o App do Sensei na rotina real antes de decidir.</p>
          </div>
          <div className="price-line">
            <strong>R$ 0</strong>
            <span>/ 30 dias</span>
          </div>
          <ul>
            <li>
              <Check aria-hidden="true" /> Configuração inicial
            </li>
            <li>
              <Check aria-hidden="true" /> Importação da sua planilha
            </li>
            <li>
              <Check aria-hidden="true" /> Acompanhamento próximo
            </li>
          </ul>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            Agendar teste <ArrowUpRight aria-hidden="true" />
          </a>
        </article>

        <article className="main-plan-card">
          <div className="plan-corner">
            <Sparkles aria-hidden="true" /> COMPLETO
          </div>
          <div>
            <span className="plan-stamp">APP DO SENSEI</span>
            <h3>Seu CT inteiro no lugar certo</h3>
            <p>Alunos, aulas, presença, graduação e financeiro numa operação só.</p>
          </div>
          <div className="price-line">
            <strong>{yearly ? "R$ 899" : "R$ 89"}</strong>
            <span>{yearly ? "/ ano" : "/ mês"}</span>
          </div>
          <ul>
            <li>
              <Check aria-hidden="true" /> Alunos e responsáveis ilimitados
            </li>
            <li>
              <Check aria-hidden="true" /> Portal do aluno incluso
            </li>
            <li>
              <Check aria-hidden="true" /> QR Code, graduações e financeiro
            </li>
            <li>
              <Check aria-hidden="true" /> Cancele quando quiser
            </li>
          </ul>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            Quero organizar meu CT <ArrowUpRight aria-hidden="true" />
          </a>
        </article>
      </div>
    </div>
  );
}
