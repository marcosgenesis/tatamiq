import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Student } from "@tatamiq/contracts";
import { AlertCircle, Info, Search, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useAppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import { useStudents } from "../../hooks/use-students";
import { monthNames } from "../../lib/formatting";
import { centsToReais, maskCurrency, reaisToCents } from "../../lib/masks";
import { createMonthlyFee, monthlyFeesKeys } from "./monthly-fees-queries";

const QUICK_DUE_DAYS = [1, 5, 10, 15, 20, 25];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function dueDateLabel(dueDay: number, month: number, year: number): string {
  const monthName = monthNames[month - 1];
  const maxDay = daysInMonth(month, year);
  if (dueDay > maxDay) return `Dia ${dueDay} inválido para ${monthName}`;
  return `Vence em ${dueDay} de ${monthName} de ${year}`;
}

function isValidDueDay(dueDay: number, month: number, year: number): boolean {
  return dueDay >= 1 && dueDay <= daysInMonth(month, year);
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const schema = z
  .object({
    studentId: z.string().min(1, "Selecione um aluno"),
    referenceMonth: z.number().int().min(1).max(12),
    referenceYear: z.number().int().min(2000).max(2100),
    amountDisplay: z.string().min(1, "Informe o valor"),
    dueDay: z.number().int().min(1).max(31, "Dia inválido"),
  })
  .superRefine((data, ctx) => {
    const cents = reaisToCents(data.amountDisplay);
    if (!cents || cents <= 0) {
      ctx.addIssue({ code: "custom", path: ["amountDisplay"], message: "Valor deve ser positivo" });
    }
    if (!isValidDueDay(data.dueDay, data.referenceMonth, data.referenceYear)) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDay"],
        message: `Dia inválido para o mês selecionado`,
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function CreateMonthlyFeeDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const [studentSearch, setStudentSearch] = useState("");
  const [autoFillNote, setAutoFillNote] = useState<string | null>(null);

  const studentsQuery = useStudents("active", undefined, {
    academyId: activeAcademy.id,
    enabled: open && !!activeAcademy.id,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: "",
      referenceMonth: currentMonth,
      referenceYear: currentYear,
      amountDisplay: "",
      dueDay: 10,
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const cents = reaisToCents(values.amountDisplay)!;
      return createMonthlyFee({
        studentId: values.studentId,
        referenceYear: values.referenceYear,
        referenceMonth: values.referenceMonth,
        amountInCents: cents,
        dueDay: values.dueDay,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: monthlyFeesKeys.all(activeAcademy.id) });
      handleClose();
    },
  });

  function handleClose() {
    reset();
    setStudentSearch("");
    setAutoFillNote(null);
    createMutation.reset();
    onClose();
  }

  function selectStudent(student: Student) {
    setValue("studentId", student.id, { shouldValidate: true });
    setStudentSearch("");
    if (student.monthlyAmountInCents && student.monthlyDueDay) {
      setValue("amountDisplay", centsToReais(student.monthlyAmountInCents));
      setValue("dueDay", student.monthlyDueDay);
      setAutoFillNote(
        `Valor e vencimento preenchidos a partir do plano de ${student.name}. Você pode ajustar.`,
      );
    } else {
      setAutoFillNote(null);
    }
  }

  const allStudents = studentsQuery.data?.students ?? [];
  const selectedStudentId = watch("studentId");
  const selectedStudent = allStudents.find((s) => s.id === selectedStudentId);
  const referenceMonth = watch("referenceMonth");
  const referenceYear = watch("referenceYear");
  const dueDay = watch("dueDay");
  const amountDisplay = watch("amountDisplay");

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return allStudents;
    const q = studentSearch.toLowerCase();
    return allStudents.filter((s) => s.name.toLowerCase().includes(q));
  }, [allStudents, studentSearch]);

  const showSelector = !selectedStudentId;

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const cents = reaisToCents(amountDisplay);
  const resumoReady =
    selectedStudent &&
    cents &&
    cents > 0 &&
    dueDay >= 1 &&
    isValidDueDay(dueDay, referenceMonth, referenceYear);

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={(o: boolean) => {
        if (!o) handleClose();
      }}
    >
      <DrawerContent>
        <form
          className="flex h-full flex-col"
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          noValidate
        >
          <DrawerHeader>
            <DrawerTitle>Nova mensalidade</DrawerTitle>
            <DrawerDescription>Preencha os dados da cobrança.</DrawerDescription>
          </DrawerHeader>

          <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-4 pb-2">
            {/* Aluno selector */}
            <section>
              <p className="mb-2 text-sm font-medium text-foreground">
                Aluno <span className="text-destructive">*</span>
              </p>

              {selectedStudent ? (
                <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedStudent.name}
                    </p>
                    {selectedStudent.belt && (
                      <p className="text-xs text-muted-foreground">
                        Faixa {selectedStudent.belt.name}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setValue("studentId", "");
                      setAutoFillNote(null);
                    }}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Trocar aluno"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="rounded-[14px] border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Buscar aluno..."
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {studentsQuery.isLoading ? (
                      <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                        Carregando...
                      </p>
                    ) : filteredStudents.length === 0 ? (
                      <div className="px-3 py-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          {studentSearch
                            ? `Nenhum aluno com "${studentSearch}"`
                            : "Nenhum aluno ativo"}
                        </p>
                      </div>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => selectStudent(s)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm text-foreground">{s.name}</p>
                            {s.belt && (
                              <p className="text-xs text-muted-foreground">Faixa {s.belt.name}</p>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              {errors.studentId && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3 shrink-0" />
                  {errors.studentId.message}
                </p>
              )}
              {autoFillNote && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Info className="size-3 shrink-0" />
                  {autoFillNote}
                </p>
              )}
            </section>

            {/* Competência */}
            <section>
              <p className="mb-2 text-sm font-medium text-foreground">Competência</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Controller
                    name="referenceMonth"
                    control={control}
                    render={({ field }) => (
                      <select
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="h-11 w-full rounded-[14px] border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        {monthNames.map((name, i) => (
                          <option key={name} value={i + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
                <div>
                  <Controller
                    name="referenceYear"
                    control={control}
                    render={({ field }) => (
                      <select
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="h-11 w-full rounded-[14px] border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      >
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              </div>
            </section>

            {/* Valor */}
            <section>
              <p className="mb-2 text-sm font-medium text-foreground">
                Valor <span className="text-destructive">*</span>
              </p>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Controller
                  name="amountDisplay"
                  control={control}
                  render={({ field }) => (
                    <input
                      value={field.value}
                      onChange={(e) => field.onChange(maskCurrency(e.target.value))}
                      inputMode="numeric"
                      placeholder="0,00"
                      aria-invalid={!!errors.amountDisplay}
                      className="h-11 w-full rounded-[14px] border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-destructive"
                    />
                  )}
                />
              </div>
              {errors.amountDisplay && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3 shrink-0" />
                  {errors.amountDisplay.message}
                </p>
              )}
            </section>

            {/* Dia de vencimento */}
            <section>
              <p className="mb-2 text-sm font-medium text-foreground">
                Dia de vencimento <span className="text-destructive">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_DUE_DAYS.map((d) => (
                  <Controller
                    key={d}
                    name="dueDay"
                    control={control}
                    render={({ field }) => (
                      <button
                        type="button"
                        onClick={() => field.onChange(d)}
                        className={`h-9 min-w-[3rem] rounded-[10px] border px-3 text-sm font-medium transition ${
                          field.value === d
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/50"
                        }`}
                      >
                        {d}
                      </button>
                    )}
                  />
                ))}
                <Controller
                  name="dueDay"
                  control={control}
                  render={({ field }) => {
                    const isCustom = !QUICK_DUE_DAYS.includes(field.value);
                    return (
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={isCustom ? field.value : ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        placeholder="Outro"
                        className="h-9 w-20 rounded-[10px] border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    );
                  }}
                />
              </div>
              {dueDay >= 1 && referenceMonth && referenceYear ? (
                <p
                  className={`mt-1.5 text-xs ${
                    isValidDueDay(dueDay, referenceMonth, referenceYear)
                      ? "text-muted-foreground"
                      : "text-destructive"
                  }`}
                >
                  {dueDateLabel(dueDay, referenceMonth, referenceYear)}
                </p>
              ) : null}
              {errors.dueDay && (
                <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3 shrink-0" />
                  {errors.dueDay.message}
                </p>
              )}
            </section>

            {/* Resumo */}
            {resumoReady && (
              <section className="rounded-[14px] border border-border bg-card p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resumo da cobrança
                </p>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Aluno</dt>
                    <dd className="font-medium text-foreground truncate max-w-[60%] text-right">
                      {selectedStudent!.name}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Competência</dt>
                    <dd className="font-medium text-foreground">
                      {monthNames[referenceMonth - 1]} {referenceYear}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Vencimento</dt>
                    <dd className="font-medium text-foreground">
                      Dia {dueDay} de {monthNames[referenceMonth - 1]}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Valor</dt>
                    <dd className="font-semibold text-foreground">R$ {amountDisplay}</dd>
                  </div>
                </dl>
              </section>
            )}

            {createMutation.isError && (
              <div className="rounded-[14px] border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Erro ao criar mensalidade."}
              </div>
            )}
          </div>

          <DrawerFooter>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar mensalidade"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
