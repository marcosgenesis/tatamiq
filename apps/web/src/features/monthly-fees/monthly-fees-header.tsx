import { Download04Icon, PlusSignIcon, RefreshIcon } from "hugeicons-react";
import { Button } from "../../components/ui/button";

export function MonthlyFeesHeader(props: {
  generatingMissing: boolean;
  onExportCsv: () => void;
  onCreate: () => void;
  onGenerateMissing: () => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <div className="flex gap-1.5 items-center">
          <h1 className="text-2xl">Mensalidades</h1>
        </div>

        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Cobranças mensais, Pix, comprovantes em verificação, ajustes e mensalidades dispensadas.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={props.onGenerateMissing}
          disabled={props.generatingMissing}
        >
          <RefreshIcon className="size-4" />
          {props.generatingMissing ? "Verificando..." : "Gerar faltantes"}
        </Button>
        <Button variant="secondary" onClick={props.onExportCsv}>
          <Download04Icon className="size-4" /> Exportar CSV
        </Button>
        <Button onClick={props.onCreate}>
          <PlusSignIcon className="size-4" /> Nova mensalidade
        </Button>
      </div>
    </div>
  );
}
