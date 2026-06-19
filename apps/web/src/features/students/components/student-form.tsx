import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { BeltDto, Student } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DatePickerInput } from "@/components/ui/input-date-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "../../../components/ui/field";
import { Input } from "../../../components/ui/input";
import {
  brToIsoDate,
  isFutureBrDate,
  isMinorBirthDate,
  isoToBrDate,
  isValidBrDate,
  maskCurrency,
  maskPhone,
} from "../../../lib/masks";
import { BeltVisual } from "../../student-portal/components/belt-visual";
import { beltKeyFromName } from "../../student-portal/lib/belt-progress";

type StudentPayload = components["schemas"]["UpdateStudentDto"];

const maxMonthlyAmountInCents = 100_000_000;

const emailField = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Informe um email válido.",
  );

const studentFormSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome do aluno."),
    birthDate: z
      .string()
      .trim()
      .min(1, "Informe a data de nascimento.")
      .refine(isValidBrDate, "Use uma data válida no formato dd/mm/aaaa.")
      .refine((value) => !isFutureBrDate(value), "Data de nascimento não pode ser futura."),
    enrollmentDate: z
      .string()
      .trim()
      .min(1, "Informe a data de matrícula.")
      .refine(isValidBrDate, "Use uma data válida no formato dd/mm/aaaa.")
      .refine((value) => !isFutureBrDate(value), "Data de matrícula não pode ser futura."),
    phone: z.string(),
    email: emailField,
    monthlyAmount: z.string().refine((value) => {
      if (!value) return true;
      const cents = Number(value);
      return Number.isSafeInteger(cents) && cents <= maxMonthlyAmountInCents;
    }, "Valor mensal deve ser menor ou igual a R$ 1.000.000,00."),
    monthlyDueDay: z.string(),
    currentBeltId: z.string().min(1, "Selecione a faixa."),
    currentDegree: z.string().min(1, "Selecione o grau."),
    status: z.enum(["active", "inactive"]),
    guardianName: z.string(),
    guardianPhone: z.string(),
    guardianEmail: emailField,
    guardianRelationship: z.string(),
  })
  .superRefine((values, ctx) => {
    if (!isMinorBirthDate(values.birthDate)) return;

    if (!values.guardianName.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["guardianName"],
        message: "Informe o nome do responsável.",
      });
    }

    if (!values.guardianPhone.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["guardianPhone"],
        message: "Informe o telefone do responsável.",
      });
    }
  });

type StudentFormValues = z.infer<typeof studentFormSchema>;

function createEmptyFormValues(): StudentFormValues {
  return {
    name: "",
    birthDate: "",
    enrollmentDate: new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
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
}

function studentToFormValues(student?: Student): StudentFormValues {
  if (!student) return createEmptyFormValues();

  return {
    name: student.name,
    birthDate: isoToBrDate(student.birthDate),
    enrollmentDate: isoToBrDate(student.enrollmentDate),
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
  };
}

function maxDegreeForBelt(belt: BeltDto | undefined): number {
  return belt?.slug.includes("black") ? 9 : 4;
}

export function validateKnownBeltSelection(
  currentBeltId: string,
  belts: Pick<BeltDto, "id">[],
): string | null {
  if (!currentBeltId) return "Selecione a faixa.";
  if (!belts.some((belt) => belt.id === currentBeltId)) {
    return "Selecione uma faixa da Academia ativa.";
  }
  return null;
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function toStudentPayload(values: StudentFormValues, isEditing: boolean): StudentPayload {
  const guardian =
    values.guardianName.trim() || values.guardianPhone.trim()
      ? {
          name: values.guardianName,
          phone: values.guardianPhone,
          email: values.guardianEmail,
          relationship: values.guardianRelationship,
        }
      : null;

  const payload: StudentPayload = {
    name: values.name.trim(),
    birthDate: brToIsoDate(values.birthDate),
    enrollmentDate: brToIsoDate(values.enrollmentDate),
    phone: values.phone,
    email: values.email,
    monthlyAmountInCents: values.monthlyAmount ? Number(values.monthlyAmount) : null,
    monthlyDueDay: values.monthlyDueDay ? Number(values.monthlyDueDay) : null,
    currentBeltId: values.currentBeltId,
    currentDegree: Number(values.currentDegree),
    guardian,
  };

  if (isEditing) payload.status = values.status;
  return payload;
}

const DUE_DAYS = ["1", "5", "10", "15", "30"];

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {title}
    </p>
  );
}

