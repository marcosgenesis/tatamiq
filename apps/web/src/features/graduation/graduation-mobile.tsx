import { Award01Icon, GraduationScrollIcon, Tick02Icon } from "hugeicons-react";
import {
  EmptyState,
  FilterChips,
  MobileScreen,
  ScreenHeader,
  StatusPill,
  type StatusTone,
} from "@/components/mobile/mobile-ui";
import { cn } from "@/lib/utils";
import { BeltVisual } from "../student-portal/components/belt-visual";
import { beltKeyFromName } from "../student-portal/lib/belt-progress";
import type { EligibilityType, EligibleStudent, GraduationSummary } from "./graduation-types";

type TypeFilter = "all" | EligibilityType;

const typeLabels: Record<EligibilityType, string> = {
  degree: "Grau",
  belt: "Faixa",
  transition: "Transição",
};

const typeTone: Record<EligibilityType, StatusTone> = {
  degree: "primary",
  belt: "warning",
  transition: "neutral",
};

function nextLabel(s: EligibleStudent): string {
  if (s.eligibilityType === "degree") return `${s.currentBeltName} · ${s.currentDegree + 1}º grau`;
  if (s.eligibilityType === "belt") return "Próxima faixa";
  return "Transição";
}

export function GraduationMobileBody(props: {
  students: EligibleStudent[];
  summary: GraduationSummary | undefined;
  typeFilter: TypeFilter;
  setTypeFilter: (value: TypeFilter) => void;
  isLoading: boolean;
  onPromote: (student: EligibleStudent) => void;
  onDismiss: (student: EligibleStudent) => void;
}) {
  const s = props.summary;
  const total = (s?.degree ?? 0) + (s?.belt ?? 0) + (s?.transition ?? 0);

  return (
    <MobileScreen>
      <ScreenHeader
        title="Graduação"
        subtitle={`${props.students.length} ${
          props.students.length === 1 ? "aluno elegível" : "alunos elegíveis"
        } para promoção.`}
      />

      <FilterChips
        value={props.typeFilter}
        onChange={props.setTypeFilter}
        chips={[
          { value: "all", label: "Todos", count: total },
          { value: "degree", label: "Grau", count: s?.degree ?? 0 },
          { value: "belt", label: "Faixa", count: s?.belt ?? 0 },
          { value: "transition", label: "Transição", count: s?.transition ?? 0 },
        ]}
      />

      {props.isLoading ? (
        <p className="px-1 py-8 text-center text-[13px] text-m-ink-3">Carregando...</p>
      ) : props.students.length === 0 ? (
        <EmptyState
          icon={GraduationScrollIcon}
          tone="primary"
          title="Ninguém elegível agora"
          description="Todos os alunos estão em dia com a graduação. Volte quando alguém cumprir os requisitos."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {props.students.map((student) => (
            <EligibleCard
              key={student.id}
              student={student}
              onPromote={() => props.onPromote(student)}
              onDismiss={() => props.onDismiss(student)}
            />
          ))}
        </div>
      )}
    </MobileScreen>
  );
}

function EligibleCard({
  student,
  onPromote,
  onDismiss,
}: {
  student: EligibleStudent;
  onPromote: () => void;
  onDismiss: () => void;
}) {
  const monthsMet = student.monthsSinceReference >= student.requiredMonths;
  const attMet = student.attendancesSinceReference >= student.requiredAttendances;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-m-surface text-[14px] font-medium text-m-ink-2">
          {student.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-m-ink">
          {student.name}
        </span>
        <StatusPill tone={typeTone[student.eligibilityType]}>
          {typeLabels[student.eligibilityType]}
        </StatusPill>
      </div>

      {/* Belt transition */}
      <div className="flex items-center justify-center gap-3 rounded-xl bg-m-bg p-3">
        <div className="flex flex-col items-center gap-1.5">
          <BeltVisual
            beltKey={beltKeyFromName(student.currentBeltName)}
            degrees={student.currentDegree}
            size="swatch"
          />
          <span className="text-[12px] text-m-ink-2">
            {student.currentBeltName} · {student.currentDegree}º
          </span>
        </div>
        <span className="text-primary">→</span>
        <div className="flex flex-col items-center gap-1.5">
          <BeltVisual
            beltKey={beltKeyFromName(student.currentBeltName)}
            degrees={student.eligibilityType === "degree" ? student.currentDegree + 1 : 0}
            size="swatch"
          />
          <span className="text-[12px] font-medium text-m-ink">{nextLabel(student)}</span>
        </div>
      </div>

      {/* Requirements */}
      <div className="flex items-center gap-4">
        {[
          {
            met: monthsMet,
            label: `${student.monthsSinceReference}/${student.requiredMonths} meses`,
          },
          {
            met: attMet,
            label: `${student.attendancesSinceReference}/${student.requiredAttendances} aulas`,
          },
        ].map((r) => (
          <span key={r.label} className="flex items-center gap-1.5 text-[12px] text-m-ink-2">
            <Tick02Icon
              className={cn("size-3.5", r.met ? "text-emerald-600" : "text-m-ink-3")}
              strokeWidth={2}
            />
            {r.label}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onPromote}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-[14px] font-medium text-primary-foreground"
        >
          <Award01Icon className="size-5" strokeWidth={1.8} /> Promover
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="h-10 rounded-full border border-border bg-card px-5 text-[14px] font-medium text-m-ink"
        >
          Adiar
        </button>
      </div>
    </div>
  );
}
