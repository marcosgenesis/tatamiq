import { useNavigate } from "@tanstack/react-router";
import { ArrowDown01Icon, Logout01Icon, Notification01Icon, UserCircleIcon } from "hugeicons-react";
import { useAppShell } from "@/components/app-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/utils";

export function MobileAppHeader() {
  const navigate = useNavigate();
  const { activeAcademy, academies, onSwitchAcademy, user, onSignOut } = useAppShell();

  return (
    <header className="flex items-center justify-between gap-2 bg-m-bg px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5">
      {/* Academy switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex min-w-0 items-center gap-2.5 outline-none">
          {activeAcademy.logo ? (
            <img
              src={activeAcademy.logo}
              alt={activeAcademy.name}
              className="size-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-m-surface text-[13px] font-medium text-m-ink-2">
              {initials(activeAcademy.name)}
            </span>
          )}
          <span className="flex min-w-0 flex-col text-left">
            <span className="flex items-center gap-1">
              <span className="truncate text-[16px] font-medium text-m-ink">
                {activeAcademy.name}
              </span>
              <ArrowDown01Icon className="size-4 shrink-0 text-m-ink-3" strokeWidth={1.8} />
            </span>
            <span className="text-[12px] text-m-ink-3">Instrutor</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Academias</DropdownMenuLabel>
          {academies.map((academy) => (
            <DropdownMenuItem
              key={academy.id}
              onClick={() => onSwitchAcademy(academy.id)}
              className={cn("gap-2", academy.id === activeAcademy.id && "font-medium")}
            >
              {academy.logo ? (
                <img src={academy.logo} alt="" className="size-6 rounded-full object-cover" />
              ) : (
                <span className="grid size-6 place-items-center rounded-full bg-muted text-[10px] font-medium">
                  {initials(academy.name)}
                </span>
              )}
              <span className="truncate">{academy.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Notificações"
          className="grid size-11 place-items-center rounded-lg border border-border bg-card"
        >
          <Notification01Icon className="size-[18px] text-m-ink" strokeWidth={1.8} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            {user.image ? (
              <img src={user.image} alt={user.name} className="size-11 rounded-lg object-cover" />
            ) : (
              <span className="grid size-11 place-items-center rounded-lg bg-m-surface text-[13px] font-medium text-m-ink">
                {initials(user.name)}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })} className="gap-2">
              <UserCircleIcon className="size-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSignOut}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Logout01Icon className="size-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
