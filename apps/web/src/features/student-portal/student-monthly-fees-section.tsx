import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StudentMeResponse, StudentMonthlyFee } from "@tatamiq/contracts";
import { Camera01Icon, CheckmarkCircle03Icon } from "hugeicons-react";
import { type FormEvent, useState } from "react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Textarea } from "../../components/ui/textarea";
import { authClient } from "../../lib/auth-client";
import { formatCurrency, formatDate, monthNames } from "../../lib/formatting";
import { studentQueryKey } from "../../lib/session-query-keys";
import {
  deriveStudentReceiptStatus,
  studentLastReceiptMessage,
  studentReceiptCta,
} from "../monthly-fees/receipt-state";
import { StudentEmptyState } from "./components/student-empty-state";
import { dueInLabel } from "./lib/student-format";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,application/pdf";
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function StudentMonthlyFeesSection({ me }: { me: StudentMeResponse }) {
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const sessionUserId = session.data?.user.id;
  const [selectedFee, setSelectedFee] = useState<StudentMonthlyFee | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const feesQuery = useQuery({
    queryKey: studentQueryKey(sessionUserId, "monthly-fees"),
    queryFn: async () => {
      const { data, error } = await api.GET("/student/monthly-fees");
      if (error) throw new Error("Não foi possível carregar mensalidades.");
      return data;
    },
    enabled: !!sessionUserId,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFee || !file) return;
      if (file.size > MAX_SIZE_BYTES) throw new Error("Arquivo excede o limite de 10 MB.");

      const { data: uploadData, error: uploadError } = await api.POST(
        "/student/monthly-fees/{id}/upload-url",
        {
          params: { path: { id: selectedFee.id }, query: { contentType: file.type } },
        },
      );
      if (uploadError || !uploadData) throw new Error("Não foi possível preparar o envio.");

      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Falha ao enviar o arquivo.");

      const { error: confirmError } = await api.POST("/student/monthly-fees/{id}/receipts", {
        params: { path: { id: selectedFee.id } },
        body: {
          fileKey: uploadData.fileKey,
          fileKeySignature: uploadData.fileKeySignature,
          fileType: file.type,
          fileSizeBytes: file.size,
          note,
        },
      });
      if (confirmError) throw new Error("Não foi possível confirmar o comprovante.");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studentQueryKey(sessionUserId, "monthly-fees") }),
        queryClient.invalidateQueries({ queryKey: studentQueryKey(sessionUserId, "indicators") }),
      ]);
      setSelectedFee(null);
      setFile(null);
      setNote("");
      setError(null);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Erro ao enviar.");
    },
  });

  async function openReceipt(fee: StudentMonthlyFee) {
    if (!fee.lastReceipt) return;
    const { data, error } = await api.GET(
      "/student/monthly-fees/{id}/receipts/{receiptId}/view-url",
      { params: { path: { id: fee.id, receiptId: fee.lastReceipt.id } } },
    );
    if (error || !data) {
      setError("Não foi possível abrir o comprovante.");
      return;
    }
    window.open(data.viewUrl, "_blank", "noopener,noreferrer");
  }

  function startUpload(fee: StudentMonthlyFee) {
    setSelectedFee(fee);
    setFile(null);
    setNote("");
    setError(null);
  }

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError("Escolha um arquivo de imagem ou PDF.");
      return;
    }
    uploadMutation.mutate();
  }

  const fees = feesQuery.data?.fees ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[1.55rem] font-bold tracking-tight">Mensalidades</h1>
        <p className="text-sm font-medium text-muted-foreground">Mantenha seus pagamentos em dia</p>
      </header>

      {feesQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : null}
      {feesQuery.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar mensalidades.</p>
      ) : null}

      {!feesQuery.isLoading && !feesQuery.isError && fees.length === 0 ? (
        <StudentEmptyState
          icon={CheckmarkCircle03Icon}
          tone="success"
          title="Nenhuma cobrança em aberto"
          description="Assim que sua matrícula gerar uma mensalidade, ela aparece aqui para pagamento e envio de comprovante."
        />
      ) : null}

      <div className="space-y-3">
        {fees.map((fee) => (
          <FeeCard
            key={fee.id}
            fee={fee}
            onUpload={() => startUpload(fee)}
            onOpen={() => openReceipt(fee)}
          />
        ))}
      </div>

      {me.academy.pixCopyPaste || me.academy.pixKey ? (
        <Card>
          <CardHeader>
            <CardTitle>Pix da academia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl bg-muted p-4">
              {me.academy.pixCopyPaste ? (
                <p className="break-all font-mono text-xs">{me.academy.pixCopyPaste}</p>
              ) : (
                <p className="break-all">{me.academy.pixKey}</p>
              )}
            </div>
            <p className="text-muted-foreground">Envie imagem ou PDF do comprovante, até 10 MB.</p>
          </CardContent>
        </Card>
      ) : null}

      {selectedFee ? (
        <Card>
          <CardHeader>
            <CardTitle>{studentReceiptCta(deriveStudentReceiptStatus(selectedFee))}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submitUpload}>
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                capture="environment"
                onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                className="block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              {file?.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Prévia do comprovante"
                  className="max-h-80 w-full rounded-2xl border border-border object-contain"
                />
              ) : null}
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Observação para o instrutor (opcional)"
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={uploadMutation.isPending} className="min-h-11">
                  {uploadMutation.isPending ? "Enviando..." : "Confirmar envio"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSelectedFee(null)}
                  className="min-h-11"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function feeBadge(fee: StudentMonthlyFee): { label: string; className: string } {
  if (fee.status === "paid")
    return { label: "Pago", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" };
  if (fee.status === "waived")
    return { label: "Dispensada", className: "border-border bg-muted text-muted-foreground" };
  if (fee.status === "under_review")
    return { label: "Em análise", className: "border-amber-500/20 bg-amber-500/10 text-amber-700" };
  if (fee.isOverdue)
    return {
      label: "Atrasada",
      className: "border-destructive/20 bg-destructive/10 text-destructive",
    };
  return { label: "Pendente", className: "border-amber-500/20 bg-amber-500/10 text-amber-700" };
}

function FeeCard({
  fee,
  onUpload,
  onOpen,
}: {
  fee: StudentMonthlyFee;
  onUpload: () => void;
  onOpen: () => void;
}) {
  const uiStatus = deriveStudentReceiptStatus(fee);
  const cta = studentReceiptCta(uiStatus);
  const message = studentLastReceiptMessage(fee);
  const badge = feeBadge(fee);
  const actionable = fee.status === "open" || fee.status === "under_review";

  return (
    <div className="rounded-2xl border border-border bg-card p-[1.1rem] shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.78rem] font-bold text-muted-foreground">
            {monthNames[fee.referenceMonth - 1]} {fee.referenceYear}
          </p>
          <p className="mt-1.5 text-[1.6rem] font-bold leading-none">
            {formatCurrency(fee.amountInCents)}
          </p>
        </div>
        <Badge className={badge.className}>{badge.label}</Badge>
      </div>
      <p
        className={`mt-2.5 text-xs font-semibold ${fee.isOverdue ? "text-destructive" : "text-muted-foreground"}`}
      >
        Vence em {formatDate(fee.dueDate)} · {dueInLabel(fee.dueDate)}
      </p>
      {message ? (
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">{message}</p>
      ) : null}
      {actionable || fee.lastReceipt ? (
        <div className="mt-3.5 flex gap-2">
          {cta ? (
            <Button type="button" onClick={onUpload} className="h-10 flex-1">
              <Camera01Icon aria-hidden="true" />
              {cta}
            </Button>
          ) : null}
          {fee.lastReceipt ? (
            <Button type="button" variant="outline" onClick={onOpen} className="h-10">
              Ver comprovante
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
