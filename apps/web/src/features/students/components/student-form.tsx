import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import type { BeltDto, Student } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { useEffect, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { cn } from "@/lib/utils";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../../../components/ui/field";
import { Input } from "../../../components/ui/input";
import { maskCurrency, maskPhone } from "../../../lib/masks";

type StudentPayload = components["schemas"]["UpdateStudentDto"];

// A API espera datas em ISO (aaaa-mm-dd); o input trabalha em dd/mm/aaaa.
function isValidBrDate(value: string): boolean {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function brToIsoDate(value: string): string {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function isoToBrDate(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

const emailField = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    "Informe um email válido.",
  );

const studentFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do aluno."),
  birthDate: z
    .string()
    .trim()
    .min(1, "Informe a data de nascimento.")
    .refine(isValidBrDate, "Use uma data válida no formato dd/mm/aaaa."),
  enrollmentDate: z
    .string()
    .trim()
    .min(1, "Informe a data de matrícula.")
    .refine(isValidBrDate, "Use uma data válida no formato dd/mm/aaaa."),
  phone: z.string(),
  email: emailField,
  monthlyAmount: z.string(),
  monthlyDueDay: z.string(),
  currentBeltId: z.string().min(1, "Selecione a faixa."),
  currentDegree: z.string().min(1, "Selecione o grau."),
  status: z.enum(["active", "inactive"]),
  guardianName: z.string(),
  guardianPhone: z.string(),
  guardianEmail: emailField,
  guardianRelationship: z.string(),
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

export function StudentForm(props: {
  student?: Student;
  belts: BeltDto[];
  open: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const [beltOpen, setBeltOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);

  const adultBelts = props.belts.filter((b) => b.path === "adult");
  const childBelts = props.belts.filter((b) => b.path === "child");

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: studentToFormValues(props.student),
  });

  const currentBeltId = form.watch("currentBeltId");
  const currentDegree = form.watch("currentDegree");
  const selectedBelt = props.belts.find((b) => b.id === currentBeltId);
  const isBlackBelt = selectedBelt?.slug.includes("black") ?? false;
  const maxDegree = maxDegreeForBelt(selectedBelt);
  const degreeOptions = Array.from({ length: maxDegree + 1 }, (_, value) => value);

  function degreeLabel(value: number) {
    if (value === 0) return "Sem grau";
    return isBlackBelt ? `${value}º dan` : `${value} grau(s)`;
  }

  function handleBeltChange(beltId: string) {
    const belt = props.belts.find((b) => b.id === beltId);
    form.setValue("currentBeltId", beltId, { shouldValidate: true, shouldDirty: true });
    // troca de faixa nao pode deixar grau acima do maximo da nova faixa
    if (Number(form.getValues("currentDegree")) > maxDegreeForBelt(belt)) {
      form.setValue("currentDegree", "0", { shouldDirty: true });
    }
    setBeltOpen(false);
  }

  useEffect(() => {
    if (!props.open) return;
    form.reset(studentToFormValues(props.student));
    setError(null);
  }, [props.open, props.student, form]);

  const saveMutation = useMutation({
    mutationFn: async (input: StudentPayload) => {
      if (props.student) {
        const { data, error } = await api.PATCH("/students/{id}", {
          params: { path: { id: props.student.id } },
          body: input,
        });
        if (error) throw new Error("Não foi possível salvar o aluno.");
        return data;
      }

      const { data, error } = await api.POST("/students", { body: input });
      if (error) throw new Error("Não foi possível criar o aluno.");
      return data;
    },
    onSuccess: () => {
      props.onSubmit();
      props.onClose();
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Erro ao salvar aluno.");
    },
  });

  function submitForm(values: StudentFormValues) {
    setError(null);
    saveMutation.mutate(toStudentPayload(values, Boolean(props.student)));
  }

  return (
    <Drawer direction="right" open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-2xl">
        <form id={formId} className="flex h-full flex-col" onSubmit={form.handleSubmit(submitForm)}>
          <DrawerHeader>
            <DrawerTitle>{props.student ? "Editar aluno" : "Novo aluno"}</DrawerTitle>
            <DrawerDescription>
              {props.student
                ? "Atualize os dados do aluno."
                : "Preencha os dados para cadastrar um novo aluno."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-4">
            <FieldGroup className="grid grid-cols-2 gap-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field className="col-span-2" data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-name`}>Nome</FieldLabel>
                    <Input
                      {...field}
                      id={`${formId}-name`}
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                      className="h-11 rounded-2xl px-3"
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name="birthDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-birth`}>Nascimento</FieldLabel>
                    <DatePickerInput value={field.value} onChange={field.onChange} />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name="enrollmentDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-enrollment`}>Matrícula</FieldLabel>
                    <DatePickerInput value={field.value} onChange={field.onChange} />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name="phone"
                control={form.control}
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
                control={form.control}
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

              <Controller
                name="monthlyAmount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-amount`}>Valor mensal (R$)</FieldLabel>
                    <Input
                      id={`${formId}-amount`}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      inputMode="numeric"
                      placeholder="0,00"
                      value={maskCurrency(field.value)}
                      onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))}
                      aria-invalid={fieldState.invalid}
                      className="h-11 rounded-2xl px-3"
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name="monthlyDueDay"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor={`${formId}-due-day`}>Dia de vencimento</FieldLabel>
                    <div className="flex flex-nowrap">
                      {DUE_DAYS.map((day, index) => {
                        const selected = field.value === day;
                        return (
                          <Button
                            key={day}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            size="lg"
                            aria-pressed={selected}
                            className={cn(
                              "rounded-none border-r-0",
                              index === 0 && "rounded-l-xl",
                              index === DUE_DAYS.length - 1 && "rounded-r-xl border-r",
                            )}
                            onClick={() => field.onChange(selected ? "" : day)}
                          >
                            {day.padStart(2, "0")}
                          </Button>
                        );
                      })}
                    </div>
                  </Field>
                )}
              />

              <Controller
                name="currentBeltId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-belt`}>Faixa</FieldLabel>
                    <Select
                      modal={false}
                      open={beltOpen}
                      value={field.value}
                      onOpenChange={setBeltOpen}
                      onValueChange={(nextValue) => {
                        if (nextValue) handleBeltChange(nextValue);
                      }}
                    >
                      <SelectTrigger
                        id={`${formId}-belt`}
                        aria-invalid={fieldState.invalid}
                        className="h-11 w-full rounded-2xl border-border bg-background px-3 text-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setBeltOpen((current) => !current);
                        }}
                      >
                        <SelectValue placeholder="Selecione a faixa">
                          {selectedBelt?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start" className="rounded-xl">
                        <SelectGroup>
                          <SelectLabel>Adulto</SelectLabel>
                          {adultBelts.map((belt) => (
                            <SelectItem
                              key={belt.id}
                              value={belt.id}
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleBeltChange(belt.id);
                              }}
                            >
                              {belt.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Infantil</SelectLabel>
                          {childBelts.map((belt) => (
                            <SelectItem
                              key={belt.id}
                              value={belt.id}
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleBeltChange(belt.id);
                              }}
                            >
                              {belt.name}
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
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${formId}-degree`}>Grau</FieldLabel>
                    <Select
                      modal={false}
                      open={gradeOpen}
                      value={field.value}
                      onOpenChange={setGradeOpen}
                      onValueChange={(nextValue) => {
                        if (nextValue) field.onChange(nextValue);
                      }}
                    >
                      <SelectTrigger
                        id={`${formId}-degree`}
                        aria-invalid={fieldState.invalid}
                        className="h-11 w-full rounded-2xl border-border bg-background px-3 text-foreground focus-visible:border-primary focus-visible:ring-primary/20"
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setGradeOpen((current) => !current);
                        }}
                      >
                        <SelectValue placeholder="Selecione o grau">
                          {degreeLabel(Number(currentDegree))}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent align="start" className="rounded-xl">
                        {degreeOptions.map((value) => (
                          <SelectItem
                            key={value}
                            value={String(value)}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              field.onChange(String(value));
                              setGradeOpen(false);
                            }}
                          >
                            {degreeLabel(value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              {props.student ? (
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-status`}>Status</FieldLabel>
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
              ) : null}
            </FieldGroup>

            <FieldSet className="rounded-3xl border border-border bg-muted/30 p-4">
              <FieldLegend>Responsável</FieldLegend>
              <FieldDescription>Obrigatório para aluno menor de idade.</FieldDescription>
              <FieldGroup className="mt-4 grid grid-cols-2 gap-4">
                <Controller
                  name="guardianName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field className="col-span-2" data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-guardian-name`}>
                        Nome do responsável
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
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-guardian-phone`}>
                        Telefone do responsável
                      </FieldLabel>
                      <Input
                        id={`${formId}-guardian-phone`}
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
                  name="guardianEmail"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-guardian-email`}>
                        Email do responsável
                      </FieldLabel>
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
                  control={form.control}
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
            </FieldSet>

            {error ? <FieldError>{error}</FieldError> : null}
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
