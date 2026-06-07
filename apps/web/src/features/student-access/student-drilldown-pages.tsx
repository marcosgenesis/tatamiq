import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type React from "react";
import { Button } from "../../components/ui/button";
import { StudentGraduationScreen } from "../student-portal/screens/student-graduation-screen";
import { StudentAttendanceSection } from "../student-portal/student-attendance-section";

export function StudentAttendancePage() {
  return (
    <StudentDrilldownLayout title="Presenças">
      <StudentAttendanceSection />
    </StudentDrilldownLayout>
  );
}

export function StudentGraduationPage() {
  return (
    <main className="mx-auto min-h-screen max-w-screen-sm bg-background text-foreground">
      <StudentGraduationScreen />
    </main>
  );
}

function StudentDrilldownLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigate({ to: "/student" })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-3xl p-4 md:p-6">{children}</div>
    </main>
  );
}
