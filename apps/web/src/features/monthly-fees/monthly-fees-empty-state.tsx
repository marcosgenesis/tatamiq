import { Money03Icon } from "hugeicons-react";
import { Button } from "../../components/ui/button";

export function MonthlyFeesEmptyState(props: { onCreate: () => void }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-border p-10 text-center">
      <div className="grid size-14 place-items-center rounded-3xl bg-muted text-primary">
        <Money03Icon className="size-7" />
      </div>
      <h2 className="mt-4 font-semibold">Nenhuma mensalidade registrada</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Crie a primeira mensalidade manualmente ou configure a geração automática.
      </p>
      <Button className="mt-5" onClick={props.onCreate}>
        Criar mensalidade
      </Button>
    </div>
  );
}
