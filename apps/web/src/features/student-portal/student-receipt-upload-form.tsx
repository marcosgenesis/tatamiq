import { useMutation } from "@tanstack/react-query";
import type { StudentMonthlyFee } from "@tatamiq/contracts";
import { Camera01Icon } from "hugeicons-react";
import { FileTextIcon, ImageIcon } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { deriveStudentReceiptStatus, studentReceiptCta } from "../monthly-fees/receipt-state";

const IMAGE_ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/heic";
const ACCEPTED_TYPES = `${IMAGE_ACCEPTED_TYPES},application/pdf`;
const ALLOWED_FILE_TYPES = new Set(ACCEPTED_TYPES.split(","));
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

type StudentReceiptUploadFormProps = {
  fee: StudentMonthlyFee;
  onCancel: () => void;
  onUploaded: () => Promise<void>;
};

export function StudentReceiptUploadForm({
  fee,
  onCancel,
  onUploaded,
}: StudentReceiptUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useImagePreview(file);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Escolha um arquivo de imagem ou PDF.");

      const { data: uploadData, error: uploadError } = await api.POST(
        "/student/monthly-fees/{id}/upload-url",
        {
          params: { path: { id: fee.id }, query: { contentType: file.type } },
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
        params: { path: { id: fee.id } },
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
    onSuccess: onUploaded,
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Erro ao enviar.");
    },
  });

  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    uploadMutation.mutate();
  }

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!selectedFile) return;

    if (!ALLOWED_FILE_TYPES.has(selectedFile.type)) {
      setFile(null);
      setError("Escolha uma imagem JPG, PNG, WebP, HEIC ou um PDF.");
      return;
    }

    if (selectedFile.size > MAX_SIZE_BYTES) {
      setFile(null);
      setError("Arquivo excede o limite de 10 MB.");
      return;
    }

    setFile(selectedFile);
    setError(null);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-primary-soft-border bg-primary-soft">
      <div className="px-5 pt-5 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {studentReceiptCta(deriveStudentReceiptStatus(fee))}
        </h2>
        <p className="mt-1 text-sm leading-5 text-primary-soft-foreground">
          Adicione uma imagem nítida do comprovante para a academia verificar o pagamento.
        </p>
      </div>
      <div className="rounded-t-2xl bg-background px-4 py-5 sm:px-5">
        <form className="space-y-4" onSubmit={submitUpload}>
          <input
            ref={galleryInputRef}
            type="file"
            accept={IMAGE_ACCEPTED_TYPES}
            onChange={selectFile}
            className="sr-only"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept={IMAGE_ACCEPTED_TYPES}
            capture="environment"
            onChange={selectFile}
            className="sr-only"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={selectFile}
            className="sr-only"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto min-h-[88px] w-full justify-start gap-3 rounded-xl border-primary-soft-border bg-background px-4 py-3 text-left hover:bg-primary-soft"
              onClick={() => galleryInputRef.current?.click()}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <ImageIcon className="size-5" aria-hidden="true" />
              </span>
              <span className="flex flex-col items-start gap-0.5 whitespace-normal">
                <span className="font-semibold">Escolher da galeria</span>
                <span className="text-xs font-normal text-muted-foreground">Use uma foto já salva</span>
              </span>
            </Button>
            <Button
              type="button"
              className="h-auto min-h-[88px] w-full justify-start gap-3 rounded-xl px-4 py-3 text-left"
              onClick={() => cameraInputRef.current?.click()}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
                <Camera01Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="flex flex-col items-start gap-0.5 whitespace-normal">
                <span className="font-semibold">Tirar foto agora</span>
                <span className="text-xs font-normal text-primary-foreground/80">Abra a câmera do celular</span>
              </span>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <FileTextIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 py-1 text-xs text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              Enviar um arquivo ou PDF
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">Imagem ou PDF de até 10 MB.</p>
          {file ? <SelectedReceipt file={file} previewUrl={previewUrl} /> : null}
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Observação para o instrutor (opcional)"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button type="submit" disabled={uploadMutation.isPending} className="min-h-12 flex-1">
              {uploadMutation.isPending ? "Enviando..." : "Confirmar envio"}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} className="min-h-11">
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

function SelectedReceipt({ file, previewUrl }: { file: File; previewUrl: string | null }) {
  return (
    <>
      <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-3" aria-live="polite">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
          {previewUrl ? (
            <ImageIcon className="size-4" aria-hidden="true" />
          ) : (
            <FileTextIcon className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Comprovante selecionado</p>
          <p className="truncate text-xs text-muted-foreground">{file.name}</p>
        </div>
      </div>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Prévia do comprovante"
          className="max-h-80 w-full rounded-xl object-contain"
        />
      ) : null}
    </>
  );
}

function useImagePreview(file: File | null): string | null {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);

  useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return preview?.file === file ? preview.url : null;
}