export function StudentForm(props: {
  student?: Student;
  belts: BeltDto[];
  open: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const formId = useId();
  const submitInFlightRef = useRef(false);

  const adultBelts = props.belts.filter((b) => b.path === "adult");
  const childBelts = props.belts.filter((b) => b.path === "child");

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: studentToFormValues(props.student),
  });

  const {
    control,
    watch,
    setValue,
    setError,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = form;

  const currentBeltId = watch("currentBeltId");
  const currentDegree = watch("currentDegree");
  const birthDate = watch("birthDate");
  const monthlyDueDay = watch("monthlyDueDay");
  const isMinor = isMinorBirthDate(birthDate);
  const selectedBelt = props.belts.find((b) => b.id === currentBeltId);
  const isBlackBelt = selectedBelt?.slug.includes("black") ?? false;
  const maxDegree = maxDegreeForBelt(selectedBelt);
  const degreeOptions = Array.from({ length: maxDegree + 1 }, (_, value) => value);

  const hasErrors = Object.keys(errors).length > 0;

  function degreeLabel(value: number) {
    if (value === 0) return "Sem grau";
    return isBlackBelt ? `${value}º dan` : `${value} grau(s)`;
  }

  function handleBeltChange(beltId: string) {
    const belt = props.belts.find((b) => b.id === beltId);
    setValue("currentBeltId", beltId, { shouldValidate: true, shouldDirty: true });
    if (Number(form.getValues("currentDegree")) > maxDegreeForBelt(belt)) {
      setValue("currentDegree", "0", { shouldDirty: true });
    }
  }

  useEffect(() => {
    if (!props.open) return;
    const values = studentToFormValues(props.student);
    form.reset(values);
    submitInFlightRef.current = false;
  }, [props.open, props.student, form]);

  useEffect(() => {
    if (!props.open || !currentBeltId || props.belts.length === 0) return;
    if (validateKnownBeltSelection(currentBeltId, props.belts)) {
      setValue("currentBeltId", "", { shouldValidate: true, shouldDirty: true });
      setValue("currentDegree", "0", { shouldDirty: true });
    }
  }, [props.open, props.belts, currentBeltId, setValue]);

  const saveMutation = useMutation({
    mutationFn: async (input: StudentPayload) => {
      if (props.student) {
        const { data, error } = await api.PATCH("/students/{id}", {
          params: { path: { id: props.student.id } },
          body: input,
        });
        if (error) throw new Error(apiErrorMessage(error, "Não foi possível salvar o aluno."));
        return data;
      }
      const { data, error } = await api.POST("/students", { body: input });
      if (error) throw new Error(apiErrorMessage(error, "Não foi possível criar o aluno."));
      return data;
    },
    onSuccess: (data) => {
      props.onSubmit();
      props.onClose();
      const name = data && "name" in data ? (data as { name: string }).name : undefined;
      toast.success(props.student ? "Aluno atualizado" : "Aluno cadastrado", {
        description: name ? `${name} foi adicionado com sucesso.` : undefined,
      });
    },
    onError: (mutationError) => {
      submitInFlightRef.current = false;
      toast.error(mutationError instanceof Error ? mutationError.message : "Erro ao salvar aluno.");
    },
    onSettled: () => {
      submitInFlightRef.current = false;
    },
  });

  function submitForm(values: StudentFormValues) {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;

    const beltSelectionError = validateKnownBeltSelection(values.currentBeltId, props.belts);
    if (beltSelectionError) {
      setError("currentBeltId", { type: "validate", message: beltSelectionError });
      submitInFlightRef.current = false;
      return;
    }

    saveMutation.mutate(toStudentPayload(values, Boolean(props.student)));
  }

  return (
    <Drawer direction="right" open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
        <form id={formId} className="flex h-full flex-col" onSubmit={handleSubmit(submitForm)}>
          <DrawerHeader>
            <DrawerTitle>{props.student ? "Editar aluno" : "Novo aluno"}</DrawerTitle>
            <DrawerDescription>
              {props.student
                ? "Atualize os dados do aluno."
                : "Preencha os dados para cadastrar um novo aluno."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-4 pb-2">
            {/* Top error alert */}
            {isSubmitted && hasErrors && (
              <div className="flex items-center gap-2 rounded-[14px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                Revise os campos destacados antes de salvar.
              </div>
            )}

            {/* Dados pessoais */}
            <section>
              <SectionHeader title="Dados pessoais" />
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-2" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-name`}>
                        Nome <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`${formId}-name`}
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                        className="h-11 rounded-2xl px-3"
                      />
                      {fieldState.invalid ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : fieldState.isDirty && !fieldState.invalid && isSubmitted ? (
                        <p className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle2 className="size-3 shrink-0" /> Válido
                        </p>
                      ) : null}
                    </Field>
                  )}
                />

                <Controller
                  name="birthDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-birth`}>
                        Nascimento <span className="text-destructive">*</span>
                      </FieldLabel>
                      <DatePickerInput value={field.value} onChange={field.onChange} />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="enrollmentDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-enrollment`}>Data de entrada</FieldLabel>
                      <DatePickerInput value={field.value} onChange={field.onChange} />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
              </FieldGroup>
            </section>

            {/* Contato */}
            <section>
              <SectionHeader title="Contato" />
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Controller
                  name="phone"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-phone`}>Telefone</FieldLabel>
                      <Input
                        id={`${formId}-phone`}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={maskPhone(field.value)}
                        onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))}
                        aria-invalid={fieldState.invalid}
                        placeholder="(00) 00000-0000"
                        className="h-11 rounded-2xl px-3"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
                      <Input
                        {...field}
                        id={`${formId}-email`}
                        type="email"
                        aria-invalid={fieldState.invalid}
                        className="h-11 rounded-2xl px-3"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
              </FieldGroup>
            </section>

            {/* Responsável (conditional: minor) */}
            {isMinor && (
              <section className="rounded-[14px] border border-border bg-muted/20 p-4">
                <SectionHeader title="Responsável" />
                <p className="mb-4 text-xs text-muted-foreground">
                  Obrigatório para aluno menor de idade.
                </p>
                <FieldGroup className="grid grid-cols-2 gap-4">
                  <Controller
                    name="guardianName"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field className="col-span-2" data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`${formId}-guardian-name`}>
                          Nome do responsável <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          {...field}
                          id={`${formId}-guardian-name`}
                          aria-invalid={fieldState.invalid}
                          className="h-11 rounded-2xl px-3"
                        />
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                      </Field>
                    )}
                  />

                  <Controller
                    name="guardianPhone"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`${formId}-guardian-phone`}>
                          Telefone <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id={`${formId}-guardian-phone`}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={maskPhone(field.value)}
                          onChange={(event) =>
                            field.onChange(event.target.value.replace(/\D/g, ""))
                          }
                          aria-invalid={fieldState.invalid}
                          placeholder="(00) 00000-0000"
                          className="h-11 rounded-2xl px-3"
                        />
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                      </Field>
                    )}
                  />

                  <Controller
                    name="guardianEmail"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`${formId}-guardian-email`}>Email</FieldLabel>
                        <Input
                          {...field}
                          id={`${formId}-guardian-email`}
                          type="email"
                          aria-invalid={fieldState.invalid}
                          className="h-11 rounded-2xl px-3"
                        />
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                      </Field>
                    )}
                  />

                  <Controller
                    name="guardianRelationship"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={`${formId}-guardian-relationship`}>
                          Parentesco
                        </FieldLabel>
                        <Input
                          {...field}
                          id={`${formId}-guardian-relationship`}
                          aria-invalid={fieldState.invalid}
                          className="h-11 rounded-2xl px-3"
                        />
                        {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                      </Field>
                    )}
                  />
                </FieldGroup>
              </section>
            )}

            {/* Mensalidade */}
            <section>
              <SectionHeader title="Mensalidade" />
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Controller
                  name="monthlyAmount"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-amount`}>Valor mensal</FieldLabel>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          R$
                        </span>
                        <Input
                          id={`${formId}-amount`}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          inputMode="numeric"
                          placeholder="0,00"
                          value={maskCurrency(field.value)}
                          onChange={(event) =>
                            field.onChange(event.target.value.replace(/\D/g, ""))
                          }
                          aria-invalid={fieldState.invalid}
                          className="h-11 rounded-2xl pl-9 pr-3"
                        />
                      </div>
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Field>
                  <FieldLabel>Dia de vencimento</FieldLabel>
                  <div className="flex flex-nowrap">
                    {DUE_DAYS.map((day, index) => {
                      const selected = monthlyDueDay === day;
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setValue("monthlyDueDay", selected ? "" : day)}
                          className={`h-11 flex-1 border text-sm font-medium transition ${
                            index === 0 ? "rounded-l-2xl" : ""
                          } ${index === DUE_DAYS.length - 1 ? "rounded-r-2xl" : "border-r-0"} ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:border-primary/50"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </FieldGroup>
            </section>

            {/* Graduação */}
            <section>
              <SectionHeader title="Graduação" />
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Controller
                  name="currentBeltId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-belt`}>
                        Faixa <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        modal={false}
                        value={field.value}
                        onValueChange={(nextValue) => {
                          if (nextValue) handleBeltChange(nextValue);
                        }}
                      >
                        <SelectTrigger
                          id={`${formId}-belt`}
                          aria-invalid={fieldState.invalid}
                          className="h-11 w-full rounded-2xl border-border bg-background px-3 text-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                        >
                          <SelectValue placeholder="Selecione a faixa">
                            {selectedBelt && (
                              <span className="flex items-center gap-2">
                                <BeltVisual
                                  beltKey={beltKeyFromName(selectedBelt.name)}
                                  degrees={0}
                                  size="swatch"
                                />
                                {selectedBelt.name}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start" className="rounded-xl">
                          <SelectGroup>
                            <SelectLabel>Adulto</SelectLabel>
                            {adultBelts.map((belt) => (
                              <SelectItem key={belt.id} value={belt.id}>
                                <span className="flex items-center gap-2">
                                  <BeltVisual
                                    beltKey={beltKeyFromName(belt.name)}
                                    degrees={0}
                                    size="swatch"
                                  />
                                  {belt.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel>Infantil</SelectLabel>
                            {childBelts.map((belt) => (
                              <SelectItem key={belt.id} value={belt.id}>
                                <span className="flex items-center gap-2">
                                  <BeltVisual
                                    beltKey={beltKeyFromName(belt.name)}
                                    degrees={0}
                                    size="swatch"
                                  />
                                  {belt.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="currentDegree"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-degree`}>
                        Grau <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        modal={false}
                        value={field.value}
                        onValueChange={(nextValue) => {
                          if (nextValue) field.onChange(nextValue);
                        }}
                      >
                        <SelectTrigger
                          id={`${formId}-degree`}
                          aria-invalid={fieldState.invalid}
                          className="h-11 w-full rounded-2xl border-border bg-background px-3 text-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                        >
                          <SelectValue placeholder="Selecione o grau">
                            {degreeLabel(Number(currentDegree))}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start" className="rounded-xl">
                          {degreeOptions.map((value) => (
                            <SelectItem key={value} value={String(value)}>
                              {degreeLabel(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                {selectedBelt && (
                  <div className="col-span-2 flex items-center gap-3 rounded-[14px] border border-border bg-card p-3">
                    <BeltVisual
                      beltKey={beltKeyFromName(selectedBelt.name)}
                      degrees={Number(currentDegree)}
                      size="inline"
                    />
                    <div className="text-sm text-muted-foreground">
                      {selectedBelt.name}
                      {Number(currentDegree) > 0 && ` · ${degreeLabel(Number(currentDegree))}`}
                    </div>
                  </div>
                )}
              </FieldGroup>
            </section>

            {/* Status (edit only) */}
            {props.student && (
              <section>
                <SectionHeader title="Status" />
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <Select
                        modal={false}
                        value={field.value}
                        onValueChange={(nextValue) => {
                          if (nextValue) field.onChange(nextValue);
                        }}
                      >
                        <SelectTrigger
                          id={`${formId}-status`}
                          className="h-11 w-full rounded-2xl border-border bg-background px-3 text-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                        >
                          <SelectValue>
                            {field.value === "active" ? "Ativo" : "Inativo"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent align="start" className="rounded-xl">
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </section>
            )}
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DrawerClose>
            <Button type="submit" form={formId} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar aluno"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
