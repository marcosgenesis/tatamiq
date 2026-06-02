import type { FormEvent } from "react";
import { Field, SelectField } from "../../components/form-field";
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
import { monthNames } from "../../lib/formatting";
import type { FeeFormState } from "./monthly-fees-types";

export function CreateMonthlyFeeDrawer(props: {
  open: boolean;
  form: FeeFormState;
  studentOptions: Array<{ value: string; label: string }>;
  error: string | null;
  creating: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStudentSelect: (studentId: string) => void;
  onFormChange: (field: keyof FeeFormState, value: string) => void;
}) {
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
            <DrawerTitle>Nova mensalidade</DrawerTitle>
            <DrawerDescription>Preencha os dados da cobrança.</DrawerDescription>
          </DrawerHeader>
          <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
            <SelectField
              label="Aluno"
              value={props.form.studentId}
              onChange={props.onStudentSelect}
              options={[{ value: "", label: "Selecione um aluno" }, ...props.studentOptions]}
            />
            <SelectField
              label="Mês de referência"
              value={props.form.referenceMonth}
              onChange={(value) => props.onFormChange("referenceMonth", value)}
              options={monthNames.map((name, i) => ({
                value: String(i + 1),
                label: name,
              }))}
            />
            <Field
              label="Ano de referência"
              type="number"
              value={props.form.referenceYear}
              onChange={(value) => props.onFormChange("referenceYear", value)}
            />
            <Field
              label="Valor (R$)"
              inputMode="decimal"
              value={props.form.amountInCents}
              onChange={(value) => props.onFormChange("amountInCents", value)}
            />
            <Field
              label="Dia de vencimento"
              type="number"
              min="1"
              max="31"
              value={props.form.dueDay}
              onChange={(value) => props.onFormChange("dueDay", value)}
            />
            {props.error ? <p className="text-sm text-destructive">{props.error}</p> : null}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DrawerClose>
            <Button type="submit" disabled={props.creating}>
              {props.creating ? "Criando..." : "Criar mensalidade"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
