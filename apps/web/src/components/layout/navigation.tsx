import {
  BeltIcon,
  Calendar03Icon,
  CheckmarkSquare03Icon,
  DashboardSquare02Icon,
  GraduationScrollIcon,
  Money03Icon,
  Settings02Icon,
  UserMultipleIcon,
} from "hugeicons-react";
import type { ComponentType } from "react";

export type NavigationItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

export const instructorNavigation: NavigationItem[] = [
  { label: "Painel", path: "/", icon: DashboardSquare02Icon },
  { label: "Alunos", path: "/students", icon: UserMultipleIcon },
  { label: "Turmas", path: "/class-groups", icon: BeltIcon },
  { label: "Agenda", path: "/schedule", icon: Calendar03Icon },
  { label: "Presenças", path: "/attendances", icon: CheckmarkSquare03Icon },
  { label: "Graduação", path: "/graduation", icon: GraduationScrollIcon },
  { label: "Mensalidades", path: "/monthly-fees", icon: Money03Icon },
  { label: "Configurações", path: "/settings", icon: Settings02Icon },
];
