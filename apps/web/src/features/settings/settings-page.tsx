import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BeltDto } from "@tatamiq/contracts";
import { Settings02Icon } from "hugeicons-react";
import { type FormEvent, type InputHTMLAttributes, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

type PixKeyType = "cpf" | "email" | "phone" | "random";

type SettingsFormState = {
  name: string;
  address: string;
  phone: string;
  instagram: string;
  pixMode: "key" | "copy_paste" | "none";
  pixKeyType: PixKeyType;
  pixKey: string;
  pixCopyPaste: string;
};

const emptyForm: SettingsFormState = {
  name: "",
  address: "",
  phone: "",
  instagram: "",
  pixMode: "none",
  pixKeyType: "cpf",
  pixKey: "",
  pixCopyPaste: "",
};

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const academyQuery = useQuery({
    queryKey: ["academy"],
    queryFn: async () => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data, error } = await (api.GET as any)("/academy");
      if (error) throw new Error("Não foi possível carregar dados da academia.");
      return data as {
        id: string;
        name: string;
        slug: string;
        logo: string | null;
        address: string | null;
        phone: string | null;
        instagram: string | null;
        pixKeyType: string | null;
        pixKey: string | null;
        pixCopyPaste: string | null;
      };
    },
  });

  useEffect(() => {
    if (academyQuery.data) {
      const data = academyQuery.data;
      let pixMode: SettingsFormState["pixMode"] = "none";
      if (data.pixCopyPaste) {
        pixMode = "copy_paste";
      } else if (data.pixKeyType || data.pixKey) {
        pixMode = "key";
      }

      setForm({
        name: data.name ?? "",
        address: data.address ?? "",
        phone: data.phone ?? "",
        instagram: data.instagram ?? "",
        pixMode,
        pixKeyType: (data.pixKeyType as PixKeyType) ?? "cpf",
        pixKey: data.pixKey ?? "",
        pixCopyPaste: data.pixCopyPaste ?? "",
      });
      setLogoPreview(data.logo ?? null);
    }
  }, [academyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data, error } = await (api.PATCH as any)("/academy", { body: input });
      if (error) throw new Error("Não foi possível salvar as configurações.");
      return data;
    },
    onSuccess: async () => {
      setSuccess("Configurações salvas com sucesso.");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["academy"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Erro ao salvar configurações.");
      setSuccess(null);
    },
  });

  function updateForm(field: keyof SettingsFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const payload: Record<string, unknown> = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      instagram: form.instagram,
    };

    if (form.pixMode === "key") {
      payload.pixKeyType = form.pixKeyType;
      payload.pixKey = form.pixKey;
      payload.pixCopyPaste = "";
    } else if (form.pixMode === "copy_paste") {
      payload.pixKeyType = null;
      payload.pixKey = "";
      payload.pixCopyPaste = form.pixCopyPaste;
    } else {
      payload.pixKeyType = null;
      payload.pixKey = "";
      payload.pixCopyPaste = "";
    }

    saveMutation.mutate(payload);
  }

  async function handleLogoUpload(file: File) {
    setIsUploading(true);
    setError(null);
    try {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { data: uploadData, error: uploadError } = await (api.POST as any)(
        "/academy/logo/upload-url",
      );
      if (uploadError || !uploadData) {
        throw new Error("Não foi possível gerar URL de upload.");
      }

      await fetch(uploadData.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { error: confirmError } = await (api.POST as any)("/academy/logo/confirm", {
        body: { fileKey: uploadData.fileKey },
      });
      if (confirmError) {
        throw new Error("Não foi possível confirmar o logo.");
      }

      await queryClient.invalidateQueries({ queryKey: ["academy"] });
      setSuccess("Logo atualizado com sucesso.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar logo.");
    } finally {
      setIsUploading(false);
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    void handleLogoUpload(file);
  }

  if (academyQuery.isLoading) {
    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
          <p className="text-sm text-muted-foreground">Carregando configurações...</p>
        </section>
      </div>
    );
  }

  if (academyQuery.isError) {
    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
          <p className="text-sm text-destructive">Não foi possível carregar configurações.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl md:p-8">
        <Badge variant="muted">Configurações</Badge>
        <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">Configurações</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Dados da academia, logo, contato e configuração de Pix para recebimento.
            </p>
          </div>
          <div className="grid size-14 place-items-center rounded-3xl border border-border bg-muted text-primary">
            <Settings02Icon className="size-7" />
          </div>
        </div>
      </section>

      <form className="space-y-6" onSubmit={submitForm}>
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo da academia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-3xl border border-border bg-muted">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="size-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">
                    {form.name.charAt(0).toUpperCase() || "?"}
                  </span>
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? "Enviando..." : "Alterar logo"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  JPG, PNG ou WebP. Tamanho recomendado: 256x256px.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da academia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Nome da academia"
                required
                value={form.name}
                onChange={(value) => updateForm("name", value)}
              />
              <Field
                label="Endereço"
                value={form.address}
                onChange={(value) => updateForm("address", value)}
              />
              <Field
                label="Telefone / WhatsApp"
                value={form.phone}
                onChange={(value) => updateForm("phone", value)}
              />
              <Field
                label="Instagram"
                placeholder="@suaacademia"
                value={form.instagram}
                onChange={(value) => updateForm("instagram", value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pix */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração de Pix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure a chave ou código Pix que aparecerá para os alunos no portal de pagamento.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pixMode"
                  checked={form.pixMode === "none"}
                  onChange={() => updateForm("pixMode", "none")}
                  className="accent-primary"
                />
                Sem Pix
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pixMode"
                  checked={form.pixMode === "key"}
                  onChange={() => updateForm("pixMode", "key")}
                  className="accent-primary"
                />
                Chave Pix
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pixMode"
                  checked={form.pixMode === "copy_paste"}
                  onChange={() => updateForm("pixMode", "copy_paste")}
                  className="accent-primary"
                />
                Copia e cola
              </label>
            </div>

            {form.pixMode === "key" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Tipo da chave"
                  value={form.pixKeyType}
                  onChange={(value) => updateForm("pixKeyType", value)}
                  options={[
                    { value: "cpf", label: "CPF" },
                    { value: "email", label: "Email" },
                    { value: "phone", label: "Telefone" },
                    { value: "random", label: "Aleatória" },
                  ]}
                />
                <Field
                  label="Chave Pix"
                  value={form.pixKey}
                  onChange={(value) => updateForm("pixKey", value)}
                />
              </div>
            ) : null}

            {form.pixMode === "copy_paste" ? (
              <div>
                <label className="space-y-2 text-sm font-medium">
                  <span>Código Pix copia e cola</span>
                  <textarea
                    value={form.pixCopyPaste}
                    onChange={(event) => updateForm("pixCopyPaste", event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-green-600">{success}</p> : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </form>

      <BeltRulesSection />
    </div>
  );
}

function BeltRulesSection() {
  const queryClient = useQueryClient();
  const [editingBelts, setEditingBelts] = useState<Record<string, Partial<BeltRuleFields>>>({});
  const [savingBeltId, setSavingBeltId] = useState<string | null>(null);
  const [beltSuccess, setBeltSuccess] = useState<string | null>(null);

  const beltsQuery = useQuery({
    queryKey: ["belts"],
    queryFn: async () => {
      const { data, error } = await api.GET("/belts");
      if (error) throw new Error("Nao foi possivel carregar faixas.");
      return data;
    },
  });

  const updateBeltMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<BeltRuleFields> }) => {
      setSavingBeltId(id);
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { error } = await (api.PATCH as any)("/belts/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw new Error("Não foi possível salvar regras da faixa.");
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["belts"] });
      setEditingBelts((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      setBeltSuccess("Regras salvas com sucesso.");
      setTimeout(() => setBeltSuccess(null), 3000);
    },
    onSettled: () => setSavingBeltId(null),
  });

  const belts = beltsQuery.data?.belts ?? [];
  const adultBelts = belts.filter((b) => b.path === "adult");
  const childBelts = belts.filter((b) => b.path === "child");

  function getBeltValue(belt: BeltDto, field: keyof BeltRuleFields): number | null {
    const override = editingBelts[belt.id]?.[field];
    if (override !== undefined) return override;
    // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
    return (belt as any)[field] ?? null;
  }

  function updateBeltField(beltId: string, field: keyof BeltRuleFields, value: string) {
    const numValue = value === "" ? null : Number(value);
    setEditingBelts((current) => ({
      ...current,
      [beltId]: { ...current[beltId], [field]: numValue },
    }));
  }

  function saveBelt(beltId: string) {
    const changes = editingBelts[beltId];
    if (!changes) return;
    updateBeltMutation.mutate({ id: beltId, body: changes });
  }

  function renderBeltTable(groupBelts: BeltDto[], groupLabel: string) {
    if (groupBelts.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {groupLabel}
        </h4>
        <div className="overflow-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Faixa
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Graus máx.
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Meses p/ grau
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Presenças p/ grau
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Meses p/ faixa
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Presenças p/ faixa
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groupBelts.map((belt) => {
                const hasChanges = !!editingBelts[belt.id];
                const isSaving = savingBeltId === belt.id;
                return (
                  <tr key={belt.id}>
                    <td className="px-3 py-2 font-medium">{belt.name}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        className="h-9 w-20 rounded-xl border border-border bg-background px-2 text-foreground outline-none focus:border-primary"
                        value={getBeltValue(belt, "maxDegrees") ?? ""}
                        onChange={(e) => updateBeltField(belt.id, "maxDegrees", e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        className="h-9 w-20 rounded-xl border border-border bg-background px-2 text-foreground outline-none focus:border-primary"
                        value={getBeltValue(belt, "minMonthsForNextDegree") ?? ""}
                        onChange={(e) =>
                          updateBeltField(belt.id, "minMonthsForNextDegree", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        className="h-9 w-20 rounded-xl border border-border bg-background px-2 text-foreground outline-none focus:border-primary"
                        value={getBeltValue(belt, "minAttendancesForNextDegree") ?? ""}
                        onChange={(e) =>
                          updateBeltField(belt.id, "minAttendancesForNextDegree", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        className="h-9 w-20 rounded-xl border border-border bg-background px-2 text-foreground outline-none focus:border-primary"
                        value={getBeltValue(belt, "minMonthsForNextBelt") ?? ""}
                        onChange={(e) =>
                          updateBeltField(belt.id, "minMonthsForNextBelt", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        className="h-9 w-20 rounded-xl border border-border bg-background px-2 text-foreground outline-none focus:border-primary"
                        value={getBeltValue(belt, "minAttendancesForNextBelt") ?? ""}
                        onChange={(e) =>
                          updateBeltField(belt.id, "minAttendancesForNextBelt", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      {hasChanges ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={isSaving}
                          onClick={() => saveBelt(belt.id)}
                        >
                          {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (beltsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Regras de graduação</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando faixas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras de graduação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure os requisitos mínimos para promoção de grau e faixa. Deixe em branco para não
          exigir critério.
        </p>
        {beltSuccess ? <p className="text-sm text-green-600">{beltSuccess}</p> : null}
        {renderBeltTable(adultBelts, "Adulto")}
        {renderBeltTable(childBelts, "Infantil")}
      </CardContent>
    </Card>
  );
}

type BeltRuleFields = {
  maxDegrees: number | null;
  minMonthsForNextDegree: number | null;
  minAttendancesForNextDegree: number | null;
  minMonthsForNextBelt: number | null;
  minAttendancesForNextBelt: number | null;
};

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
