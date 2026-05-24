import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BeltDto, Student } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { Download04Icon, PlusSignIcon, Upload04Icon, UserMultipleIcon } from "hugeicons-react";
import { type FormEvent, type InputHTMLAttributes, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

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
  const [status, setStatus] = useState<StudentStatusFilter>("active");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);

  const beltsQuery = useQuery({
    queryKey: ["belts"],
    queryFn: async () => {
      const { data, error } = await api.GET("/belts");
      if (error) throw new Error("Nao foi possivel carregar faixas.");
      return data;
    },
  });

  const studentsQuery = useQuery({
    queryKey: ["students", status],
    queryFn: async () => {
      const { data, error } = await api.GET("/students", {
        params: { query: { status } },
      });
      if (error) throw new Error("Nao foi possivel carregar alunos.");
      return data;
    },
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
      setCreatedInviteLink(data.inviteLink);
      await queryClient.invalidateQueries({ queryKey: ["students"] });
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
    previewToken: string;
    rows: Array<Record<string, string>>;
    errors: Array<{ row: number; message: string }>;
    warnings: Array<{ row: number; message: string }>;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const importPreviewMutation = useMutation({
    mutationFn: async (csvContent: string) => {
      const { data, error } = await (api.POST as never)("/students/import-csv", {
        body: { csv: csvContent },
      });
      if (error) throw new Error("Falha ao processar CSV.");
      return data;
    },
    onSuccess: (data: never) => {
      setImportPreview(data);
      setImportError(null);
    },
    onError: (err: Error) => {
      setImportError(err.message);
    },
  });

  const importConfirmMutation = useMutation({
    mutationFn: async (previewToken: string) => {
      const { data, error } = await (api.POST as never)("/students/import-csv/confirm", {
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

  const students = studentsQuery.data?.students ?? [];
  const summary = studentsQuery.data?.summary;
  const hasStudents = students.length > 0;

  const title = useMemo(() => {
    if (status === "active") return "Alunos ativos";
    if (status === "inactive") return "Alunos inativos";
    return "Todos os alunos";
  }, [status]);

  function openCreateForm() {
    setEditingStudent(null);
    setForm(emptyForm);
    setError(null);
    setIsFormOpen(true);
  }

  function openEditForm(student: Student) {
    setEditingStudent(student);
    setForm({
      name: student.name,
      birthDate: student.birthDate,
      enrollmentDate: student.enrollmentDate,
      phone: student.phone ?? "",
      email: student.email ?? "",
      monthlyAmount: centsToReais(student.monthlyAmountInCents),
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
      monthlyAmountInCents: reaisToCents(form.monthlyAmount),
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
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
        <Badge variant="muted">Cadastro V0</Badge>
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Alunos</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Cadastre alunos, responsáveis, dados de mensalidade e graduação inicial da academia.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExportCsv}>
              <Download04Icon className="size-4" /> Exportar CSV
            </Button>
            <Button
              variant="secondary"
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
      </section>

      {isImportOpen ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Importar alunos via CSV</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsImportOpen(false);
                setImportPreview(null);
                setImportError(null);
              }}
            >
              Fechar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!importPreview ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Selecione um arquivo CSV para importar alunos. O sistema mostrará uma
                  pré-visualização antes de confirmar.
                </p>
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
                {importPreview.errors.length > 0 ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                    <h4 className="font-medium text-destructive">
                      Erros ({importPreview.errors.length})
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-destructive">
                      {importPreview.errors.map((err) => (
                        <li key={`err-${err.row}`}>
                          Linha {err.row}: {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {importPreview.warnings.length > 0 ? (
                  <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                    <h4 className="font-medium text-yellow-700 dark:text-yellow-400">
                      Avisos ({importPreview.warnings.length})
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
                      {importPreview.warnings.map((warn) => (
                        <li key={`err-${err.row}`}>
                          Linha {warn.row}: {warn.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {importPreview.rows.length > 0 ? (
                  <div className="overflow-auto rounded-2xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {Object.keys(importPreview.rows[0] ?? {}).map((col) => (
                            <th
                              key={col}
                              className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {importPreview.rows.slice(0, 20).map((row, i) => (
                          <tr key={`err-${err.row}`}>
                            {Object.values(row).map((val, j) => (
                              <td key={String(j)} className="px-3 py-2 text-muted-foreground">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.rows.length > 20 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        Mostrando 20 de {importPreview.rows.length} linhas.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex gap-3 justify-end">
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
                    disabled={importConfirmMutation.isPending || importPreview.errors.length > 0}
                    onClick={() => importConfirmMutation.mutate(importPreview.previewToken)}
                  >
                    {importConfirmMutation.isPending
                      ? "Importando..."
                      : `Confirmar importação (${importPreview.rows.length} alunos)`}
                  </Button>
                </div>
              </div>
            )}
            {importError ? <p className="text-sm text-destructive">{importError}</p> : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Ativos"
          value={summary?.active ?? 0}
          active={status === "active"}
          onClick={() => setStatus("active")}
        />
        <SummaryCard
          label="Inativos"
          value={summary?.inactive ?? 0}
          active={status === "inactive"}
          onClick={() => setStatus("inactive")}
        />
        <SummaryCard
          label="Total"
          value={summary?.total ?? 0}
          active={status === "all"}
          onClick={() => setStatus("all")}
        />
      </div>

      {createdInviteLink ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <strong>Link de convite gerado</strong>
              <p className="mt-1 break-all text-sm text-muted-foreground">{createdInviteLink}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Guarde este link agora. Por segurança, ele não será mostrado novamente.
              </p>
            </div>
            <Button type="button" onClick={() => navigator.clipboard.writeText(createdInviteLink)}>
              Copiar link
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isFormOpen ? (
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
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>{title}</CardTitle>
          <span className="text-sm text-muted-foreground">{students.length} aluno(s)</span>
        </CardHeader>
        <CardContent>
          {studentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando alunos...</p>
          ) : null}
          {studentsQuery.isError ? (
            <p className="text-sm text-destructive">Não foi possível carregar alunos.</p>
          ) : null}
          {!studentsQuery.isLoading && !hasStudents ? (
            <StudentsEmptyState onCreate={openCreateForm} />
          ) : null}
          {hasStudents ? (
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_1fr_0.9fr] gap-4 border-border border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] md:grid">
                <span>Aluno</span>
                <span>Status</span>
                <span>Matrícula</span>
                <span>Graduação</span>
                <span>Mensalidade</span>
                <span>Ações</span>
              </div>
              <div className="divide-y divide-border">
                {students.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    onEdit={() => openEditForm(student)}
                    onToggleStatus={() =>
                      statusMutation.mutate({
                        id: student.id,
                        action: student.status === "active" ? "inactivate" : "reactivate",
                      })
                    }
                    onGenerateInvite={() => inviteMutation.mutate(student.id)}
                    onRevokeInvite={(inviteId) =>
                      revokeInviteMutation.mutate({ studentId: student.id, inviteId })
                    }
                    onRevokeAccess={() => revokeAccessMutation.mutate(student.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
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
    <Card>
      <CardHeader>
        <CardTitle>{props.editingStudent ? "Editar aluno" : "Novo aluno"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={props.onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Nome"
              required
              value={props.form.name}
              onChange={(value) => props.updateForm("name", value)}
            />
            <Field
              label="Nascimento"
              required
              placeholder="AAAA-MM-DD"
              value={props.form.birthDate}
              onChange={(value) => props.updateForm("birthDate", value)}
            />
            <Field
              label="Matricula"
              required
              placeholder="AAAA-MM-DD"
              value={props.form.enrollmentDate}
              onChange={(value) => props.updateForm("enrollmentDate", value)}
            />
            <Field
              label="Telefone"
              value={props.form.phone}
              onChange={(value) => props.updateForm("phone", value)}
            />
            <Field
              label="Email"
              type="email"
              value={props.form.email}
              onChange={(value) => props.updateForm("email", value)}
            />
            <Field
              label="Valor mensal (R$)"
              inputMode="decimal"
              value={props.form.monthlyAmount}
              onChange={(value) => props.updateForm("monthlyAmount", value)}
            />
            <Field
              label="Dia de vencimento"
              type="number"
              min="1"
              max="31"
              value={props.form.monthlyDueDay}
              onChange={(value) => props.updateForm("monthlyDueDay", value)}
            />
            <label className="space-y-2 text-sm font-medium">
              <span>Faixa</span>
              <select
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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field
                label="Nome do responsável"
                value={props.form.guardianName}
                onChange={(value) => props.updateForm("guardianName", value)}
              />
              <Field
                label="Telefone do responsável"
                value={props.form.guardianPhone}
                onChange={(value) => props.updateForm("guardianPhone", value)}
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

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={props.onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={props.isSaving}>
              {props.isSaving ? "Salvando..." : "Salvar aluno"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
    label: string;
    onChange: (value: string) => void;
  },
) {
  const { label, onChange, ...inputProps } = props;
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      <input
        {...inputProps}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StudentRow(props: {
  student: Student;
  onEdit: () => void;
  onToggleStatus: () => void;
  onGenerateInvite: () => void;
  onRevokeInvite: (inviteId: string) => void;
  onRevokeAccess: () => void;
}) {
  const student = props.student;
  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_1fr_0.9fr] md:items-center">
      <div>
        <strong>{student.name}</strong>
        <p className="mt-1 text-sm text-muted-foreground">
          {ageLabel(student.birthDate)} · {student.phone ?? "Sem telefone"}
        </p>
        {student.guardian ? (
          <p className="text-xs text-muted-foreground">Resp.: {student.guardian.name}</p>
        ) : null}
      </div>
      <div>
        <Badge variant={student.status === "active" ? "default" : "muted"}>
          {student.status === "active" ? "Ativo" : "Inativo"}
        </Badge>
      </div>
      <span className="text-sm text-muted-foreground">{formatDate(student.enrollmentDate)}</span>
      <span className="text-sm text-muted-foreground">
        {student.belt?.name ?? "—"} · {student.currentDegree}º
      </span>
      <span className="text-sm text-muted-foreground">{billingLabel(student)}</span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={props.onEdit}>
          Editar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={props.onToggleStatus}>
          {student.status === "active" ? "Inativar" : "Reativar"}
        </Button>
        <AccessActions
          student={student}
          onGenerateInvite={props.onGenerateInvite}
          onRevokeInvite={props.onRevokeInvite}
          onRevokeAccess={props.onRevokeAccess}
        />
      </div>
    </div>
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

function reaisToCents(value: string): number | null {
  if (!value.trim()) return null;
  const normalized = value.replace(".", "").replace(",", ".");
  return Math.round(Number(normalized) * 100);
}

function centsToReais(value: number | null): string {
  if (value === null) return "";
  return (value / 100).toFixed(2).replace(".", ",");
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function ageLabel(birthDate: string): string {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  const today = new Date();
  let age = today.getFullYear() - birth.getUTCFullYear();
  const birthdayPassed =
    today.getMonth() > birth.getUTCMonth() ||
    (today.getMonth() === birth.getUTCMonth() && today.getDate() >= birth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return `${age} anos`;
}

function billingLabel(student: Student): string {
  if (student.monthlyAmountInCents === null && student.monthlyDueDay === null)
    return "Sem mensalidade";
  const amount =
    student.monthlyAmountInCents === null
      ? "valor livre"
      : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
          student.monthlyAmountInCents / 100,
        );
  const dueDay = student.monthlyDueDay ? `dia ${student.monthlyDueDay}` : "sem vencimento";
  return `${amount} · ${dueDay}`;
}
