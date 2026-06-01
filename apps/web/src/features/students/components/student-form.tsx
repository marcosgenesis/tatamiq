import { useMutation } from "@tanstack/react-query";
import type { BeltDto, Student } from "@tatamiq/contracts";
import type { components } from "@tatamiq/contracts/generated";
import { type FormEvent, useEffect, useState } from "react";
import { DatePicker } from "@/components/reui/date-picker";
import { api } from "../../../api";
import { Field, SelectField } from "../../../components/form-field";
import { Button } from "../../../components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../../../components/ui/drawer";
import { maskCurrency, maskPhone } from "../../../lib/masks";

type StudentPayload = components["schemas"]["UpdateStudentDto"];
type StudentFormState = {
  name: string;
  birthDate: string;
  enrollmentDate: string;
  phone: string;
  email: string;
  monthlyAmount: string;
  monthlyDueDay: string;
  currentBeltId: string;
  currentDegree: string;
  status: Student["status"];
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  guardianRelationship: string;
};

const emptyForm: StudentFormState = {
  name: "",
  birthDate: "",
  enrollmentDate: new Date().toISOString().slice(0, 10),
  phone: "",
  email: "",
  monthlyAmount: "",
  monthlyDueDay: "",
  currentBeltId: "",
  currentDegree: "0",
  status: "active",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  guardianRelationship: "",
};

