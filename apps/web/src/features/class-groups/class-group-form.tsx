import { zodResolver } from "@hookform/resolvers/zod";
import type { ClassGroup } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import {
  Calendar03Icon,
  Delete02Icon,
  MinusSignIcon,
  PlusSignIcon,
  Search01Icon,
} from "hugeicons-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../components/ui/field";
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
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da turma.")
    .max(120, "O nome pode ter no máximo 120 caracteres."),
  defaultDurationMinutes: z
    .string()
    .trim()
    .min(1, "Informe a duração padrão.")
    .refine((value) => /^\d+$/.test(value), "Informe a duração em minutos.")
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

type StudentOption = { id: string; name: string; belt: { name: string; slug: string } | null };

export function ClassGroupForm(props: {
  editingClassGroup: ClassGroup | null;
  error: string | null;
  isSaving: boolean;
  students: StudentOption[];
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

  const scheduleError =
    form.formState.errors.schedules?.root?.message ?? form.formState.errors.schedules?.message;

  const scheduleCount = schedules.fields.length;
  const watchedStudentIds = form.watch("studentIds");
  const studentCount = watchedStudentIds?.length ?? 0;

  return (
    <form id={formId} className="flex h-full flex-col" onSubmit={form.handleSubmit(submitForm)}>
      <DrawerHeader className="gap-1 border-b border-border">
        <DrawerTitle className="text-xl">
          {props.editingClassGroup ? "Editar turma" : "Nova turma"}
        </DrawerTitle>
        <DrawerDescription>
          {props.editingClassGroup
            ? "Atualize os dados da turma. Arquivamento e reativação ficam nas ações da listagem."
            : "Defina o nome, os horários da semana e quem treina nessa turma."}
        </DrawerDescription>
      </DrawerHeader>

      <div className="no-scrollbar flex-1 space-y-7 overflow-y-auto px-5 py-5">
        <div className="space-y-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${formId}-name`}>Nome da turma</FieldLabel>
                <Input
                  {...field}
                  id={`${formId}-name`}
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                  className="h-10"
                  placeholder="No Gi · 19h"
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
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor={`${formId}-duration`}>Duração padrão</FieldLabel>
                  <FieldDescription className="m-0">15 a 300 minutos</FieldDescription>
                </div>
                <div>
                  <DurationStepper
                    id={`${formId}-duration`}
                    value={field.value}
                    invalid={fieldState.invalid}
                    onChange={field.onChange}
                  />
                </div>
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
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-foreground">Horários semanais</h3>
              <p className="text-xs text-muted-foreground">Informe pelo menos um dia e horário.</p>
            </div>
            <Badge variant="muted" size="sm">
              {scheduleCount} {scheduleCount === 1 ? "horário" : "horários"}
            </Badge>
          </div>

          <div className="space-y-2">
            {schedules.fields.map((schedule, index) => (
              <fieldset
                key={schedule.id}
                aria-label={`Horário ${index + 1}`}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/40 p-2"
              >
                <Controller
                  name={`schedules.${index}.weekday`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="min-w-0 flex-1">
                      <WeekdaySelect
                        id={`${formId}-schedule-${index}-weekday`}
                        value={field.value}
                        ariaInvalid={fieldState.invalid}
                        onChange={field.onChange}
                      />
                    </div>
                  )}
                />
                <Controller
                  name={`schedules.${index}.startTime`}
                  control={form.control}
                  render={({ field }) => (
                    <ScheduleTimeField
                      id={`${formId}-schedule-${index}-time`}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover horário"
                  title="Remover horário"
                  className="size-10 shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  disabled={schedules.fields.length === 1}
                  onClick={() => schedules.remove(index)}
                >
                  <Delete02Icon className="size-4" aria-hidden />
                </Button>
              </fieldset>
            ))}
          </div>

          <button
            type="button"
            onClick={() => schedules.append({ weekday: "1", startTime: "19:00" })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-input py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <PlusSignIcon className="size-4" /> Adicionar horário
          </button>

          {scheduleError ? <FieldError>{scheduleError}</FieldError> : null}
        </section>

        <Controller
          name="studentIds"
          control={form.control}
          render={({ field }) => (
            <StudentPicker
              formId={formId}
              students={props.students}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        {props.error ? <FieldError>{props.error}</FieldError> : null}
      </div>

      <DrawerFooter className="border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar03Icon className="size-4 shrink-0" />
            <span className="truncate">
              {scheduleCount} {scheduleCount === 1 ? "horário" : "horários"} · {studentCount}{" "}
              {studentCount === 1 ? "aluno" : "alunos"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DrawerClose asChild>
              <Button type="button" variant="secondary" onClick={props.onCancel}>
                Cancelar
              </Button>
            </DrawerClose>
            <Button type="submit" form={formId} disabled={props.isSaving}>
              {props.isSaving ? "Salvando..." : "Salvar turma"}
            </Button>
          </div>
        </div>
      </DrawerFooter>
    </form>
  );
}

function DurationStepper(props: {
  id: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const numeric = Number(props.value);
  const safe = Number.isFinite(numeric) ? numeric : 0;
  const clamp = (next: number) => String(Math.min(300, Math.max(15, next)));

  return (
    <div
      data-invalid={props.invalid}
      className="inline-flex h-10 w-fit items-center self-start overflow-hidden rounded-lg border border-input bg-background data-[invalid=true]:border-destructive"
    >
      <button
        type="button"
        aria-label="Diminuir duração"
        disabled={safe <= 15}
        onClick={() => props.onChange(clamp(safe - 5))}
        className="grid h-full w-10 place-items-center text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <MinusSignIcon className="size-4" />
      </button>
      <div className="flex h-full items-center gap-1 border-x border-input px-2">
        <Input
          id={props.id}
          value={props.value}
          inputMode="numeric"
          aria-label="Duração em minutos"
          onChange={(event) => props.onChange(event.target.value.replace(/\D/g, ""))}
          className="h-full w-10 rounded-none border-0 bg-transparent p-0 text-center text-sm font-semibold tabular-nums focus-visible:ring-0"
        />
        <span className="pr-1 text-xs text-muted-foreground">min</span>
      </div>
      <button
        type="button"
        aria-label="Aumentar duração"
        disabled={safe >= 300}
        onClick={() => props.onChange(clamp(safe + 5))}
        className="grid h-full w-10 place-items-center text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <PlusSignIcon className="size-4" />
      </button>
    </div>
  );
}

function StudentPicker(props: {
  formId: string;
  students: StudentOption[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(props.value);
  const total = props.students.length;
  const allSelected = total > 0 && props.value.length === total;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return props.students;
    return props.students.filter((student) => student.name.toLowerCase().includes(term));
  }, [props.students, query]);

  function toggle(id: string) {
    props.onChange(
      props.value.includes(id) ? props.value.filter((x) => x !== id) : [...props.value, id],
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">Alunos vinculados</h3>
          <p className="text-xs text-muted-foreground">Opcional. Você pode vincular depois.</p>
        </div>
        <Badge variant={props.value.length > 0 ? "primary" : "muted"} size="sm">
          {props.value.length} de {total}
        </Badge>
      </div>

      {total === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Cadastre alunos ativos antes de vinculá-los.
        </p>
      ) : (
        <>
          <div className="relative">
            <Search01Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar aluno"
              aria-label="Buscar aluno"
              className="h-10 pl-8"
            />
          </div>

          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="text-xs text-muted-foreground">
              {props.value.length} {props.value.length === 1 ? "selecionado" : "selecionados"}
            </span>
            <button
              type="button"
              onClick={() => props.onChange(allSelected ? [] : props.students.map((s) => s.id))}
              className="text-xs font-medium text-foreground transition-colors hover:text-primary"
            >
              {allSelected ? "Limpar seleção" : "Selecionar todos"}
            </button>
          </div>

          <div className="max-h-[224px] divide-y divide-border overflow-y-auto rounded-xl border border-border">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhum aluno encontrado.
              </p>
            ) : (
              filtered.map((student) => {
                const isSelected = selected.has(student.id);
                return (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => toggle(student.id)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                      isSelected ? "bg-muted/50" : ""
                    }`}
                  >
                    <Checkbox checked={isSelected} tabIndex={-1} className="pointer-events-none" />
                    <Avatar size="sm">
                      <AvatarFallback className="text-[10px]">
                        {initials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm text-foreground">{student.name}</span>
                    {student.belt ? (
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                          style={{ backgroundColor: beltColor(student.belt.slug) }}
                        />
                        {student.belt.name}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ScheduleTimeField(props: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="w-[126px] shrink-0">
      <TimeField
        id={props.id}
        value={props.value}
        onChange={props.onChange}
        className="h-10 rounded-lg"
      />
    </div>
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
        aria-label="Dia da semana"
        aria-invalid={ariaInvalid}
        className="h-10 w-full rounded-lg border-input bg-background px-3 text-foreground focus-visible:border-primary focus-visible:ring-primary/20"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <SelectValue placeholder="Dia">{weekdays[Number(value)] ?? "Dia"}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="rounded-xl">
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
  );
}

function beltColor(slug: string): string {
  const value = slug.toLowerCase();
  if (value.includes("black")) return "#171717";
  if (value.includes("brown")) return "#92400e";
  if (value.includes("purple")) return "#7c3aed";
  if (value.includes("blue")) return "#2563eb";
  if (value.includes("green")) return "#16a34a";
  if (value.includes("orange")) return "#ea580c";
  if (value.includes("yellow")) return "#eab308";
  if (value.includes("gray") || value.includes("grey")) return "#9ca3af";
  if (value.includes("white")) return "#e5e5e5";
  return "#9ca3af";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const value = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return value.toUpperCase() || "?";
}
