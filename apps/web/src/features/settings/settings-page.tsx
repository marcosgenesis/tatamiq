import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AcademyConfirmLogoInput, AcademyProfile, BeltDto } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { AlertCircleIcon, Cancel01Icon, UserIcon } from "hugeicons-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { Alert, AlertDescription, AlertTitle } from "../../components/reui/alert";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "../../components/reui/number-field";
import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { Textarea } from "../../components/ui/textarea";
import { useBelts } from "../../hooks/use-belts";
import { formatBytes, useFileUpload } from "../../hooks/use-file-upload";
import { academyQueryKey } from "../../lib/academy-query-keys";
import { cn } from "../../lib/utils";

type UpdateAcademyInput = components["schemas"]["UpdateAcademyDto"];
type UpdateBeltInput = components["schemas"]["UpdateBeltDto"];

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

function LogoUpload({
  defaultLogo,
  onUpload,
  isUploading,
}: {
  defaultLogo: string | null;
  onUpload: (file: File) => void;
  isUploading: boolean;
}) {
  const maxSize = 2 * 1024 * 1024;

  const [
    { files, isDragging, errors },
    {
      removeFile,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles: 1,
    maxSize,
    accept: "image/*",
    multiple: false,
    onFilesAdded: (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (file instanceof File) {
        onUpload(file);
      }
    },
  });

  const currentFile = files[0];
  const previewUrl = currentFile?.preview || defaultLogo;

  const handleRemove = () => {
    if (currentFile) {
      removeFile(currentFile.id);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <button
          type="button"
          className={cn(
            "group/avatar relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border border-dashed transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/20",
            previewUrl && "border-solid",
            isUploading && "opacity-50 pointer-events-none",
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input {...getInputProps()} className="sr-only" />
          {previewUrl ? (
            <img src={previewUrl} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserIcon className="text-muted-foreground size-6" strokeWidth={2} />
            </div>
          )}
        </button>

        {currentFile && (
          <Button
            size="icon"
            variant="outline"
            type="button"
            onClick={handleRemove}
            className="absolute end-0.5 top-0.5 z-10 size-6 rounded-full"
            aria-label="Remover logo"
          >
            <Cancel01Icon className="size-3.5" strokeWidth={2} />
          </Button>
        )}
      </div>

      <div className="space-y-0.5 text-center">
        <p className="text-sm font-medium">
          {isUploading ? "Enviando..." : currentFile ? "Logo atualizado" : "Enviar logo"}
        </p>
        <p className="text-muted-foreground text-xs">PNG, JPG ou WebP até {formatBytes(maxSize)}</p>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircleIcon strokeWidth={2} />
          <AlertTitle>Erro no upload</AlertTitle>
          <AlertDescription>
            {errors.map((error) => (
              <p key={error} className="last:mb-0">
                {error}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { activeAcademy, onRefreshAcademies } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const [form, setForm] = useState<SettingsFormState>(emptyForm);
  const [isUploading, setIsUploading] = useState(false);

  const academyQuery = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "academy"),
    queryFn: async () => {
      const { data, error } = await api.GET("/academy");
      if (error || !data) throw new Error("Não foi possível carregar dados da academia.");
      return data satisfies AcademyProfile;
    },
    enabled: !!activeAcademyId,
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
    }
  }, [academyQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (input: UpdateAcademyInput) => {
      const { data, error } = await api.PATCH("/academy", { body: input });
      if (error) throw new Error("Não foi possível salvar as configurações.");
      return data;
    },
    onSuccess: async () => {
      toast.success("Configurações salvas com sucesso.");
      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "academy"),
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações.");
    },
  });

  function updateForm(field: keyof SettingsFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      instagram: form.instagram,
      ...(form.pixMode === "key"
        ? {
            pixKeyType: form.pixKeyType,
            pixKey: form.pixKey,
            pixCopyPaste: "",
          }
        : form.pixMode === "copy_paste"
          ? {
              pixKeyType: null,
              pixKey: "",
              pixCopyPaste: form.pixCopyPaste,
            }
          : {
              pixKeyType: null,
              pixKey: "",
              pixCopyPaste: "",
            }),
    } satisfies UpdateAcademyInput;

    saveMutation.mutate(payload);
  }

  async function handleLogoUpload(file: File) {
    setIsUploading(true);
    try {
      const { data: uploadData, error: uploadError } = await api.POST("/academy/logo/upload-url");
      if (uploadError || !uploadData) {
        throw new Error("Não foi possível gerar URL de upload.");
      }

      const uploadRes = await fetch(uploadData.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) {
        throw new Error("Falha ao enviar arquivo.");
      }

      const { error: confirmError } = await api.POST("/academy/logo/confirm", {
        body: {
          fileKey: uploadData.fileKey,
          fileKeySignature: uploadData.fileKeySignature,
        } satisfies AcademyConfirmLogoInput,
      });
      if (confirmError) {
        throw new Error("Não foi possível confirmar o logo.");
      }

      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "academy"),
      });
      onRefreshAcademies();
      toast.success("Logo atualizado com sucesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar logo.");
    } finally {
      setIsUploading(false);
    }
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
    <div className="py-6 space-y-6">
      <form onSubmit={submitForm}>
        {/* Logo */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <h2 className="text-balance font-semibold text-foreground">Logo da academia</h2>
            <p className="text-pretty mt-1 text-sm leading-6 text-muted-foreground">
              Envie o logo da sua academia. Ele será exibido no portal do aluno e nos relatórios.
            </p>
          </div>
          <div className="sm:max-w-3xl md:col-span-2">
            <LogoUpload
              defaultLogo={academyQuery.data?.logo ?? null}
              onUpload={handleLogoUpload}
              isUploading={isUploading}
            />
          </div>
        </div>

        <Separator className="my-8" />

        {/* Dados da academia */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <h2 className="text-balance font-semibold text-foreground">Dados da academia</h2>
            <p className="text-pretty mt-1 text-sm leading-6 text-muted-foreground">
              Informações básicas como nome, endereço e contato.
            </p>
          </div>
          <div className="sm:max-w-3xl md:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
              <div className="col-span-full sm:col-span-3">
                <Field className="gap-2">
                  <FieldLabel htmlFor="academy-name">Nome da academia</FieldLabel>
                  <Input
                    id="academy-name"
                    required
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                  />
                </Field>
              </div>
              <div className="col-span-full sm:col-span-3">
                <Field className="gap-2">
                  <FieldLabel htmlFor="academy-address">Endereço</FieldLabel>
                  <Input
                    id="academy-address"
                    value={form.address}
                    onChange={(e) => updateForm("address", e.target.value)}
                  />
                </Field>
              </div>
              <div className="col-span-full sm:col-span-3">
                <Field className="gap-2">
                  <FieldLabel htmlFor="academy-phone">Telefone / WhatsApp</FieldLabel>
                  <Input
                    id="academy-phone"
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                  />
                </Field>
              </div>
              <div className="col-span-full sm:col-span-3">
                <Field className="gap-2">
                  <FieldLabel htmlFor="academy-instagram">Instagram</FieldLabel>
                  <Input
                    id="academy-instagram"
                    placeholder="@suaacademia"
                    value={form.instagram}
                    onChange={(e) => updateForm("instagram", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Pix */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <h2 className="text-balance font-semibold text-foreground">Configuração de Pix</h2>
            <p className="text-pretty mt-1 text-sm leading-6 text-muted-foreground">
              Configure a chave ou código Pix que aparecerá para os alunos no portal de pagamento.
            </p>
          </div>
          <div className="sm:max-w-3xl md:col-span-2">
            <div className="space-y-4">
              <RadioGroup
                value={form.pixMode}
                onValueChange={(value) => updateForm("pixMode", value as string)}
                className="flex flex-col gap-2 sm:flex-row sm:gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="none" />
                  <FieldLabel htmlFor="pix-none" className="font-normal">
                    Sem Pix
                  </FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="key" />
                  <FieldLabel htmlFor="pix-key" className="font-normal">
                    Chave Pix
                  </FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="copy_paste" />
                  <FieldLabel htmlFor="pix-copy-paste" className="font-normal">
                    Copia e cola
                  </FieldLabel>
                </div>
              </RadioGroup>

              {form.pixMode === "key" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <div className="col-span-full sm:col-span-3">
                    <Field className="gap-2">
                      <FieldLabel htmlFor="pix-key-type">Tipo da chave</FieldLabel>
                      <Select
                        value={form.pixKeyType}
                        onValueChange={(value) => updateForm("pixKeyType", value as string)}
                      >
                        <SelectTrigger id="pix-key-type" className="w-full">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="random">Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <div className="col-span-full sm:col-span-3">
                    <Field className="gap-2">
                      <FieldLabel htmlFor="pix-key-value">Chave Pix</FieldLabel>
                      <Input
                        id="pix-key-value"
                        value={form.pixKey}
                        onChange={(e) => updateForm("pixKey", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {form.pixMode === "copy_paste" && (
                <Field className="gap-2">
                  <FieldLabel htmlFor="pix-copy-paste-value">Código Pix copia e cola</FieldLabel>
                  <Textarea
                    id="pix-copy-paste-value"
                    value={form.pixCopyPaste}
                    onChange={(e) => updateForm("pixCopyPaste", e.target.value)}
                    rows={4}
                  />
                </Field>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex items-center justify-end gap-4">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Salvando..." : "Salvar configurações"}
          </Button>
        </div>
      </form>

      <Separator className="my-2" />

      <BeltRulesSection />
    </div>
  );
}

function BeltRulesSection() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const [editingBelts, setEditingBelts] = useState<Record<string, Partial<BeltRuleFields>>>({});
  const [savingBeltId, setSavingBeltId] = useState<string | null>(null);

  const beltsQuery = useBelts({ academyId: activeAcademyId, enabled: !!activeAcademyId });

  const updateBeltMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<BeltRuleFields> }) => {
      setSavingBeltId(id);
      const { error } = await api.PATCH("/belts/{id}", {
        params: { path: { id } },
        body: toUpdateBeltInput(body),
      });
      if (error) throw new Error("Não foi possível salvar regras da faixa.");
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: academyQueryKey(activeAcademyId, "belts") });
      setEditingBelts((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      toast.success("Regras salvas com sucesso.");
    },
    onSettled: () => setSavingBeltId(null),
  });

  const belts = beltsQuery.data?.belts ?? [];
  const adultBelts = belts.filter((b) => b.path === "adult");
  const childBelts = belts.filter((b) => b.path === "child");

  function getBeltValue(belt: BeltDto, field: keyof BeltRuleFields): number | null {
    const override = editingBelts[belt.id]?.[field];
    if (override !== undefined) return override;
    return belt[field] ?? null;
  }

  function updateBeltField(beltId: string, field: keyof BeltRuleFields, value: number | null) {
    setEditingBelts((current) => ({
      ...current,
      [beltId]: { ...current[beltId], [field]: value },
    }));
  }

  function saveBelt(beltId: string) {
    const changes = editingBelts[beltId];
    if (!changes) return;
    updateBeltMutation.mutate({ id: beltId, body: changes });
  }

  const ruleColumns: { key: keyof BeltRuleFields; label: string }[] = [
    { key: "maxDegrees", label: "Graus máx." },
    { key: "minMonthsForNextDegree", label: "Meses p/ grau" },
    { key: "minAttendancesForNextDegree", label: "Presenças p/ grau" },
    { key: "minMonthsForNextBelt", label: "Meses p/ faixa" },
    { key: "minAttendancesForNextBelt", label: "Presenças p/ faixa" },
  ];

  function renderBeltGroup(groupBelts: BeltDto[], groupLabel: string) {
    if (groupBelts.length === 0) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {groupLabel}
        </h4>
        <div className="space-y-6">
          {groupBelts.map((belt) => {
            const hasChanges = !!editingBelts[belt.id];
            const isSaving = savingBeltId === belt.id;
            return (
              <div
                key={belt.id}
                className="space-y-3 rounded-lg border border-border p-4"
                data-testid={`belt-rule-card-${belt.slug}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{belt.name}</span>
                  {hasChanges && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isSaving}
                      data-testid={`belt-rule-save-${belt.slug}`}
                      onClick={() => saveBelt(belt.id)}
                    >
                      {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {ruleColumns.map((col) => (
                    <NumberField
                      key={col.key}
                      value={getBeltValue(belt, col.key) ?? undefined}
                      min={0}
                      onValueChange={(val) => {
                        updateBeltField(belt.id, col.key, val ?? null);
                      }}
                      size="sm"
                    >
                      <NumberFieldScrubArea label={col.label} />
                      <NumberFieldGroup>
                        <NumberFieldDecrement />
                        <NumberFieldInput />
                        <NumberFieldIncrement />
                      </NumberFieldGroup>
                    </NumberField>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (beltsQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="text-balance font-semibold text-foreground">Regras de graduação</h2>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm text-muted-foreground">Carregando faixas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
      <div>
        <h2 className="text-balance font-semibold text-foreground">Regras de graduação</h2>
        <p className="text-pretty mt-1 text-sm leading-6 text-muted-foreground">
          Configure os requisitos mínimos para promoção de grau e faixa. Deixe em branco para não
          exigir critério.
        </p>
      </div>
      <div className="sm:max-w-3xl md:col-span-2 space-y-6">
        {renderBeltGroup(adultBelts, "Adulto")}
        {renderBeltGroup(childBelts, "Infantil")}
      </div>
    </div>
  );
}

type BeltRuleFields = {
  maxDegrees: number | null;
  minMonthsForNextDegree: number | null;
  minAttendancesForNextDegree: number | null;
  minMonthsForNextBelt: number | null;
  minAttendancesForNextBelt: number | null;
};

function toUpdateBeltInput(body: Partial<BeltRuleFields>): UpdateBeltInput {
  return {
    ...(body.maxDegrees !== undefined && body.maxDegrees !== null
      ? { maxDegrees: body.maxDegrees }
      : {}),
    ...(body.minMonthsForNextDegree !== undefined && body.minMonthsForNextDegree !== null
      ? { minMonthsForNextDegree: body.minMonthsForNextDegree }
      : {}),
    ...(body.minAttendancesForNextDegree !== undefined && body.minAttendancesForNextDegree !== null
      ? { minAttendancesForNextDegree: body.minAttendancesForNextDegree }
      : {}),
    ...(body.minMonthsForNextBelt !== undefined && body.minMonthsForNextBelt !== null
      ? { minMonthsForNextBelt: body.minMonthsForNextBelt }
      : {}),
    ...(body.minAttendancesForNextBelt !== undefined && body.minAttendancesForNextBelt !== null
      ? { minAttendancesForNextBelt: body.minAttendancesForNextBelt }
      : {}),
  };
}
