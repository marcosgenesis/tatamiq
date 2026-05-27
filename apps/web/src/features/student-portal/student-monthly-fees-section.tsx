import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StudentMeResponse, StudentMonthlyFee } from "@tatamiq/contracts";
import { type FormEvent, useState } from "react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { formatCurrency, formatDate, monthNames } from "../../lib/formatting";
import {
  deriveStudentReceiptStatus,
  studentLastReceiptMessage,
  studentReceiptCta,
} from "../monthly-fees/receipt-state";

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic,application/pdf";
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function StudentMonthlyFeesSection({ me }: { me: StudentMeResponse }) {
  const queryClient = useQueryClient();
  const [selectedFee, setSelectedFee] = useState<StudentMonthlyFee | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const feesQuery = useQuery({
    queryKey: ["student", "monthly-fees"],
    queryFn: async () => {
      const { data, error } = await api.GET("/student/monthly-fees");
      if (error) throw new Error("Não foi possível carregar mensalidades.");
      return data;
    },
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
        body: { fileKey: uploadData.fileKey, fileType: file.type, fileSizeBytes: file.size, note },
      });
      if (confirmError) throw new Error("Não foi possível confirmar o comprovante.");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["student", "monthly-fees"] }),
        queryClient.invalidateQueries({ queryKey: ["student", "indicators"] }),
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pix da Academia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {me.academy.pixCopyPaste || me.academy.pixKey ? (
            <div className="rounded-2xl bg-muted p-4">
              {me.academy.pixCopyPaste ? (
                <p className="break-all font-mono text-xs">{me.academy.pixCopyPaste}</p>
              ) : (
                <p className="break-all">{me.academy.pixKey}</p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Confirme os dados de pagamento com o instrutor.</p>
          )}
          <p className="text-muted-foreground">Envie imagem ou PDF do comprovante, até 10 MB.</p>
        </CardContent>
      </Card>

      {feesQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
      {feesQuery.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar mensalidades.</p>
      ) : null}

      <div className="space-y-3">
        {(feesQuery.data?.fees ?? []).map((fee) => (
          <FeeCard
            key={fee.id}
            fee={fee}
            onUpload={() => startUpload(fee)}
            onOpen={() => openReceipt(fee)}
          />
        ))}
      </div>

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
                onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                className="block w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Observação para o instrutor (opcional)"
              />
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? "Enviando..." : "Confirmar envio"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setSelectedFee(null)}>
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
  const statusLabel = fee.isOverdue
    ? "Atrasada"
    : fee.status === "open"
      ? "Em aberto"
      : fee.status === "under_review"
        ? "Em verificação"
        : fee.status === "paid"
          ? "Pago"
          : "Dispensada";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <strong>
              {monthNames[fee.referenceMonth - 1]} {fee.referenceYear}
            </strong>
            <Badge
              variant={fee.isOverdue ? "warning" : fee.status === "paid" ? "default" : "muted"}
            >
              {statusLabel}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCurrency(fee.amountInCents)} · vence em {formatDate(fee.dueDate)}
          </p>
          {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {fee.lastReceipt ? (
            <Button type="button" variant="secondary" onClick={onOpen}>
              Abrir comprovante
            </Button>
          ) : null}
          {cta ? (
            <Button type="button" onClick={onUpload}>
              {cta}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
