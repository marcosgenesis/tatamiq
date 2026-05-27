import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMonthlyFeeInput, MonthlyFee, MonthlyFeeDetail } from "@tatamiq/contracts";
import { Download04Icon, Money03Icon, PlusSignIcon } from "hugeicons-react";
import { type FormEvent, useMemo, useState } from "react";
import { api } from "../../api";
import { Field, SelectField } from "../../components/form-field";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import { useStudents } from "../../hooks/use-students";
import {
  centsToReais,
  formatCurrency,
  formatDate,
  monthNames,
  reaisToCents,
} from "../../lib/formatting";
import { activePendingReceipt, receiptHistory } from "./receipt-state";

type FeeStatusFilter = "all" | "open" | "under_review" | "paid" | "waived" | "overdue";

const statusLabels: Record<string, string> = {
  open: "Em aberto",
  under_review: "Em verificação",
  paid: "Pago",
  waived: "Dispensado",
};

type FeeFormState = {
  studentId: string;
  referenceYear: string;
  referenceMonth: string;
  amountInCents: string;
  dueDay: string;
};

const emptyForm: FeeFormState = {
  studentId: "",
  referenceYear: new Date().getFullYear().toString(),
  referenceMonth: (new Date().getMonth() + 1).toString(),
  amountInCents: "",
  dueDay: "",
};

