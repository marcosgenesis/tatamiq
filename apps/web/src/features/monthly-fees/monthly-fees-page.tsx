import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MonthlyFee } from "@tatamiq/contracts";
import { type FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppShell } from "../../components/app-shell";
import { centsToReais, reaisToCents } from "../../lib/formatting";
import { CreateMonthlyFeeDrawer } from "./create-monthly-fee-drawer";
import { MonthlyFeeActionDrawer } from "./monthly-fee-action-drawer";
import { MonthlyFeesHeader } from "./monthly-fees-header";
import { MonthlyFeesList } from "./monthly-fees-list";
import {
  adjustMonthlyFee,
  approveMonthlyFeeReceipt,
  fetchMonthlyFeeDetail,
  fetchMonthlyFeeReceiptViewUrl,
  fetchMonthlyFees,
  generateMissingMonthlyFees,
  monthlyFeesExportUrl,
  monthlyFeesKeys,
  registerManualMonthlyFeePayment,
  rejectMonthlyFeeReceipt,
  waiveMonthlyFee,
} from "./monthly-fees-queries";
import type { FeeStatusFilter, MonthlyFeeActionType } from "./monthly-fees-types";
import { ReceiptReviewDrawer } from "./receipt-review-drawer";
import { activePendingReceipt } from "./receipt-state";

export function MonthlyFeesPage() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const [statusFilter] = useState<FeeStatusFilter>(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    return isFeeStatusFilter(status) ? status : "all";
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailFeeId, setDetailFeeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const feesQuery = useQuery({
    queryKey: monthlyFeesKeys.list(activeAcademyId, statusFilter),
    queryFn: () => fetchMonthlyFees(statusFilter),
    enabled: !!activeAcademyId,
  });

  const detailQuery = useQuery({
    queryKey: monthlyFeesKeys.detail(activeAcademyId, detailFeeId),
    enabled: detailFeeId !== null && !!activeAcademyId,
    queryFn: () => {
      if (!detailFeeId) throw new Error("Mensalidade inválida.");
      return fetchMonthlyFeeDetail(detailFeeId);
    },
  });

  const [actionFeeId, setActionFeeId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<MonthlyFeeActionType | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionAmount, setActionAmount] = useState("");

  const adjustMutation = useMutation({
    mutationFn: adjustMonthlyFee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all(activeAcademyId) });
      closeAction();
    },
  });

  const waiveMutation = useMutation({
    mutationFn: waiveMonthlyFee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all(activeAcademyId) });
      closeAction();
    },
  });

  const approveReceiptMutation = useMutation({
    mutationFn: approveMonthlyFeeReceipt,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all(activeAcademyId) }),
        queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.detailRoot(activeAcademyId) }),
      ]);
      setDetailFeeId(null);
    },
  });

  const rejectReceiptMutation = useMutation({
    mutationFn: rejectMonthlyFeeReceipt,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all(activeAcademyId) }),
        queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.detailRoot(activeAcademyId) }),
      ]);
      setDetailFeeId(null);
      setRejectReason("");
    },
  });

  const manualPayMutation = useMutation({
    mutationFn: registerManualMonthlyFeePayment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all(activeAcademyId) });
      closeAction();
    },
  });

  const generateMissingMutation = useMutation({
    mutationFn: generateMissingMonthlyFees,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all(activeAcademyId) });
      toast.success(
        result.created === 1
          ? "1 mensalidade faltante foi criada."
          : `${result.created} mensalidades faltantes foram criadas.`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao verificar mensalidades.");
    },
  });

  const fees = feesQuery.data?.fees ?? [];
  const detail = detailQuery.data ?? null;
  const pendingReceipt = useMemo(() => (detail ? activePendingReceipt(detail) : null), [detail]);

  function openAction(feeId: string, type: MonthlyFeeActionType, fee: MonthlyFee) {
    setActionFeeId(feeId);
    setActionType(type);
    setActionReason("");
    setActionAmount(type === "adjust" ? centsToReais(fee.amountInCents) : "");
  }

  function closeAction() {
    setActionFeeId(null);
    setActionType(null);
    setActionReason("");
    setActionAmount("");
  }

  function submitAction(e: FormEvent) {
    e.preventDefault();
    if (!actionFeeId || !actionType) return;

    if (actionType === "adjust") {
      const cents = reaisToCents(actionAmount);
      if (!cents || cents <= 0) return;
      adjustMutation.mutate({ id: actionFeeId, amountInCents: cents, reason: actionReason });
    } else if (actionType === "waive") {
      waiveMutation.mutate({ id: actionFeeId, reason: actionReason });
    } else {
      manualPayMutation.mutate({ id: actionFeeId, note: actionReason });
    }
  }

  function openCreateForm() {
    setIsFormOpen(true);
  }

  return (
    <div className="space-y-6 p-6">
      <MonthlyFeesHeader
        generatingMissing={generateMissingMutation.isPending}
        onExportCsv={() => window.open(monthlyFeesExportUrl(statusFilter), "_blank")}
        onCreate={openCreateForm}
        onGenerateMissing={() => generateMissingMutation.mutate()}
      />

      <CreateMonthlyFeeDrawer open={isFormOpen} onClose={() => setIsFormOpen(false)} />
      <MonthlyFeesList
        fees={fees}
        loading={feesQuery.isLoading}
        error={feesQuery.isError}
        onCreate={openCreateForm}
        onAdjust={(fee) => openAction(fee.id, "adjust", fee)}
        onWaive={(fee) => openAction(fee.id, "waive", fee)}
        onManualPay={(fee) => openAction(fee.id, "manual_payment", fee)}
        onReview={(fee) => {
          setDetailFeeId(fee.id);
          setRejectReason("");
        }}
      />
      <ReceiptReviewDrawer
        detail={detail}
        isLoading={detailQuery.isLoading}
        pendingReceipt={pendingReceipt}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onOpenChange={(open) => {
          if (!open) setDetailFeeId(null);
        }}
        onOpenReceipt={async (feeId, receiptId) => {
          const viewUrl = await fetchMonthlyFeeReceiptViewUrl({ feeId, receiptId });
          window.open(viewUrl, "_blank", "noopener,noreferrer");
        }}
        onApprove={(feeId, receiptId) => approveReceiptMutation.mutate({ feeId, receiptId })}
        onReject={(feeId, receiptId, reason) =>
          rejectReceiptMutation.mutate({ feeId, receiptId, reason })
        }
      />
      <MonthlyFeeActionDrawer
        open={actionFeeId !== null && actionType !== null}
        actionType={actionType}
        actionReason={actionReason}
        actionAmount={actionAmount}
        onClose={closeAction}
        onSubmit={submitAction}
        onReasonChange={setActionReason}
        onAmountChange={setActionAmount}
      />
    </div>
  );
}

function isFeeStatusFilter(value: string | null): value is FeeStatusFilter {
  return ["all", "open", "under_review", "paid", "waived", "overdue"].includes(value ?? "");
}
