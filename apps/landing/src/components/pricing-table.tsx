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
          Anual <span>economize 2 meses</span>
        </button>
      </fieldset>

      <div className="pricing-cards">
        <article className="trial-card">
          <div>
            <span className="plan-stamp">ENTRADA ASSISTIDA</span>
            <h3>30 dias para validar na sua rotina</h3>
            <p>Comece com ajuda para configurar o CT e importar sua planilha.</p>
          </div>
          <div className="price-line">
            <strong>R$ 0</strong>
            <span>/ entrada inicial</span>
          </div>
          <ul>
            <li>
              <Check aria-hidden="true" /> Configuração da academia
            </li>
            <li>
              <Check aria-hidden="true" /> Importação da planilha atual
            </li>
            <li>
              <Check aria-hidden="true" /> Acompanhamento nos primeiros treinos
            </li>
          </ul>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            Começar entrada assistida <ArrowUpRight aria-hidden="true" />
          </a>
        </article>

        <article className="main-plan-card">
          <div className="plan-corner">
            <Sparkles aria-hidden="true" /> PLANO PRINCIPAL
          </div>
          <div>
            <span className="plan-stamp">OPERAÇÃO COMPLETA</span>
            <h3>O app para tocar o CT todo mês</h3>
            <p>Todos os módulos essenciais em um preço fixo, sem cobrança por aluno.</p>
          </div>
          <div className="price-line" aria-live="polite">
            <strong>{yearly ? "R$ 899" : "R$ 89"}</strong>
            <span>{yearly ? "/ ano" : "/ mês"}</span>
          </div>
          <ul>
            <li>
              <Check aria-hidden="true" /> Alunos e responsáveis sem limite
            </li>
            <li>
              <Check aria-hidden="true" /> Portal do aluno incluído
            </li>
            <li>
              <Check aria-hidden="true" /> Presença por QR, graduação e financeiro
            </li>
            <li>
              <Check aria-hidden="true" /> Cancelamento quando quiser
            </li>
          </ul>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            {yearly ? "Organizar meu CT por R$ 899/ano" : "Organizar meu CT por R$ 89/mês"}{" "}
            <ArrowUpRight aria-hidden="true" />
          </a>
        </article>
      </div>
    </div>
  );
}
