import type { MonthlyFee } from "@tatamiq/contracts";
import { MonthlyFeeRow } from "./monthly-fee-row";
import { MonthlyFeesEmptyState } from "./monthly-fees-empty-state";

export function MonthlyFeesList(props: {
  fees: MonthlyFee[];
  loading: boolean;
  error: boolean;
  onCreate: () => void;
  onAdjust: (fee: MonthlyFee) => void;
  onWaive: (fee: MonthlyFee) => void;
  onManualPay: (fee: MonthlyFee) => void;
  onReview: (fee: MonthlyFee) => void;
}) {
  return (
    <div>
      {props.loading ? (
        <p className="text-sm text-muted-foreground">Carregando mensalidades...</p>
      ) : null}
      {props.error ? (
        <p className="text-sm text-destructive">Não foi possível carregar mensalidades.</p>
      ) : null}
      {!props.loading && props.fees.length === 0 ? (
        <MonthlyFeesEmptyState onCreate={props.onCreate} />
      ) : null}
      {props.fees.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-4 border-border border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] md:grid">
            <span>Aluno</span>
            <span>Referência</span>
            <span>Valor</span>
            <span>Vencimento</span>
            <span>Status</span>
            <span>Ações</span>
          </div>
          <div className="divide-y divide-border">
            {props.fees.map((fee) => (
              <MonthlyFeeRow
                key={fee.id}
                fee={fee}
                onAdjust={() => props.onAdjust(fee)}
                onWaive={() => props.onWaive(fee)}
                onManualPay={() => props.onManualPay(fee)}
                onReview={() => props.onReview(fee)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
