import type { Student } from "@appdosensei/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { Delete02Icon, FilterHorizontalIcon, PlusSignIcon, UserAdd01Icon } from "hugeicons-react";
import { useMemo, useState } from "react";
import { useAppShell } from "@/components/app-shell";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  MobileScreen,
  PrimaryPill,
  ScreenHeader,
  SearchField,
  SegmentedTabs,
  StatusPill,
} from "@/components/mobile/mobile-ui";
import { useBelts } from "@/hooks/use-belts";
import { useStudents } from "@/hooks/use-students";
import { academyQueryKey } from "@/lib/academy-query-keys";
import { ageLabel, billingLabel } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { BeltVisual } from "../student-portal/components/belt-visual";
import { beltKeyFromName } from "../student-portal/lib/belt-progress";
import { DeleteStudentDialog } from "./components/delete-student-dialog";
import { StudentForm } from "./components/student-form";
import { PreRegistrationsTab } from "./pre-registrations-tab";
import { useStudentDeletion } from "./use-student-deletion";

type Tab = "students" | "pre-registrations";

export function StudentsMobile() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const academyId = activeAcademy.id;

  const [tab, setTab] = useState<Tab>("students");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const studentDeletion = useStudentDeletion(academyId);

  const beltsQuery = useBelts({ academyId, enabled: !!academyId });
  const studentsQuery = useStudents(
    "all",
    { page: 0, pageSize: 100 },
    { academyId, enabled: !!academyId },
  );

  const allStudents = studentsQuery.data?.students ?? [];
  const summary = studentsQuery.data?.summary;
  const students = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allStudents;
    return allStudents.filter((s) => s.name.toLowerCase().includes(q));
  }, [allStudents, search]);

  function openCreate() {
    setEditingStudent(null);
    setIsFormOpen(true);
  }
  function openEdit(student: Student) {
    setEditingStudent(student);
    setIsFormOpen(true);
  }
  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: academyQueryKey(academyId, "students") });
  }

  return (
    <MobileScreen>
      <ScreenHeader
        title="Alunos"
        count={summary?.total}
        action={<ActionButton icon={PlusSignIcon} label="Novo" onClick={openCreate} />}
      />
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "students", label: "Alunos" },
          { value: "pre-registrations", label: "Pré-cadastros" },
        ]}
      />

      {tab === "pre-registrations" ? (
        <PreRegistrationsTab />
      ) : (
        <>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome..."
            trailing={
              <FilterHorizontalIcon className="size-5 shrink-0 text-m-ink-2" strokeWidth={1.8} />
            }
          />

          {studentsQuery.isError ? (
            <ErrorState onRetry={() => studentsQuery.refetch()} />
          ) : studentsQuery.isLoading ? (
            <StudentsSkeleton />
          ) : students.length === 0 ? (
            search.trim() ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <p className="text-[14px] font-medium text-m-ink">Nenhum resultado</p>
                <p className="max-w-[280px] text-[13px] text-m-ink-2">
                  Nenhum aluno encontrado para "{search.trim()}".
                </p>
              </div>
            ) : (
              <EmptyState
                icon={UserAdd01Icon}
                title="Nenhum aluno ainda"
                description="Cadastre o primeiro aluno ou importe uma lista existente para começar."
                action={
                  <PrimaryPill icon={PlusSignIcon} onClick={openCreate}>
                    Cadastrar
                  </PrimaryPill>
                }
              />
            )
          ) : (
            <div className="flex flex-col gap-3">
              {students.map((s) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  onEdit={() => openEdit(s)}
                  onDelete={() => studentDeletion.requestDeletion(s)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <StudentForm
        {...(editingStudent ? { student: editingStudent } : {})}
        belts={beltsQuery.data?.belts ?? []}
        open={isFormOpen}
        onSubmit={invalidate}
        onClose={() => {
          setIsFormOpen(false);
          setEditingStudent(null);
        }}
      />
      <DeleteStudentDialog
        studentName={studentDeletion.studentToDelete?.name ?? null}
        isDeleting={studentDeletion.isDeleting}
        onClose={studentDeletion.cancelDeletion}
        onConfirm={studentDeletion.confirmDeletion}
      />
    </MobileScreen>
  );
}

function StudentCard({
  student,
  onEdit,
  onDelete,
}: {
  student: Student;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isActive = student.status === "active";
  const hasBilling = student.monthlyAmountInCents !== null || student.monthlyDueDay !== null;
  return (
    <article className="rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={onEdit}
        className="flex w-full flex-col gap-2.5 p-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-m-surface text-[14px] font-medium text-m-ink-2">
            {student.name.charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[14px] font-medium text-m-ink">{student.name}</span>
            <span className="truncate text-[12px] text-m-ink-2">{ageLabel(student.birthDate)}</span>
          </div>
          {!isActive ? (
            <StatusPill tone="neutral" dot>
              Inativo
            </StatusPill>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {student.belt ? (
              <>
                <BeltVisual
                  beltKey={beltKeyFromName(student.belt.name)}
                  degrees={student.currentDegree}
                  size="swatch"
                />
                <span className="truncate text-[12px] text-m-ink-2">
                  {student.belt.name} · {student.currentDegree}º grau
                </span>
              </>
            ) : (
              <span className="text-[12px] text-m-ink-3">Sem faixa</span>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 text-right",
              hasBilling ? "text-[13px] font-medium text-m-ink" : "text-[12px] text-m-ink-3",
            )}
          >
            {hasBilling ? billingLabel(student) : "Sem mensalidade"}
          </span>
        </div>
      </button>
      <div className="border-t border-border px-3.5 py-2">
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-[12px] font-medium text-destructive"
        >
          <Delete02Icon className="size-3.5" strokeWidth={1.8} />
          Excluir cadastro
        </button>
      </div>
    </article>
  );
}

function StudentsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5">
          <div className="flex items-center gap-3">
            <div className="size-11 shrink-0 rounded-lg bg-m-surface" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-3 w-36 rounded-full bg-m-surface" />
              <div className="h-2.5 w-24 rounded-full bg-m-surface" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-32 rounded bg-m-surface" />
            <div className="h-3 w-16 rounded-full bg-m-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}
