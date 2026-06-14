import { useMutation } from "@tanstack/react-query";
import type {
  CsvImportConfirmInput,
  CsvImportPreviewInput,
  CsvImportPreviewResponse,
} from "@tatamiq/contracts";
import { Download04Icon, Upload04Icon } from "hugeicons-react";
import { useRef, useState } from "react";
import { api } from "../../../api";
import { Button } from "../../../components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../../components/ui/drawer";

export function StudentCsvImport(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}) {
  const [importPreview, setImportPreview] = useState<CsvImportPreviewResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const importPreviewMutation = useMutation({
    mutationFn: async (csvContent: string) => {
      const { data, error } = await api.POST("/students/import-csv", {
        body: { csv: csvContent } satisfies CsvImportPreviewInput,
      });
      if (error || !data) throw new Error("Falha ao processar CSV.");
      return data satisfies CsvImportPreviewResponse;
    },
    onSuccess: (data) => {
      setImportPreview(data);
      setImportError(null);
    },
    onError: (err: Error) => {
      setImportError(err.message);
    },
  });

  const importConfirmMutation = useMutation({
    mutationFn: async (previewToken: string) => {
      const { error } = await api.POST("/students/import-csv/confirm", {
        body: { previewToken } satisfies CsvImportConfirmInput,
      });
      if (error) throw new Error("Falha ao confirmar importação.");
    },
    onSuccess: () => {
      props.onImportComplete();
      props.onOpenChange(false);
      setImportPreview(null);
      setImportError(null);
    },
    onError: (err: Error) => {
      setImportError(err.message);
    },
  });

  function handleCsvFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      importPreviewMutation.mutate(text);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleExportCsv() {
    const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3100";
    window.open(`${baseUrl}/students/export.csv`, "_blank");
  }

  function handleDownloadImportTemplate() {
    const baseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3100";
    window.open(`${baseUrl}/students/import-csv/template.csv`, "_blank");
  }

  function openImport() {
    props.onOpenChange(true);
    setImportPreview(null);
    setImportError(null);
  }

  return (
    <>
      <Button variant="outline" onClick={handleExportCsv} className="justify-center">
        <Download04Icon className="size-4" /> Exportar CSV
      </Button>
      <Button variant="outline" className="justify-center" onClick={openImport}>
        <Upload04Icon className="size-4" /> Importar CSV
      </Button>
      <Drawer
        direction="right"
        open={props.open}
        onOpenChange={(open) => {
          props.onOpenChange(open);
          if (!open) {
            setImportPreview(null);
            setImportError(null);
          }
        }}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Importar alunos via CSV</DrawerTitle>
            <DrawerDescription>
              Selecione um arquivo CSV para importar alunos. O sistema mostrará uma pré-visualização
              antes de confirmar.
            </DrawerDescription>
          </DrawerHeader>
          <div className="no-scrollbar flex-1 overflow-y-auto px-4">
            {!importPreview ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  <p>
                    Baixe o modelo, preencha os dados dos alunos e mantenha os cabeçalhos em
                    português. Datas devem usar o formato AAAA-MM-DD e o valor mensal deve estar em
                    reais, como 150.00 ou 150,00.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    onClick={handleDownloadImportTemplate}
                  >
                    <Download04Icon className="size-4" /> Baixar modelo CSV
                  </Button>
                </div>
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleCsvFileChange}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={importPreviewMutation.isPending}
                  onClick={() => csvFileInputRef.current?.click()}
                >
                  {importPreviewMutation.isPending ? "Processando..." : "Selecionar arquivo CSV"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {importPreview.errorLines > 0 ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                    <h4 className="font-medium text-destructive">
                      Erros ({importPreview.errorLines})
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-destructive">
                      {importPreview.lines
                        .filter((line) => line.errors.length > 0)
                        .map((line) => (
                          <li key={`err-${line.line}`}>
                            Linha {line.line}: {line.errors.join("; ")}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
                {importPreview.lines.some((line) => line.warnings.length > 0) ? (
                  <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                    <h4 className="font-medium text-yellow-700 dark:text-yellow-400">Avisos</h4>
                    <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
                      {importPreview.lines
                        .filter((line) => line.warnings.length > 0)
                        .map((line) => (
                          <li key={`warn-${line.line}`}>
                            Linha {line.line}: {line.warnings.join("; ")}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
                {importPreview.lines.length > 0 ? (
                  <div className="overflow-auto rounded-2xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Linha
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Nome
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {importPreview.lines.slice(0, 20).map((line) => (
                          <tr key={`row-${line.line}`}>
                            <td className="px-3 py-2 text-muted-foreground">{line.line}</td>
                            <td className="px-3 py-2 text-muted-foreground">{line.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {line.errors.length > 0 ? "Com erro" : "Válida"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.lines.length > 20 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        Mostrando 20 de {importPreview.lines.length} linhas.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
            {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
          </div>
          {importPreview ? (
            <DrawerFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setImportPreview(null);
                  setImportError(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={importConfirmMutation.isPending || importPreview.errorLines > 0}
                onClick={() => importConfirmMutation.mutate(importPreview.previewToken)}
              >
                {importConfirmMutation.isPending
                  ? "Importando..."
                  : `Confirmar (${importPreview.validLines} alunos)`}
              </Button>
            </DrawerFooter>
          ) : (
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="secondary">Fechar</Button>
              </DrawerClose>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
