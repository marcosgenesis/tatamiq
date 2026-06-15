import type { FormEvent } from "react";
import { Field } from "../../components/form-field";
import { Button } from "../../components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../components/ui/drawer";
import type { MonthlyFeeActionType } from "./monthly-fees-types";

export function MonthlyFeeActionDrawer(props: {
  open: boolean;
  actionType: MonthlyFeeActionType | null;
  actionReason: string;
  actionAmount: string;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onReasonChange: (value: string) => void;
  onAmountChange: (value: string) => void;
}) {
  const confirmDisabled =
    props.actionType === "manual_payment"
      ? false
      : !props.actionReason.trim() || (props.actionType === "adjust" && !props.actionAmount.trim());

  return (
    <Drawer
      direction="right"
      open={props.open}
      onOpenChange={(open: boolean) => {
        if (!open) props.onClose();
      }}
    >
      <DrawerContent>
        <form className="flex h-full flex-col" onSubmit={props.onSubmit}>
          <DrawerHeader>
            <DrawerTitle>
              {props.actionType === "adjust"
                ? "Ajustar valor"
                : props.actionType === "waive"
                  ? "Dispensar mensalidade"
                  : "Marcar como pago"}
            </DrawerTitle>
            <DrawerDescription>
              {props.actionType === "adjust"
                ? "Informe o novo valor e o motivo do ajuste."
                : props.actionType === "waive"
                  ? "Informe o motivo da dispensa."
                  : "Registre o pagamento manual."}
            </DrawerDescription>
          </DrawerHeader>
          <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
            {props.actionType === "adjust" ? (
              <Field
                label="Novo valor (R$)"
                inputMode="decimal"
                value={props.actionAmount}
                onChange={props.onAmountChange}
              />
            ) : null}
            <Field
              label={props.actionType === "manual_payment" ? "Observação (opcional)" : "Motivo"}
              required={props.actionType !== "manual_payment"}
              value={props.actionReason}
              onChange={props.onReasonChange}
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DrawerClose>
            <Button type="submit" disabled={confirmDisabled}>
              Confirmar
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
