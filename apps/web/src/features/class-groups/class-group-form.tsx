import { zodResolver } from "@hookform/resolvers/zod";
import type { ClassGroup } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { Delete02Icon } from "hugeicons-react";
import { useEffect, useId, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { TagInput } from "../../components/ui/tag-input";
import { TimeField } from "../../components/ui/time-field";

export type ClassGroupPayload = components["schemas"]["UpdateClassGroupDto"];

type ScheduleFormRow = { weekday: string; startTime: string };
export type ClassGroupFormValues = {
  name: string;
  defaultDurationMinutes: string;
  schedules: ScheduleFormRow[];
  tags: string[];
  studentIds: string[];
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const classGroupFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da turma."),
  defaultDurationMinutes: z
    .string()
    .trim()
    .min(1, "Informe a duração padrão.")
    .refine((value) => Number.isInteger(Number(value)), "Informe a duração em minutos.")
    .refine((value) => Number(value) >= 15, "A duração mínima é 15 minutos.")
    .refine((value) => Number(value) <= 300, "A duração máxima é 300 minutos."),
  schedules: z
    .array(
      z.object({
        weekday: z.string().regex(/^[0-6]$/, "Escolha um dia válido."),
        startTime: z.string().regex(timePattern, "Informe um horário válido no formato HH:mm."),
      }),
    )
    .min(1, "Informe pelo menos um horário semanal.")
    .superRefine((schedules, context) => {
      const seen = new Set<string>();
      for (const schedule of schedules) {
        const key = `${schedule.weekday}-${schedule.startTime}`;
        if (seen.has(key)) {
          context.addIssue({
            code: "custom",
            message: "Remova horários duplicados.",
          });
          return;
        }
        seen.add(key);
      }
    }),
  tags: z.array(z.string()),
  studentIds: z.array(z.string()),
});

export function createEmptyClassGroupFormValues(): ClassGroupFormValues {
  return {
    name: "",
    defaultDurationMinutes: "60",
    schedules: [{ weekday: "1", startTime: "19:00" }],
    tags: [],
    studentIds: [],
  };
}

export function classGroupToFormValues(classGroup: ClassGroup | null): ClassGroupFormValues {
  if (!classGroup) return createEmptyClassGroupFormValues();

  return {
    name: classGroup.name,
    defaultDurationMinutes: String(classGroup.defaultDurationMinutes),
    schedules: classGroup.schedules.map((schedule) => ({
      weekday: String(schedule.weekday),
      startTime: schedule.startTime,
    })),
    tags: classGroup.tags,
    studentIds: classGroup.students.map((student) => student.id),
  };
}

export function normalizeClassGroupTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const normalizedTags: string[] = [];

  for (const tag of tags) {
    const normalized = tag.trim().replace(/\s+/g, " ");
    const key = normalized.toLocaleLowerCase("pt-BR");
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    normalizedTags.push(normalized);
  }

  return normalizedTags;
}

export function toClassGroupPayload(values: ClassGroupFormValues): ClassGroupPayload {
  return {
    name: values.name.trim(),
    defaultDurationMinutes: Number(values.defaultDurationMinutes),
    schedules: values.schedules.map((schedule) => ({
      weekday: Number(schedule.weekday),
      startTime: schedule.startTime,
    })),
    tags: normalizeClassGroupTags(values.tags),
    studentIds: values.studentIds,
  };
}

