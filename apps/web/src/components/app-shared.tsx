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

export type SidebarNavItem = {
  title: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  isActive?: boolean;
  subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
  label?: string;
  items: SidebarNavItem[];
};

export const navGroups: SidebarNavGroup[] = [
  {
    label: "Operação",
    items: [
      { title: "Painel", path: "/", icon: DashboardSquare02Icon },
      { title: "Alunos", path: "/students", icon: UserMultipleIcon },
      { title: "Turmas", path: "/class-groups", icon: BeltIcon },
      { title: "Agenda", path: "/schedule", icon: Calendar03Icon },
    ],
  },
  {
    label: "Registros",
    items: [
      { title: "Presenças", path: "/attendances", icon: CheckmarkSquare03Icon },
      { title: "Graduação", path: "/graduation", icon: GraduationScrollIcon },
      { title: "Mensalidades", path: "/monthly-fees", icon: Money03Icon },
    ],
  },
];

export const footerNavLinks: SidebarNavItem[] = [
  { title: "Configurações", path: "/settings", icon: Settings02Icon },
];

export const navLinks: SidebarNavItem[] = [
  ...navGroups.flatMap((group) =>
    group.items.flatMap((item) => (item.subItems?.length ? [item, ...item.subItems] : [item])),
  ),
  ...footerNavLinks,
];
