import type { MonthlyFee } from "@tatamiq/contracts";
import { MoreHorizontalIcon, PlusSignIcon } from "hugeicons-react";
import { useState } from "react";
import {
  ActionButton,
  FilterChips,
  MobileScreen,
  ScreenHeader,
  StatusPill,
} from "@/components/mobile/mobile-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate, monthNames } from "@/lib/formatting";
import { initials } from "@/lib/initials";
import { feeStatusBadge } from "./fee-status";

type FeeSummary = { paid?: number; overdue?: number; underReview?: number } | undefined;
type StatusFilter = "all" | "overdue" | "open" | "paid";

export function MonthlyFeesMobileBody(props: {
  fees: MonthlyFee[];
  summary: FeeSummary;
  onCreate: () => void;
  onReview: (fee: MonthlyFee) => void;
  onAdjust: (fee: MonthlyFee) => void;
  onManualPay: (fee: MonthlyFee) => void;
  onWaive: (fee: MonthlyFee) => void;
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  const nonWaived = props.fees.filter((f) => f.status !== "waived");
  const paidCents = props.fees
    .filter((f) => f.status === "paid")
    .reduce((sum, f) => sum + f.amountInCents, 0);
  const expectedCents = nonWaived.reduce((sum, f) => sum + f.amountInCents, 0);
  const openCount = nonWaived.filter((f) => f.status === "open" && !f.isOverdue).length;
  const overdueCount = props.summary?.overdue ?? nonWaived.filter((f) => f.isOverdue).length;
  const reviewCount =
    props.summary?.underReview ?? nonWaived.filter((f) => f.status === "under_review").length;

  const filtered = nonWaived.filter((f) => {
    if (filter === "all") return true;
    if (filter === "overdue") return f.isOverdue;
    if (filter === "open") return f.status === "open" && !f.isOverdue;
    return f.status === "paid";
  });

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());

  return (
    <MobileScreen>
      <ScreenHeader
        title="Mensalidades"
        action={<ActionButton icon={PlusSignIcon} label="Nova" onClick={props.onCreate} />}
      />

      {/* Summary */}
      <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] text-m-ink-2">
            Recebido em <span className="first-letter:uppercase">{monthLabel}</span>
          </span>
          <div className="flex items-end gap-2">
            <span className="text-[24px] font-medium text-m-ink leading-none tabular-nums">
              {formatCurrency(paidCents)}
            </span>
            <span className="pb-0.5 text-[12px] text-m-ink-3">
              de {formatCurrency(expectedCents)} previstos
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between border-border border-t pt-3.5">
          {[
            { label: "Em aberto", value: openCount, className: "text-m-ink" },
            { label: "Atrasadas", value: overdueCount, className: "text-warning-foreground" },
            { label: "Verificação", value: reviewCount, className: "text-info-foreground" },
          ].map((c) => (
            <div key={c.label} className="flex flex-col gap-0.5">
              <span className={`text-[14px] font-medium tabular-nums ${c.className}`}>
                {c.value}
              </span>
              <span className="text-[12px] text-m-ink-2">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      <FilterChips
        value={filter}
        onChange={setFilter}
        chips={[
          { value: "all", label: "Todas" },
          { value: "overdue", label: "Atrasadas" },
          { value: "open", label: "Em aberto" },
          { value: "paid", label: "Pagas" },
        ]}
      />

      {filtered.length === 0 ? (
        <p className="px-1 py-8 text-center text-[13px] text-m-ink-3">Nenhuma mensalidade.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((fee) => (
            <FeeCard
              key={fee.id}
              fee={fee}
              onReview={() => props.onReview(fee)}
              onAdjust={() => props.onAdjust(fee)}
              onManualPay={() => props.onManualPay(fee)}
              onWaive={() => props.onWaive(fee)}
            />
          ))}
        </div>
      )}
    </MobileScreen>
  );
}

function FeeCard({
  fee,
  onReview,
  onAdjust,
  onManualPay,
  onWaive,
}: {
  fee: MonthlyFee;
  onReview: () => void;
  onAdjust: () => void;
  onManualPay: () => void;
  onWaive: () => void;
}) {
  const badge = feeStatusBadge(fee);
  const isOpen = fee.status === "open";
  const monthName = monthNames[fee.referenceMonth - 1] ?? "";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-m-surface text-[14px] font-medium text-m-ink-2">
          {initials(fee.studentName)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14px] font-medium text-m-ink">{fee.studentName}</span>
          <span className="truncate text-[12px] text-m-ink-2">
            {monthName} · vence {formatDate(fee.dueDate)}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-[14px] font-medium text-m-ink tabular-nums">
            {formatCurrency(fee.amountInCents)}
          </span>
          {fee.originalAmountInCents ? (
            <span className="text-[12px] text-m-ink-3 line-through tabular-nums">
              {formatCurrency(fee.originalAmountInCents)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
        <div className="flex items-center gap-2">
          {fee.status === "under_review" ? (
            <button
              type="button"
              onClick={onReview}
              className="rounded-lg bg-primary-soft px-3.5 py-1.5 text-[13px] font-medium text-primary-soft-foreground"
            >
              Revisar
            </button>
          ) : null}
          {isOpen || fee.isOverdue ? (
            <>
              <button
                type="button"
                onClick={onManualPay}
                className="rounded-lg bg-primary-soft px-3.5 py-1.5 text-[13px] font-medium text-primary-soft-foreground"
              >
                Pagar
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Mais ações"
                  className="grid size-8 place-items-center rounded-lg border border-border bg-card text-m-ink-2 outline-none"
                >
                  <MoreHorizontalIcon className="size-4" strokeWidth={1.8} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onAdjust}>Ajustar valor</DropdownMenuItem>
                  <DropdownMenuItem onClick={onWaive}>Dispensar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
