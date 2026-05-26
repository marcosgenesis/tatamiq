import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  getCoreRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import type { BeltDto, Student } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { Download04Icon, PlusSignIcon, Upload04Icon, UserMultipleIcon } from "hugeicons-react";
import { type FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/reui/badge";
import { DataGrid, DataGridContainer } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { DatePicker } from "@/components/reui/date-picker";
import { api } from "../../api";
import { Field, SelectField } from "../../components/form-field";
import { Button } from "../../components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import { useBelts } from "../../hooks/use-belts";
import { useStudents } from "../../hooks/use-students";
import { ageLabel, billingLabel, formatDate } from "../../lib/formatting";
import { maskCurrency, maskPhone } from "../../lib/masks";

type StudentStatusFilter = "active" | "inactive" | "all";
type StudentPayload = components["schemas"]["UpdateStudentDto"];
type StudentFormState = {
  name: string;
  birthDate: string;
  enrollmentDate: string;
  phone: string;
  email: string;
  monthlyAmount: string;
  monthlyDueDay: string;
  currentBeltId: string;
  currentDegree: string;
  status: Student["status"];
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelationship: string;
};

const emptyForm: StudentFormState = {
  name: "",
  birthDate: "",
  enrollmentDate: new Date().toISOString().slice(0, 10),
  phone: "",
  email: "",
  monthlyAmount: "",
  monthlyDueDay: "",
  currentBeltId: "",
  currentDegree: "0",
  status: "active",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  guardianRelationship: "",
};

export function StudentsPage() {
  const queryClient = useQueryClient();
  const [status, _setStatus] = useState<StudentStatusFilter>("active");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const beltsQuery = useBelts();
  const studentsQuery = useStudents(status, {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
  });

  const saveMutation = useMutation({
    mutationFn: async (input: StudentPayload) => {
      if (editingStudent) {
        const { data, error } = await api.PATCH("/students/{id}", {
          params: { path: { id: editingStudent.id } },
          body: input,
        });
        if (error) throw new Error("Não foi possível salvar o aluno.");
        return data;
      }

      const { data, error } = await api.POST("/students", { body: input });
      if (error) throw new Error("Não foi possível criar o aluno.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      closeForm();
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Erro ao salvar aluno.");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await api.POST("/students/{id}/access-invites", {
        params: { path: { id: studentId } },
      });
      if (error) throw new Error("Não foi possível gerar convite.");
      return data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      toast("Link de convite gerado", {
        description: data.inviteLink,
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Copiar",
          onClick: () => navigator.clipboard.writeText(data.inviteLink),
        },
      });
    },
  });

  const revokeInviteMutation = useMutation({
    mutationFn: async ({ studentId, inviteId }: { studentId: string; inviteId: string }) => {
      const { error } = await api.POST("/students/{id}/access-invites/{inviteId}/revoke", {
        params: { path: { id: studentId, inviteId } },
      });
      if (error) throw new Error("Não foi possível revogar convite.");
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await api.POST("/students/{id}/access/revoke", {
        params: { path: { id: studentId } },
      });
      if (error) throw new Error("Não foi possível revogar acesso.");
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "inactivate" | "reactivate" }) => {
      if (action === "inactivate") {
        const { error } = await api.POST("/students/{id}/inactivate", {
          params: { path: { id } },
        });
        if (error) throw new Error("Não foi possível atualizar o status do aluno.");
        return;
      }

      const { error } = await api.POST("/students/{id}/reactivate", {
        params: { path: { id } },
      });
      if (error) throw new Error("Não foi possível atualizar o status do aluno.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  // CSV import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    totalLines: number;
    validLines: number;
    errorLines: number;
    previewToken: string;
    lines: Array<{ line: number; name: string; errors: string[]; warnings: string[] }>;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const importPreviewMutation = useMutation({
    mutationFn: async (csvContent: string) => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data, error } = await (api.POST as any)("/students/import-csv", {
        body: { csv: csvContent },
      });
      if (error) throw new Error("Falha ao processar CSV.");
      return data;
    },
    // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
    onSuccess: (data: any) => {
      setImportPreview(data);
      setImportError(null);
    },
    onError: (err: Error) => {
      setImportError(err.message);
    },
  });

  const importConfirmMutation = useMutation({
    mutationFn: async (previewToken: string) => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data, error } = await (api.POST as any)("/students/import-csv/confirm", {
        body: { previewToken },
      });
      if (error) throw new Error("Falha ao confirmar importação.");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsImportOpen(false);
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
    // Reset so the same file can be selected again
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

  const students = studentsQuery.data?.students ?? [];
  const hasStudents = students.length > 0;

  const openEditForm = useCallback((student: Student) => {
    setEditingStudent(student);
    setForm({
      name: student.name,
      birthDate: student.birthDate,
      enrollmentDate: student.enrollmentDate,
      phone: student.phone ?? "",
      email: student.email ?? "",
      monthlyAmount: student.monthlyAmountInCents?.toString() ?? "",
      monthlyDueDay: student.monthlyDueDay?.toString() ?? "",
      currentBeltId: student.currentBeltId,
      currentDegree: student.currentDegree.toString(),
      status: student.status,
      guardianName: student.guardian?.name ?? "",
      guardianPhone: student.guardian?.phone ?? "",
      guardianEmail: student.guardian?.email ?? "",
      guardianRelationship: student.guardian?.relationship ?? "",
    });
    setError(null);
    setIsFormOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Aluno",
        size: 280,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div>
              <strong>{s.name}</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {ageLabel(s.birthDate)} · {s.phone ?? "Sem telefone"}
              </p>
              {s.guardian ? (
                <p className="text-xs text-muted-foreground">Resp.: {s.guardian.name}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "active" ? "success-light" : "destructive-light"}>
            {row.original.status === "active" ? "Ativo" : "Inativo"}
          </Badge>
        ),
      },
      {
        accessorKey: "enrollmentDate",
        header: "Matrícula",
        size: 120,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.enrollmentDate)}
          </span>
        ),
      },
      {
        id: "graduation",
        header: "Graduação",
        size: 120,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.belt?.name ?? "—"} · {row.original.currentDegree}º
          </span>
        ),
      },
      {
        id: "billing",
        header: "Mensalidade",
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{billingLabel(row.original)}</span>
        ),
      },
      {
        id: "actions",
        header: "Ações",
        size: 200,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(s)}>
                Editar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  statusMutation.mutate({
                    id: s.id,
                    action: s.status === "active" ? "inactivate" : "reactivate",
                  })
                }
              >
                {s.status === "active" ? "Inativar" : "Reativar"}
              </Button>
              <AccessActions
                student={s}
                onGenerateInvite={() => inviteMutation.mutate(s.id)}
                onRevokeInvite={(inviteId) =>
                  revokeInviteMutation.mutate({ studentId: s.id, inviteId })
                }
                onRevokeAccess={() => revokeAccessMutation.mutate(s.id)}
              />
            </div>
          );
        },
      },
    ],
    [statusMutation, inviteMutation, revokeInviteMutation, revokeAccessMutation, openEditForm],
  );

  const serverPagination = studentsQuery.data?.pagination;

  const table = useReactTable({
    data: students,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: serverPagination?.totalPages ?? -1,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  function openCreateForm() {
    setEditingStudent(null);
    setForm(emptyForm);
    setError(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingStudent(null);
    setError(null);
  }

  function updateForm(field: keyof StudentFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const guardian =
      form.guardianName.trim() || form.guardianPhone.trim()
        ? {
            name: form.guardianName,
            phone: form.guardianPhone,
            email: form.guardianEmail,
            relationship: form.guardianRelationship,
          }
        : null;

    const payload: StudentPayload = {
      name: form.name,
      birthDate: form.birthDate,
      enrollmentDate: form.enrollmentDate,
      phone: form.phone,
      email: form.email,
      monthlyAmountInCents: form.monthlyAmount ? Number(form.monthlyAmount) : null,
      monthlyDueDay: form.monthlyDueDay ? Number(form.monthlyDueDay) : null,
      currentBeltId: form.currentBeltId,
      currentDegree: Number(form.currentDegree),
      guardian,
    };

    if (editingStudent) {
      payload.status = form.status;
    }

    saveMutation.mutate(payload);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex gap-1.5 items-center">
            <h1 className="text-2xl">Alunos</h1>{" "}
            <Badge variant={"primary-light"}>{students.length}</Badge>
          </div>

          <p className="max-w-2xl text-base leading-7 text-muted-foreground">
            Cadastre alunos, responsáveis, dados de mensalidade e graduação inicial da academia.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <Download04Icon className="size-4" /> Exportar CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsImportOpen(true);
              setImportPreview(null);
              setImportError(null);
            }}
          >
            <Upload04Icon className="size-4" /> Importar CSV
          </Button>
          <Button onClick={openCreateForm}>
            <PlusSignIcon className="size-4" /> Novo aluno
          </Button>
        </div>
      </div>

      <Drawer
        direction="right"
        open={isImportOpen}
        onOpenChange={(open: boolean) => {
          setIsImportOpen(open);
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

      <Drawer
        direction="right"
        open={isFormOpen}
        onOpenChange={(open: boolean) => {
          if (!open) closeForm();
        }}
      >
        <DrawerContent>
          <StudentForm
            editingStudent={editingStudent}
            error={error}
            form={form}
            belts={beltsQuery.data?.belts ?? []}
            isSaving={saveMutation.isPending}
            onCancel={closeForm}
            onSubmit={submitForm}
            updateForm={updateForm}
          />
        </DrawerContent>
      </Drawer>

      <div>
        {studentsQuery.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar alunos.</p>
        ) : null}
        {!studentsQuery.isLoading && !hasStudents ? (
          <StudentsEmptyState onCreate={openCreateForm} />
        ) : null}
        {hasStudents || studentsQuery.isLoading ? (
          <DataGridContainer>
            <DataGrid
              table={table}
              recordCount={serverPagination?.total ?? students.length}
              isLoading={studentsQuery.isLoading}
              emptyMessage="Nenhum aluno encontrado."
              tableLayout={{ headerSticky: true }}
              tableClassNames={{ edgeCell: "px-4" }}
            >
              <DataGridTable />
              <DataGridPagination
                className="px-4 py-2"
                rowsPerPageLabel="Linhas por página"
                info="{from} - {to} de {count}"
                sizes={[10, 25, 50, 100]}
              />
            </DataGrid>
          </DataGridContainer>
        ) : null}
      </div>
    </div>
  );
}

function StudentForm(props: {
  editingStudent: Student | null;
  error: string | null;
  form: StudentFormState;
  belts: BeltDto[];
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  updateForm: (field: keyof StudentFormState, value: string) => void;
}) {
  const adultBelts = props.belts.filter((b) => b.path === "adult");
  const childBelts = props.belts.filter((b) => b.path === "child");

  return (
    <form className="flex h-full flex-col" onSubmit={props.onSubmit}>
      <DrawerHeader>
        <DrawerTitle>{props.editingStudent ? "Editar aluno" : "Novo aluno"}</DrawerTitle>
        <DrawerDescription>
          {props.editingStudent
            ? "Atualize os dados do aluno."
            : "Preencha os dados para cadastrar um novo aluno."}
        </DrawerDescription>
      </DrawerHeader>
      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-4">
        <div className="grid gap-4">
          <Field
            label="Nome"
            required
            value={props.form.name}
            onChange={(value) => props.updateForm("name", value)}
          />
          <div className="space-y-2 text-sm font-medium">
            <span>
              Nascimento
              <span className="text-destructive ml-0.5">*</span>
            </span>
            <DatePicker
              value={props.form.birthDate}
              onChange={(value) => props.updateForm("birthDate", value)}
              placeholder="Selecionar data de nascimento"
            />
          </div>
          <div className="space-y-2 text-sm font-medium">
            <span>
              Matrícula
              <span className="text-destructive ml-0.5">*</span>
            </span>
            <DatePicker
              value={props.form.enrollmentDate}
              onChange={(value) => props.updateForm("enrollmentDate", value)}
              placeholder="Selecionar data de matrícula"
            />
          </div>
          <Field
            label="Telefone"
            placeholder="(00) 00000-0000"
            value={maskPhone(props.form.phone)}
            onChange={(value) => props.updateForm("phone", value.replace(/\D/g, ""))}
          />
          <Field
            label="Email"
            type="email"
            value={props.form.email}
            onChange={(value) => props.updateForm("email", value)}
          />
          <Field
            label="Valor mensal (R$)"
            inputMode="numeric"
            placeholder="0,00"
            value={maskCurrency(props.form.monthlyAmount)}
            onChange={(value) => {
              const digits = value.replace(/\D/g, "");
              props.updateForm("monthlyAmount", digits);
            }}
          />
          <Field
            label="Dia de vencimento"
            type="number"
            min="1"
            max="31"
            placeholder="Ex: 10"
            value={props.form.monthlyDueDay}
            onChange={(value) => props.updateForm("monthlyDueDay", value)}
          />
          <label className="space-y-2 text-sm font-medium">
            <span>
              Faixa
              <span className="text-destructive ml-0.5">*</span>
            </span>
            <select
              required
              value={props.form.currentBeltId}
              onChange={(event) => props.updateForm("currentBeltId", event.target.value)}
              className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Selecione a faixa</option>
              {adultBelts.length > 0 && (
                <optgroup label="Adulto">
                  {adultBelts.map((belt) => (
                    <option key={belt.id} value={belt.id}>
                      {belt.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {childBelts.length > 0 && (
                <optgroup label="Infantil">
                  {childBelts.map((belt) => (
                    <option key={belt.id} value={belt.id}>
                      {belt.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
          <SelectField
            label="Grau"
            required
            value={props.form.currentDegree}
            onChange={(value) => props.updateForm("currentDegree", value)}
            options={[0, 1, 2, 3, 4, 5, 6].map((value) => ({
              value: String(value),
              label: `${value} grau(s)`,
            }))}
          />
          {props.editingStudent ? (
            <SelectField
              label="Status"
              value={props.form.status}
              onChange={(value) => props.updateForm("status", value)}
              options={[
                { value: "active", label: "Ativo" },
                { value: "inactive", label: "Inativo" },
              ]}
            />
          ) : null}
        </div>

        <div className="rounded-3xl border border-border bg-muted/30 p-4">
          <h3 className="font-medium">Responsável</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Obrigatório para aluno menor de idade.
          </p>
          <div className="mt-4 grid gap-4">
            <Field
              label="Nome do responsável"
              value={props.form.guardianName}
              onChange={(value) => props.updateForm("guardianName", value)}
            />
            <Field
              label="Telefone do responsável"
              placeholder="(00) 00000-0000"
              value={maskPhone(props.form.guardianPhone)}
              onChange={(value) => props.updateForm("guardianPhone", value.replace(/\D/g, ""))}
            />
            <Field
              label="Email do responsável"
              type="email"
              value={props.form.guardianEmail}
              onChange={(value) => props.updateForm("guardianEmail", value)}
            />
            <Field
              label="Parentesco"
              value={props.form.guardianRelationship}
              onChange={(value) => props.updateForm("guardianRelationship", value)}
            />
          </div>
        </div>

        {props.error ? <p className="text-sm text-destructive">{props.error}</p> : null}
      </div>
      <DrawerFooter>
        <DrawerClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DrawerClose>
        <Button type="submit" disabled={props.isSaving}>
          {props.isSaving ? "Salvando..." : "Salvar aluno"}
        </Button>
      </DrawerFooter>
    </form>
  );
}

function AccessActions(props: {
  student: Student;
  onGenerateInvite: () => void;
  onRevokeInvite: (inviteId: string) => void;
  onRevokeAccess: () => void;
}) {
  const access = props.student.accessState;

  if (props.student.status === "inactive") {
    return <span className="text-xs text-muted-foreground">Sem convite para inativo</span>;
  }

  if (access.status === "active") {
    return (
      <Button type="button" variant="destructive" size="sm" onClick={props.onRevokeAccess}>
        Revogar acesso
      </Button>
    );
  }

  if (access.status === "pending" && access.inviteId) {
    return (
      <>
        <Button type="button" variant="secondary" size="sm" onClick={props.onGenerateInvite}>
          Gerar novo link
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => props.onRevokeInvite(access.inviteId as string)}
        >
          Revogar convite
        </Button>
      </>
    );
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={props.onGenerateInvite}>
      {access.status === "expired" ? "Gerar novo convite" : "Gerar convite"}
    </Button>
  );
}

function StudentsEmptyState(props: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border p-10 text-center">
      <div className="grid size-14 place-items-center rounded-3xl bg-muted text-primary">
        <UserMultipleIcon className="size-7" />
      </div>
      <h2 className="mt-4 font-semibold">Nenhum aluno por aqui ainda</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Comece cadastrando o primeiro aluno da academia.
      </p>
      <Button className="mt-5" onClick={props.onCreate}>
        Cadastrar aluno
      </Button>
    </div>
  );
}
