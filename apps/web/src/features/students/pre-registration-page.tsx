import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { BeltDto } from "@tatamiq/contracts";
import { CheckCircle, Info, ShieldAlert } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import {
  brToIsoDate,
  isMinorBirthDate,
  isValidBrDate,
  isValidCpf,
  maskCpf,
  maskDate,
  maskPhone,
  unmaskCpf,
  unmaskPhone,
} from "../../lib/masks";
import { cn } from "../../lib/utils";
import { BeltVisual } from "../student-portal/components/belt-visual";
import { beltKeyFromName } from "../student-portal/lib/belt-progress";

function maxDegreeForBelt(belt: BeltDto | undefined): number {
  return belt?.slug.includes("black") ? 9 : 4;
}

function degreeLabel(value: number, isBlack: boolean) {
  if (value === 0) return "Sem grau";
  return isBlack ? `${value}º dan` : `${value} grau(s)`;
}

const schema = z
  .object({
    name: z.string().trim().min(2, "Nome obrigatório"),
    birthDate: z
      .string()
      .min(1, "Data obrigatória")
      .refine((v) => isValidBrDate(v), "Data inválida"),
    cpf: z
      .string()
      .optional()
      .refine((v) => !v || isValidCpf(v), "CPF inválido"),
    phone: z.string().min(1, "Telefone obrigatório"),
    email: z.string().email("E-mail inválido"),
    guardianName: z.string().optional(),
    guardianPhone: z.string().optional(),
    note: z.string().optional(),
    declaredBeltId: z.string().optional(),
    declaredDegree: z.number().int().min(0).max(9).optional(),
    consentAccepted: z.boolean().refine((v) => v === true, "Aceite o consentimento para continuar"),
  })
  .superRefine((data, ctx) => {
    const isMinor = isValidBrDate(data.birthDate) && isMinorBirthDate(data.birthDate);
    if (isMinor) {
      if (!data.guardianName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["guardianName"],
          message: "Nome do responsável obrigatório",
        });
      }
      if (!data.guardianPhone?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["guardianPhone"],
          message: "Telefone do responsável obrigatório",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

const inputClass =
  "h-11 w-full rounded-[14px] border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20";

export function preRegistrationErrorMessage(error: unknown) {
  return typeof error === "object" && error !== null && "message" in error
    ? String((error as { message: string }).message)
    : "Não foi possível enviar sua solicitação.";
}

export function PreRegistrationPage({ token }: { token: string }) {
  const profileQuery = useQuery({
    queryKey: ["pre-register", token],
    queryFn: async () => {
      const { data, error } = await api.GET("/pre-register/{token}", {
        params: { path: { token } },
      });
      if (error) throw new Error("Link de pré-cadastro indisponível.");
      return data;
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      birthDate: "",
      cpf: "",
      phone: "",
      email: "",
      guardianName: "",
      guardianPhone: "",
      note: "",
      declaredBeltId: "",
      declaredDegree: 0,
      consentAccepted: false,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await api.POST("/pre-register/{token}/requests", {
        params: { path: { token } },
        body: {
          name: values.name.trim(),
          birthDate: brToIsoDate(values.birthDate),
          phone: unmaskPhone(values.phone),
          email: values.email.trim(),
          cpf: values.cpf ? unmaskCpf(values.cpf) : "",
          guardianName: values.guardianName ?? "",
          guardianPhone: values.guardianPhone ? unmaskPhone(values.guardianPhone) : "",
          note: values.note ?? "",
          declaredBeltId: values.declaredBeltId || "",
          declaredDegree: values.declaredDegree ?? 0,
          consentAccepted: true,
        },
      });
      if (error) throw new Error(preRegistrationErrorMessage(error));
    },
  });

  if (profileQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-muted-foreground">
        Carregando...
      </main>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-destructive">
        Link de pré-cadastro indisponível.
      </main>
    );
  }

  const { academy, link, belts } = profileQuery.data;
  const isPaused = link.status === "paused";

  if (isPaused) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <div className="mx-auto w-full max-w-sm space-y-6 text-center">
          <AcademyAvatar academy={academy} />
          <div className="rounded-[14px] border border-border bg-card p-6 text-sm text-muted-foreground">
            Este link de pré-cadastro está pausado. Fale com a academia para mais informações.
          </div>
        </div>
      </main>
    );
  }

  if (submitMutation.isSuccess) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <div className="mx-auto w-full max-w-sm space-y-6 text-center">
          <AcademyAvatar academy={academy} />
          <div className="rounded-[14px] border border-border bg-card p-6">
            <CheckCircle className="mx-auto mb-3 size-10 text-primary" />
            <h2 className="font-semibold text-foreground">Solicitação enviada!</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sua solicitação foi recebida. A academia vai confirmar uma aula experimental em breve.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;
  const birthDate = watch("birthDate");
  const declaredBeltId = watch("declaredBeltId");
  const declaredDegree = watch("declaredDegree") ?? 0;

  const isMinor = isValidBrDate(birthDate) && isMinorBirthDate(birthDate);
  const adultBelts = belts.filter((b) => b.path === "adult");
  const childBelts = belts.filter((b) => b.path === "child");
  const selectedBelt = belts.find((b) => b.id === declaredBeltId);
  const maxDegree = maxDegreeForBelt(selectedBelt);
  const isBlack = selectedBelt?.slug.includes("black") ?? false;
  const degreeOptions = Array.from({ length: maxDegree + 1 }, (_, i) => i);

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <AcademyAvatar academy={academy} />
          <div>
            <h1 className="text-xl font-semibold text-foreground">{academy.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pré-cadastro · A recepção vai confirmar uma aula experimental gratuita
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit((values: FormValues) => submitMutation.mutate(values))}
          className="space-y-5"
          noValidate
        >
          <Section title="Dados pessoais">
            <FormField label="Nome completo" required error={errors.name?.message}>
              <input
                {...register("name")}
                placeholder="Seu nome"
                aria-invalid={!!errors.name}
                className={inputClass}
              />
            </FormField>

            <FormField label="Data de nascimento" required error={errors.birthDate?.message}>
              <Controller
                name="birthDate"
                control={control}
                render={({ field }) => (
                  <input
                    value={field.value}
                    onChange={(e) => field.onChange(maskDate(e.target.value))}
                    placeholder="DD/MM/AAAA"
                    inputMode="numeric"
                    aria-invalid={!!errors.birthDate}
                    className={inputClass}
                  />
                )}
              />
            </FormField>

            <FormField label="CPF" error={errors.cpf?.message}>
              <Controller
                name="cpf"
                control={control}
                render={({ field }) => (
                  <input
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(maskCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    aria-invalid={!!errors.cpf}
                    className={inputClass}
                  />
                )}
              />
            </FormField>
          </Section>

          <Section title="Contato">
            <FormField
              label="Telefone / WhatsApp"
              required
              error={errors.phone?.message}
              hint="Usado para confirmar a aula experimental"
            >
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <input
                    value={field.value}
                    onChange={(e) => field.onChange(maskPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    inputMode="tel"
                    aria-invalid={!!errors.phone}
                    className={inputClass}
                  />
                )}
              />
            </FormField>

            <FormField label="E-mail" required error={errors.email?.message}>
              <input
                {...register("email")}
                type="email"
                placeholder="seu@email.com"
                inputMode="email"
                aria-invalid={!!errors.email}
                className={inputClass}
              />
            </FormField>
          </Section>

          {isMinor && (
            <Section
              title="Responsável"
              description="Como o praticante é menor de idade, os dados do responsável são obrigatórios."
            >
              <FormField label="Nome do responsável" required error={errors.guardianName?.message}>
                <input
                  {...register("guardianName")}
                  placeholder="Nome completo"
                  aria-invalid={!!errors.guardianName}
                  className={inputClass}
                />
              </FormField>

              <FormField
                label="Telefone do responsável"
                required
                error={errors.guardianPhone?.message}
              >
                <Controller
                  name="guardianPhone"
                  control={control}
                  render={({ field }) => (
                    <input
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      inputMode="tel"
                      aria-invalid={!!errors.guardianPhone}
                      className={inputClass}
                    />
                  )}
                />
              </FormField>
            </Section>
          )}

          {belts.length > 0 && (
            <Section
              title="Graduação atual"
              description="Opcional — nos ajuda a preparar melhor seu primeiro treino."
            >
              <FormField label="Faixa" error={errors.declaredBeltId?.message}>
                <Controller
                  name="declaredBeltId"
                  control={control}
                  render={({ field }) => (
                    <select
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className={cn(inputClass, "cursor-pointer")}
                    >
                      <option value="">Selecione a faixa (opcional)</option>
                      {adultBelts.length > 0 && (
                        <optgroup label="Adulto">
                          {adultBelts.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {childBelts.length > 0 && (
                        <optgroup label="Infanto-juvenil">
                          {childBelts.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  )}
                />
              </FormField>

              {selectedBelt && (
                <FormField label="Grau" error={errors.declaredDegree?.message}>
                  <Controller
                    name="declaredDegree"
                    control={control}
                    render={({ field }) => (
                      <select
                        value={String(field.value ?? 0)}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className={cn(inputClass, "cursor-pointer")}
                      >
                        {degreeOptions.map((d) => (
                          <option key={d} value={d}>
                            {degreeLabel(d, isBlack)}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </FormField>
              )}

              {selectedBelt && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">Pré-visualização</span>
                  <BeltVisual
                    beltKey={beltKeyFromName(selectedBelt.name)}
                    degrees={declaredDegree}
                    size="hero"
                  />
                </div>
              )}
            </Section>
          )}

          <Section title="Observação">
            <textarea
              {...register("note")}
              placeholder="Algo que a academia deva saber? (opcional)"
              rows={3}
              className="w-full rounded-[14px] border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </Section>

          <div className="rounded-[14px] border border-border bg-card p-4">
            {/* biome-ignore lint/a11y/noLabelWithoutControl: wraps Controller-rendered checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <Controller
                name="consentAccepted"
                control={control}
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                )}
              />
              <span className="text-sm text-muted-foreground">
                Autorizo a academia a analisar estes dados para decidir sobre meu cadastro. Os dados
                serão usados exclusivamente para este fim (LGPD).
              </span>
            </label>
            {errors.consentAccepted && (
              <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <ShieldAlert className="size-3 shrink-0" />
                {errors.consentAccepted.message}
              </p>
            )}
          </div>

          {submitMutation.isError && (
            <div className="rounded-[14px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {preRegistrationErrorMessage(submitMutation.error)}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitMutation.isPending}
            className="h-12 w-full rounded-[14px] text-base font-semibold"
          >
            {submitMutation.isPending ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </form>
      </div>
    </main>
  );
}

function AcademyAvatar({ academy }: { academy: { name: string; logo: string | null } }) {
  if (academy.logo) {
    return (
      <img
        src={academy.logo}
        alt={academy.name}
        className="mx-auto size-16 rounded-2xl object-cover"
      />
    );
  }
  return (
    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary font-serif text-2xl font-bold text-primary-foreground">
      {academy.name.charAt(0).toUpperCase()}
    </div>
  );
}

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | undefined;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: label wraps Controller-rendered inputs
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="size-3 shrink-0" />
          {hint}
        </span>
      )}
      {error && (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <ShieldAlert className="size-3 shrink-0" />
          {error}
        </span>
      )}
    </label>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-border bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