export function ClassGroupForm(props: {
  editingClassGroup: ClassGroup | null;
  error: string | null;
  isSaving: boolean;
  students: Array<{ id: string; name: string }>;
  tagSuggestions: string[];
  onCancel: () => void;
  onSubmit: (payload: ClassGroupPayload) => void;
}) {
  const formId = useId();
  const form = useForm<ClassGroupFormValues>({
    resolver: zodResolver(classGroupFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: classGroupToFormValues(props.editingClassGroup),
  });
  const schedules = useFieldArray({ control: form.control, name: "schedules" });

  useEffect(() => {
    form.reset(classGroupToFormValues(props.editingClassGroup));
  }, [props.editingClassGroup, form]);

  function submitForm(values: ClassGroupFormValues) {
    props.onSubmit(toClassGroupPayload(values));
  }

  const scheduleError = form.formState.errors.schedules?.message;

  return (
    <form id={formId} className="flex h-full flex-col" onSubmit={form.handleSubmit(submitForm)}>
      <DrawerHeader>
        <DrawerTitle>{props.editingClassGroup ? "Editar turma" : "Nova turma"}</DrawerTitle>
        <DrawerDescription>
          {props.editingClassGroup
            ? "Atualize os dados da turma. Arquivamento e reativação ficam nas ações da listagem."
            : "Preencha os dados para criar uma nova turma."}
        </DrawerDescription>
      </DrawerHeader>

      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-4">
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${formId}-name`}>Nome</FieldLabel>
                <Input
                  {...field}
                  id={`${formId}-name`}
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  className="h-11 rounded-2xl px-3"
                  placeholder="No Gi 19h"
                />
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />

          <Controller
            name="defaultDurationMinutes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${formId}-duration`}>Duração padrão (min)</FieldLabel>
                <Input
                  {...field}
                  id={`${formId}-duration`}
                  type="number"
                  inputMode="numeric"
                  min={15}
                  max={300}
                  step={1}
                  aria-invalid={fieldState.invalid}
                  className="h-11 rounded-2xl px-3"
                />
                <FieldDescription>Entre 15 e 300 minutos.</FieldDescription>
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />

          <Controller
            name="tags"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <TagInput
                  id={`${formId}-tags`}
                  label="Etiquetas"
                  placeholder="No Gi, Iniciante"
                  value={field.value}
                  suggestions={props.tagSuggestions}
                  onChange={field.onChange}
                />
                <FieldDescription>
                  Use etiquetas livres como infantil, adulto ou competição.
                </FieldDescription>
                {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
              </Field>
            )}
          />
        </FieldGroup>

        <FieldSet className="rounded-3xl border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <FieldLegend>Horários semanais</FieldLegend>
              <FieldDescription>Informe pelo menos um dia e horário.</FieldDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => schedules.append({ weekday: "1", startTime: "19:00" })}
            >
              Adicionar horário
            </Button>
          </div>

          <FieldGroup className="gap-3">
            {schedules.fields.map((schedule, index) => (
              <div
                key={schedule.id}
                className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_2.75rem] items-start gap-2"
              >
                <Controller
                  name={`schedules.${index}.weekday`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <WeekdaySelect
                        id={`${formId}-schedule-${index}-weekday`}
                        value={field.value}
                        ariaInvalid={fieldState.invalid}
                        onChange={field.onChange}
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
                <Controller
                  name={`schedules.${index}.startTime`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <TimeField
                        id={`${formId}-schedule-${index}-time`}
                        label="Horário"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Remover horário"
                  title="Remover horário"
                  className="mt-7 size-11 rounded-2xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => schedules.remove(index)}
                >
                  <Delete02Icon className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </FieldGroup>
          {scheduleError ? <FieldError>{scheduleError}</FieldError> : null}
        </FieldSet>

        <Controller
          name="studentIds"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet className="rounded-3xl border border-border bg-muted/30 p-4">
              <FieldLegend>Alunos vinculados</FieldLegend>
              <FieldGroup data-slot="checkbox-group" className="mt-2">
                {props.students.map((student) => (
                  <Field
                    key={student.id}
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                  >
                    <Checkbox
                      id={`${formId}-student-${student.id}`}
                      name={field.name}
                      aria-invalid={fieldState.invalid}
                      checked={field.value.includes(student.id)}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked
                            ? [...field.value, student.id]
                            : field.value.filter((id) => id !== student.id),
                        );
                      }}
                    />
                    <FieldLabel htmlFor={`${formId}-student-${student.id}`} className="font-normal">
                      {student.name}
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
              {props.students.length === 0 ? (
                <FieldDescription>Cadastre alunos ativos antes de vinculá-los.</FieldDescription>
              ) : null}
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </FieldSet>
          )}
        />

        {props.error ? <FieldError>{props.error}</FieldError> : null}
      </div>

      <DrawerFooter>
        <DrawerClose asChild>
          <Button type="button" variant="secondary" onClick={props.onCancel}>
            Cancelar
          </Button>
        </DrawerClose>
        <Button type="submit" form={formId} disabled={props.isSaving}>
          {props.isSaving ? "Salvando..." : "Salvar turma"}
        </Button>
      </DrawerFooter>
    </form>
  );
}

function WeekdaySelect({
  id,
  value,
  ariaInvalid,
  onChange,
}: {
  id: string;
  value: string;
  ariaInvalid: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0 space-y-2 text-sm font-medium">
      <FieldLabel htmlFor={id}>Dia</FieldLabel>
      <Select
        modal={false}
        open={open}
        value={value}
        onOpenChange={setOpen}
        onValueChange={(nextValue) => {
          if (nextValue) onChange(nextValue);
        }}
      >
        <SelectTrigger
          id={id}
          aria-invalid={ariaInvalid}
          className="h-11 w-full rounded-2xl border-border bg-background px-3 text-foreground focus-visible:border-primary focus-visible:ring-primary/20"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((current) => !current);
          }}
        >
          <SelectValue placeholder="Dia">{weekdays[Number(value)] ?? "Dia"}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="rounded-2xl">
          {weekdays.map((weekday, weekdayIndex) => {
            const weekdayValue = String(weekdayIndex);
            return (
              <SelectItem
                key={weekday}
                value={weekdayValue}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange(weekdayValue);
                  setOpen(false);
                }}
              >
                {weekday}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
