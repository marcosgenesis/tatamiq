import type { ClassGroup } from "@tatamiq/contracts";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Button } from "../../components/ui/button";
import { DateTimeField } from "../../components/ui/date-time-field";
import {
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";

export type AdHocFormState = {
  classGroupId: string;
  scheduledStartAt: string;
  durationMinutes: string;
};

export function AdHocClassForm(props: {
  classGroups: ClassGroup[];
  error: string | null;
  form: AdHocFormState;
  isSaving: boolean;
  setForm: Dispatch<SetStateAction<AdHocFormState>>;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onUseNow: () => void;
}) {
  return (
    <form className="flex h-full flex-col" onSubmit={props.onSubmit}>
      <DrawerHeader>
        <DrawerTitle className="font-heading text-xl">Nova aula avulsa</DrawerTitle>
        <DrawerDescription>Selecione a turma, data e duração.</DrawerDescription>
      </DrawerHeader>
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-4">
        <label className="block space-y-2 text-sm font-medium">
          <span className="text-muted-foreground">Turma</span>
          <select
            value={props.form.classGroupId}
            onChange={(e) =>
              props.setForm((current) => ({ ...current, classGroupId: e.target.value }))
            }
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {props.classGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <DateTimeField
          label="Data e hora"
          value={props.form.scheduledStartAt}
          onChange={(value) =>
            props.setForm((current) => ({ ...current, scheduledStartAt: value }))
          }
        />
        <label className="block space-y-2 text-sm font-medium">
          <span className="text-muted-foreground">Duração (min)</span>
          <input
            type="number"
            min="15"
            max="300"
            value={props.form.durationMinutes}
            onChange={(e) =>
              props.setForm((current) => ({ ...current, durationMinutes: e.target.value }))
            }
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        {props.error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {props.error}
          </p>
        ) : null}
      </div>
      <DrawerFooter>
        <Button type="button" variant="secondary" onClick={props.onUseNow}>
          Usar agora
        </Button>
        <DrawerClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DrawerClose>
        <Button type="submit" size="lg" disabled={props.isSaving || props.classGroups.length === 0}>
          {props.isSaving ? "Salvando..." : "Salvar aula"}
        </Button>
      </DrawerFooter>
    </form>
  );
}