export function MonthlyFeesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<FeeStatusFilter>(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    return isFeeStatusFilter(status) ? status : "all";
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FeeFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [detailFeeId, setDetailFeeId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const feesQuery = useQuery({
    queryKey: ["monthly-fees", statusFilter],
    queryFn: async () => {
      const query = statusFilter === "all" ? {} : { status: statusFilter };
      const { data, error } = await api.GET("/monthly-fees", {
        params: { query },
      });
      if (error) throw new Error("Não foi possível carregar mensalidades.");
      return data;
    },
  });

  const studentsQuery = useStudents("active", undefined, { enabled: isFormOpen });

  const detailQuery = useQuery({
    queryKey: ["monthly-fees", "detail", detailFeeId],
    enabled: detailFeeId !== null,
    queryFn: async () => {
      if (!detailFeeId) throw new Error("Mensalidade inválida.");
      const { data, error } = await api.GET("/monthly-fees/{id}", {
        params: { path: { id: detailFeeId } },
      });
      if (error) throw new Error("Não foi possível carregar o detalhe.");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateMonthlyFeeInput) => {
      const { data, error } = await api.POST("/monthly-fees", { body: input });
      if (error) throw new Error("Não foi possível criar a mensalidade.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["monthly-fees"] });
      closeForm();
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "Erro ao criar mensalidade.",
      );
    },
  });

  const [actionFeeId, setActionFeeId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"adjust" | "waive" | "manual_payment" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionAmount, setActionAmount] = useState("");

  const adjustMutation = useMutation({
    mutationFn: async ({
      id,
      amountInCents,
      reason,
    }: {
      id: string;
      amountInCents: number;
      reason: string;
    }) => {
      const { error } = await api.POST("/monthly-fees/{id}/adjust", {
        params: { path: { id } },
        body: { amountInCents, reason },
      });
      if (error) throw new Error("Não foi possível ajustar.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["monthly-fees"] });
      closeAction();
    },
  });

  const waiveMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await api.POST("/monthly-fees/{id}/waive", {
        params: { path: { id } },
        body: { reason },
      });
      if (error) throw new Error("Não foi possível dispensar.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["monthly-fees"] });
      closeAction();
    },
  });

  const approveReceiptMutation = useMutation({
    mutationFn: async ({ feeId, receiptId }: { feeId: string; receiptId: string }) => {
      const { error } = await api.POST("/monthly-fees/{id}/receipts/{receiptId}/approve", {
        params: { path: { id: feeId, receiptId } },
      });
      if (error) throw new Error("Não foi possível aprovar.");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["monthly-fees"] }),
        queryClient.invalidateQueries({ queryKey: ["monthly-fees", "detail"] }),
      ]);
      setDetailFeeId(null);
    },
  });

  const rejectReceiptMutation = useMutation({
    mutationFn: async ({
      feeId,
      receiptId,
      reason,
    }: {
      feeId: string;
      receiptId: string;
      reason: string;
    }) => {
      const { error } = await api.POST("/monthly-fees/{id}/receipts/{receiptId}/reject", {
        params: { path: { id: feeId, receiptId } },
        body: { reason },
      });
      if (error) throw new Error("Não foi possível rejeitar.");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["monthly-fees"] }),
        queryClient.invalidateQueries({ queryKey: ["monthly-fees", "detail"] }),
      ]);
      setDetailFeeId(null);
      setRejectReason("");
    },
  });

  const manualPayMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await api.POST("/monthly-fees/{id}/manual-payment", {
        params: { path: { id } },
        body: { note },
      });
      if (error) throw new Error("Não foi possível marcar como pago.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["monthly-fees"] });
      closeAction();
    },
  });

  const fees = feesQuery.data?.fees ?? [];
  const summary = feesQuery.data?.summary;
  const detail = detailQuery.data ?? null;
  const pendingReceipt = useMemo(() => (detail ? activePendingReceipt(detail) : null), [detail]);

  function openAction(feeId: string, type: "adjust" | "waive" | "manual_payment", fee: MonthlyFee) {
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
      <div className="flex justify-between items-center">
        <div>
          <div className="flex gap-1.5 items-center">
            <h1 className="text-2xl">Mensalidades</h1>
          </div>

          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Cobranças mensais, Pix, comprovantes em verificação, ajustes e mensalidades dispensadas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3100";
              const params = new URLSearchParams();
              if (statusFilter !== "all") params.set("status", statusFilter);
              const qs = params.toString();
              window.open(`${baseUrl}/monthly-fees/export.csv${qs ? `?${qs}` : ""}`, "_blank");
            }}
          >
            <Download04Icon className="size-4" /> Exportar CSV
          </Button>
          <Button onClick={openCreateForm}>
            <PlusSignIcon className="size-4" /> Nova mensalidade
          </Button>
        </div>
      </div>

      <Drawer
        direction="right"
        open={isFormOpen}
        onOpenChange={(open: boolean) => {
          if (!open) closeForm();
        }}
      >
        <DrawerContent>
          <form className="flex h-full flex-col" onSubmit={submitForm}>
            <DrawerHeader>
              <DrawerTitle>Nova mensalidade</DrawerTitle>
              <DrawerDescription>Preencha os dados da cobrança.</DrawerDescription>
            </DrawerHeader>
            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
              <SelectField
                label="Aluno"
                value={form.studentId}
                onChange={onStudentSelect}
                options={[
                  { value: "", label: "Selecione um aluno" },
                  ...(studentsQuery.data?.students ?? []).map((s) => ({
                    value: s.id,
                    label: s.name,
                  })),
                ]}
              />
              <SelectField
                label="Mês de referência"
                value={form.referenceMonth}
                onChange={(value) => updateForm("referenceMonth", value)}
                options={monthNames.map((name, i) => ({
                  value: String(i + 1),
                  label: name,
                }))}
              />
              <Field
                label="Ano de referência"
                type="number"
                value={form.referenceYear}
                onChange={(value) => updateForm("referenceYear", value)}
              />
              <Field
                label="Valor (R$)"
                inputMode="decimal"
                value={form.amountInCents}
                onChange={(value) => updateForm("amountInCents", value)}
              />
              <Field
                label="Dia de vencimento"
                type="number"
                min="1"
                max="31"
                value={form.dueDay}
                onChange={(value) => updateForm("dueDay", value)}
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DrawerClose>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar mensalidade"}
              </Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
      <div>
        {" "}
        {feesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando mensalidades...</p>
        ) : null}
        {feesQuery.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar mensalidades.</p>
        ) : null}
        {!feesQuery.isLoading && fees.length === 0 ? (
          <EmptyState onCreate={openCreateForm} />
        ) : null}
        {fees.length > 0 ? (
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
              {fees.map((fee) => (
                <FeeRow
                  key={fee.id}
                  fee={fee}
                  onAdjust={() => openAction(fee.id, "adjust", fee)}
                  onWaive={() => openAction(fee.id, "waive", fee)}
                  onManualPay={() => openAction(fee.id, "manual_payment", fee)}
                  onReview={() => {
                    setDetailFeeId(fee.id);
                    setRejectReason("");
                  }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
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
          const { data, error } = await api.GET(
            "/monthly-fees/{id}/receipts/{receiptId}/view-url",
            { params: { path: { id: feeId, receiptId } } },
          );
          if (!error && data) window.open(data.viewUrl, "_blank", "noopener,noreferrer");
        }}
        onApprove={(feeId, receiptId) => approveReceiptMutation.mutate({ feeId, receiptId })}
        onReject={(feeId, receiptId, reason) =>
          rejectReceiptMutation.mutate({ feeId, receiptId, reason })
        }
      />
      <Drawer
        direction="right"
        open={actionFeeId !== null && actionType !== null}
        onOpenChange={(open: boolean) => {
          if (!open) closeAction();
        }}
      >
        <DrawerContent>
          <form className="flex h-full flex-col" onSubmit={submitAction}>
            <DrawerHeader>
              <DrawerTitle>
                {actionType === "adjust"
                  ? "Ajustar valor"
                  : actionType === "waive"
                    ? "Dispensar mensalidade"
                    : "Marcar como pago"}
              </DrawerTitle>
              <DrawerDescription>
                {actionType === "adjust"
                  ? "Informe o novo valor e o motivo do ajuste."
                  : actionType === "waive"
                    ? "Informe o motivo da dispensa."
                    : "Registre o pagamento manual."}
              </DrawerDescription>
            </DrawerHeader>
            <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
              {actionType === "adjust" ? (
                <Field
                  label="Novo valor (R$)"
                  inputMode="decimal"
                  value={actionAmount}
                  onChange={setActionAmount}
                />
              ) : null}
              <Field
                label={actionType === "manual_payment" ? "Observação (opcional)" : "Motivo"}
                required={actionType !== "manual_payment"}
                value={actionReason}
                onChange={setActionReason}
              />
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DrawerClose>
              <Button type="submit">Confirmar</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function isFeeStatusFilter(value: string | null): value is FeeStatusFilter {
  return ["all", "open", "under_review", "paid", "waived", "overdue"].includes(value ?? "");
}

function SummaryCard(props: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-3xl border p-5 text-left transition ${
        props.active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/70"
      }`}
    >
      <span className="text-sm text-muted-foreground">{props.label}</span>
      <strong className="mt-2 block text-3xl">{props.value}</strong>
    </button>
  );
}

function FeeRow(props: {
  fee: MonthlyFee;
  onAdjust: () => void;
  onWaive: () => void;
  onManualPay: () => void;
  onReview: () => void;
}) {
  const fee = props.fee;
  const displayStatus = fee.isOverdue ? "Atrasada" : (statusLabels[fee.status] ?? fee.status);
  const badgeVariant = fee.isOverdue
    ? "destructive"
    : fee.status === "paid"
      ? "default"
      : fee.status === "under_review"
        ? "warning"
        : fee.status === "waived"
          ? "muted"
          : "secondary";
  const isOpen = fee.status === "open";

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] md:items-center">
      <strong>{fee.studentName}</strong>
      <span className="text-sm text-muted-foreground">
        {monthNames[fee.referenceMonth - 1]} {fee.referenceYear}
      </span>
      <span className="text-sm text-muted-foreground">
        {formatCurrency(fee.amountInCents)}
        {fee.originalAmountInCents ? (
          <span className="ml-1 line-through text-xs text-muted-foreground/60">
            {formatCurrency(fee.originalAmountInCents)}
          </span>
        ) : null}
      </span>
      <span className="text-sm text-muted-foreground">{formatDate(fee.dueDate)}</span>
      <div>
        <Badge variant={badgeVariant as "default"}>{displayStatus}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {fee.status === "under_review" ? (
          <Button type="button" variant="secondary" size="sm" onClick={props.onReview}>
            Revisar
          </Button>
        ) : null}
        {isOpen ? (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={props.onAdjust}>
              Ajustar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={props.onManualPay}>
              Pagar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={props.onWaive}>
              Dispensar
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ReceiptReviewDrawer(props: {
  detail: MonthlyFeeDetail | null;
  isLoading: boolean;
  pendingReceipt: MonthlyFeeDetail["receipts"][number] | null;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onOpenReceipt: (feeId: string, receiptId: string) => void;
  onApprove: (feeId: string, receiptId: string) => void;
  onReject: (feeId: string, receiptId: string, reason: string) => void;
}) {
  const history = props.detail ? receiptHistory(props.detail) : [];

  return (
    <Drawer
      direction="right"
      open={props.detail !== null || props.isLoading}
      onOpenChange={props.onOpenChange}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Verificação de pagamento</DrawerTitle>
          <DrawerDescription>
            Revise o comprovante ativo antes de aprovar ou rejeitar.
          </DrawerDescription>
        </DrawerHeader>
        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
          {props.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {props.detail && props.pendingReceipt ? (
            <div className="space-y-4 rounded-2xl border border-border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Aluno</p>
                <strong>{props.detail.studentName}</strong>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Observação do aluno</p>
                <p className="text-sm">{props.pendingReceipt.note || "Sem observação."}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  props.onOpenReceipt(props.detail?.id ?? "", props.pendingReceipt?.id ?? "")
                }
              >
                Abrir comprovante
              </Button>
              <div className="space-y-2">
                <Field
                  label="Motivo da rejeição"
                  value={props.rejectReason}
                  onChange={props.onRejectReasonChange}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      props.onApprove(props.detail?.id ?? "", props.pendingReceipt?.id ?? "")
                    }
                  >
                    Aprovar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!props.rejectReason.trim()}
                    onClick={() =>
                      props.onReject(
                        props.detail?.id ?? "",
                        props.pendingReceipt?.id ?? "",
                        props.rejectReason,
                      )
                    }
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {props.detail && !props.pendingReceipt ? (
            <p className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
              Nenhum comprovante pendente ativo.
            </p>
          ) : null}
          {history.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Histórico</h3>
              {history.map((receipt) => (
                <div
                  key={receipt.id}
                  className="rounded-2xl border border-border p-3 text-sm text-muted-foreground"
                >
                  {receipt.status} · {formatDateTime(receipt.createdAt)}
                  {receipt.rejectionReason ? <span> · {receipt.rejectionReason}</span> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button type="button" variant="secondary">
              Fechar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function EmptyState(props: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border p-10 text-center">
      <div className="grid size-14 place-items-center rounded-3xl bg-muted text-primary">
        <Money03Icon className="size-7" />
      </div>
      <h2 className="mt-4 font-semibold">Nenhuma mensalidade registrada</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Crie a primeira mensalidade manualmente ou configure a geração automática.
      </p>
      <Button className="mt-5" onClick={props.onCreate}>
        Criar mensalidade
      </Button>
    </div>
  );
}
