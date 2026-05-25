import { Tick01Icon, UnfoldMoreIcon } from "hugeicons-react";
import { useAppShell } from "@/components/app-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function AcademySwitcher() {
  const { activeAcademy, academies, onSwitchAcademy } = useAppShell();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        <AcademyAvatar name={activeAcademy.name} className="size-6 shrink-0 text-[10px]" />
        <span className="hidden truncate sm:inline">{activeAcademy.name}</span>
        <UnfoldMoreIcon className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Academias</DropdownMenuLabel>
        </DropdownMenuGroup>
        <div className="-mx-1 my-1 h-px bg-border" />
        <DropdownMenuGroup>
          {academies.map((academy) => (
            <DropdownMenuItem
              key={academy.id}
              className="flex items-center justify-between gap-2"
              onClick={() => onSwitchAcademy(academy.id)}
            >
              <div className="flex items-center gap-3">
                <AcademyAvatar name={academy.name} className="size-8 text-xs" />
                <span className="truncate">{academy.name}</span>
              </div>
              {academy.id === activeAcademy.id && (
                <Tick01Icon className="size-4 shrink-0 text-foreground" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
  "bg-sky-500",
];

export function AcademyAvatar({ name, className }: { name: string; className?: string }) {
  let hash = 0;
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold text-white",
        color,
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