export function StudentForm(props: {
  student?: Student;
  belts: BeltDto[];
  open: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const adultBelts = props.belts.filter((b) => b.path === "adult");
  const childBelts = props.belts.filter((b) => b.path === "child");

  useEffect(() => {
    if (!props.open) return;
    const student = props.student;
    setForm(
      student
        ? {
            name: student.name,
            birthDate: student.birthDate,
            enrollmentDate: student.enrollmentDate,
            phone: student.phone ?? "",
            email: student.email ?? "",
            monthlyAmount: student.monthlyAmountInCents?.toString() ?? "",
            monthlyDueDay: student.monthlyDueDay?.toString() ?? "",
            currentBeltId: student.currentBeltId,
            currentDegree: student.currentDegree.toString(),
            status: student.status,
            guardianName: student.guardian?.name ?? "",
            guardianPhone: student.guardian?.phone ?? "",
            guardianEmail: student.guardian?.email ?? "",
            guardianRelationship: student.guardian?.relationship ?? "",
          }
        : emptyForm,
    );
    setError(null);
  }, [props.open, props.student]);

  const saveMutation = useMutation({
    mutationFn: async (input: StudentPayload) => {
      if (props.student) {
        const { data, error } = await api.PATCH("/students/{id}", {
          params: { path: { id: props.student.id } },
          body: input,
        });
        if (error) throw new Error("Não foi possível salvar o aluno.");
        return data;
      }

      const { data, error } = await api.POST("/students", { body: input });
      if (error) throw new Error("Não foi possível criar o aluno.");
      return data;
    },
    onSuccess: () => {
      props.onSubmit();
      props.onClose();
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Erro ao salvar aluno.");
    },
  });

  function updateForm(field: keyof StudentFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const guardian =
      form.guardianName.trim() || form.guardianPhone.trim()
        ? {
            name: form.guardianName,
            phone: form.guardianPhone,
            email: form.guardianEmail,
            relationship: form.guardianRelationship,
          }
        : null;

    const payload: StudentPayload = {
      name: form.name,
      birthDate: form.birthDate,
      enrollmentDate: form.enrollmentDate,
      phone: form.phone,
      email: form.email,
      monthlyAmountInCents: form.monthlyAmount ? Number(form.monthlyAmount) : null,
      monthlyDueDay: form.monthlyDueDay ? Number(form.monthlyDueDay) : null,
      currentBeltId: form.currentBeltId,
      currentDegree: Number(form.currentDegree),
      guardian,
    };

    if (props.student) payload.status = form.status;
    saveMutation.mutate(payload);
  }

  return (
    <Drawer direction="right" open={props.open} onOpenChange={(open) => !open && props.onClose()}>
      <DrawerContent>
        <form className="flex h-full flex-col" onSubmit={submitForm}>
          <DrawerHeader>
            <DrawerTitle>{props.student ? "Editar aluno" : "Novo aluno"}</DrawerTitle>
            <DrawerDescription>
              {props.student
                ? "Atualize os dados do aluno."
                : "Preencha os dados para cadastrar um novo aluno."}
            </DrawerDescription>
          </DrawerHeader>
          <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-4">
            <div className="grid gap-4">
              <Field
                label="Nome"
                required
                value={form.name}
                onChange={(value) => updateForm("name", value)}
              />
              <div className="space-y-2 text-sm font-medium">
                <span>
                  Nascimento
                  <span className="text-destructive ml-0.5">*</span>
                </span>
                <DatePicker
                  value={form.birthDate}
                  onChange={(value) => updateForm("birthDate", value)}
                  placeholder="Selecionar data de nascimento"
                />
              </div>
              <div className="space-y-2 text-sm font-medium">
                <span>
                  Matrícula
                  <span className="text-destructive ml-0.5">*</span>
                </span>
                <DatePicker
                  value={form.enrollmentDate}
                  onChange={(value) => updateForm("enrollmentDate", value)}
                  placeholder="Selecionar data de matrícula"
                />
              </div>
              <Field
                label="Telefone"
                placeholder="(00) 00000-0000"
                value={maskPhone(form.phone)}
                onChange={(value) => updateForm("phone", value.replace(/\D/g, ""))}
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => updateForm("email", value)}
              />
              <Field
                label="Valor mensal (R$)"
                inputMode="numeric"
                placeholder="0,00"
                value={maskCurrency(form.monthlyAmount)}
                onChange={(value) => updateForm("monthlyAmount", value.replace(/\D/g, ""))}
              />
              <Field
                label="Dia de vencimento"
                type="number"
                min="1"
                max="31"
                placeholder="Ex: 10"
                value={form.monthlyDueDay}
                onChange={(value) => updateForm("monthlyDueDay", value)}
              />
              <label className="space-y-2 text-sm font-medium">
                <span>
                  Faixa
                  <span className="text-destructive ml-0.5">*</span>
                </span>
                <select
                  required
                  value={form.currentBeltId}
                  onChange={(event) => updateForm("currentBeltId", event.target.value)}
                  className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Selecione a faixa</option>
                  {adultBelts.length > 0 && (
                    <optgroup label="Adulto">
                      {adultBelts.map((belt) => (
                        <option key={belt.id} value={belt.id}>
                          {belt.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {childBelts.length > 0 && (
                    <optgroup label="Infantil">
                      {childBelts.map((belt) => (
                        <option key={belt.id} value={belt.id}>
                          {belt.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              <SelectField
                label="Grau"
                required
                value={form.currentDegree}
                onChange={(value) => updateForm("currentDegree", value)}
                options={[0, 1, 2, 3, 4, 5, 6].map((value) => ({
                  value: String(value),
                  label: `${value} grau(s)`,
                }))}
              />
              {props.student ? (
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(value) => updateForm("status", value)}
                  options={[
                    { value: "active", label: "Ativo" },
                    { value: "inactive", label: "Inativo" },
                  ]}
                />
              ) : null}
            </div>

            <div className="rounded-3xl border border-border bg-muted/30 p-4">
              <h3 className="font-medium">Responsável</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Obrigatório para aluno menor de idade.
              </p>
              <div className="mt-4 grid gap-4">
                <Field
                  label="Nome do responsável"
                  value={form.guardianName}
                  onChange={(value) => updateForm("guardianName", value)}
                />
                <Field
                  label="Telefone do responsável"
                  placeholder="(00) 00000-0000"
                  value={maskPhone(form.guardianPhone)}
                  onChange={(value) => updateForm("guardianPhone", value.replace(/\D/g, ""))}
                />
                <Field
                  label="Email do responsável"
                  type="email"
                  value={form.guardianEmail}
                  onChange={(value) => updateForm("guardianEmail", value)}
                />
                <Field
                  label="Parentesco"
                  value={form.guardianRelationship}
                  onChange={(value) => updateForm("guardianRelationship", value)}
                />
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </DrawerClose>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar aluno"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
