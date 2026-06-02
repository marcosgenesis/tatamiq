import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMonthlyFeeInput, MonthlyFee } from "@tatamiq/contracts";
import { type FormEvent, useMemo, useState } from "react";
import { useStudents } from "../../hooks/use-students";
import { centsToReais, reaisToCents } from "../../lib/formatting";
import { CreateMonthlyFeeDrawer } from "./create-monthly-fee-drawer";
import { MonthlyFeeActionDrawer } from "./monthly-fee-action-drawer";
import { MonthlyFeesHeader } from "./monthly-fees-header";
import { MonthlyFeesList } from "./monthly-fees-list";
import {
  adjustMonthlyFee,
  approveMonthlyFeeReceipt,
  createMonthlyFee,
  fetchMonthlyFeeDetail,
  fetchMonthlyFeeReceiptViewUrl,
  fetchMonthlyFees,
  monthlyFeesExportUrl,
  monthlyFeesKeys,
  registerManualMonthlyFeePayment,
  rejectMonthlyFeeReceipt,
  waiveMonthlyFee,
} from "./monthly-fees-queries";
import type { FeeFormState, FeeStatusFilter, MonthlyFeeActionType } from "./monthly-fees-types";
import { ReceiptReviewDrawer } from "./receipt-review-drawer";
import { activePendingReceipt } from "./receipt-state";

const emptyForm: FeeFormState = {
  studentId: "",
  referenceYear: new Date().getFullYear().toString(),
  referenceMonth: (new Date().getMonth() + 1).toString(),
  amountInCents: "",
  dueDay: "",
};

export function MonthlyFeesPage() {
  const queryClient = useQueryClient();
  const [statusFilter] = useState<FeeStatusFilter>(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    return isFeeStatusFilter(status) ? status : "all";
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FeeFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [detailFeeId, setDetailFeeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const feesQuery = useQuery({
    queryKey: monthlyFeesKeys.list(statusFilter),
    queryFn: () => fetchMonthlyFees(statusFilter),
  });

  const studentsQuery = useStudents("active", undefined, { enabled: isFormOpen });

  const detailQuery = useQuery({
    queryKey: monthlyFeesKeys.detail(detailFeeId),
    enabled: detailFeeId !== null,
    queryFn: () => {
      if (!detailFeeId) throw new Error("Mensalidade inválida.");
      return fetchMonthlyFeeDetail(detailFeeId);
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateMonthlyFeeInput) => createMonthlyFee(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all });
      closeForm();
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "Erro ao criar mensalidade.",
      );
    },
  });

  const [actionFeeId, setActionFeeId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<MonthlyFeeActionType | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionAmount, setActionAmount] = useState("");

  const adjustMutation = useMutation({
    mutationFn: adjustMonthlyFee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all });
      closeAction();
    },
  });

  const waiveMutation = useMutation({
    mutationFn: waiveMonthlyFee,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all });
      closeAction();
    },
  });

  const approveReceiptMutation = useMutation({
    mutationFn: approveMonthlyFeeReceipt,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all }),
        queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.detailRoot }),
      ]);
      setDetailFeeId(null);
    },
  });

  const rejectReceiptMutation = useMutation({
    mutationFn: rejectMonthlyFeeReceipt,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all }),
        queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.detailRoot }),
      ]);
      setDetailFeeId(null);
      setRejectReason("");
    },
  });

  const manualPayMutation = useMutation({
    mutationFn: registerManualMonthlyFeePayment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all });
      closeAction();
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
    setForm(emptyForm);
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setError(null);
  }

  function updateForm(field: keyof FeeFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function onStudentSelect(studentId: string) {
    const student = studentsQuery.data?.students.find((s) => s.id === studentId);
    if (student) {
      setForm((current) => ({
        ...current,
        studentId,
        amountInCents: student.monthlyAmountInCents
          ? centsToReais(student.monthlyAmountInCents)
          : "",
        dueDay: student.monthlyDueDay?.toString() ?? "",
      }));
    } else {
      updateForm("studentId", studentId);
    }
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const amountInCents = reaisToCents(form.amountInCents);
    if (!amountInCents || amountInCents <= 0) {
      setError("Informe um valor válido.");
      return;
    }

    createMutation.mutate({
      studentId: form.studentId,
      referenceYear: Number(form.referenceYear),
      referenceMonth: Number(form.referenceMonth),
      amountInCents,
      dueDay: Number(form.dueDay),
    });
  }

  return (
    <div className="space-y-6 p-6">
      <MonthlyFeesHeader
        onExportCsv={() => window.open(monthlyFeesExportUrl(statusFilter), "_blank")}
        onCreate={openCreateForm}
      />

      <CreateMonthlyFeeDrawer
        open={isFormOpen}
        form={form}
        studentOptions={(studentsQuery.data?.students ?? []).map((student) => ({
          value: student.id,
          label: student.name,
        }))}
        error={error}
        creating={createMutation.isPending}
        onClose={closeForm}
        onSubmit={submitForm}
        onStudentSelect={onStudentSelect}
        onFormChange={updateForm}
      />
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
