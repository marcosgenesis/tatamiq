import { useMutation, useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { api } from "../../api";
import { Field } from "../../components/form-field";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { isMinorDate } from "./pre-registration-utils";

type FormState = {
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  note: string;
  consentAccepted: boolean;
};

const emptyForm: FormState = {
  name: "",
  birthDate: "",
  phone: "",
  email: "",
  guardianName: "",
  guardianPhone: "",
  note: "",
  consentAccepted: false,
};

export function PreRegistrationPage({ token }: { token: string }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["pre-register", token],
    queryFn: async () => {
      const { data, error } = await api.GET("/pre-register/{token}", {
        params: { path: { token } },
      });
      if (error) throw new Error("Link de pré-cadastro indisponível.");
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!form.consentAccepted) throw new Error("Aceite o consentimento para continuar.");
      const { error } = await api.POST("/pre-register/{token}/requests", {
        params: { path: { token } },
        body: { ...form, consentAccepted: true },
      });
      if (error) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: string }).message)
            : "Não foi possível enviar sua solicitação.";
        throw new Error(message);
      }
    },
    onSuccess: () => {
      setSubmitted(true);
      setError(null);
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível enviar sua solicitação.",
      );
    },
  });

  function update(field: keyof FormState, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    submitMutation.mutate();
  }

  if (profileQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-muted-foreground">
        Carregando...
      </main>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-destructive">
        Link de pré-cadastro indisponível.
      </main>
    );
  }

  const { academy, link } = profileQuery.data;
  const isPaused = link.status === "paused";
  const isMinor = isMinorDate(form.birthDate);

  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            {academy.logo ? (
              <img src={academy.logo} alt="" className="mb-4 size-16 rounded-2xl object-cover" />
            ) : null}
            <CardTitle>Pré-cadastro — {academy.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Solicite seu cadastro para treinar nesta academia. O instrutor vai revisar seus dados
              antes de liberar o acesso.
            </p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {academy.address ? <p>{academy.address}</p> : null}
              {academy.phone ? <p>{academy.phone}</p> : null}
              {academy.instagram ? <p>{academy.instagram}</p> : null}
            </div>
          </CardHeader>
        </Card>

        {isPaused ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Este link de pré-cadastro está pausado no momento. Fale com a academia para mais
              informações.
            </CardContent>
          </Card>
        ) : submitted ? (
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold">Solicitação enviada</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sua solicitação foi enviada para análise da academia.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Seus dados</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <Field
                  label="Nome completo"
                  required
                  value={form.name}
                  onChange={(value) => update("name", value)}
                />
                <Field
                  label="Data de nascimento"
                  required
                  type="date"
                  value={form.birthDate}
                  onChange={(value) => update("birthDate", value)}
                />
                <Field
                  label="Telefone/WhatsApp"
                  required
                  value={form.phone}
                  onChange={(value) => update("phone", value)}
                />
                <Field
                  label="Email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(value) => update("email", value)}
                />
                {isMinor ? (
                  <div className="rounded-2xl border border-border p-4 space-y-4">
                    <p className="text-sm font-medium">Responsável</p>
                    <Field
                      label="Nome do responsável"
                      required
                      value={form.guardianName}
                      onChange={(value) => update("guardianName", value)}
                    />
                    <Field
                      label="Telefone do responsável"
                      required
                      value={form.guardianPhone}
                      onChange={(value) => update("guardianPhone", value)}
                    />
                  </div>
                ) : null}
                <Textarea
                  value={form.note}
                  onChange={(event) => update("note", event.target.value)}
                  placeholder="Observação opcional"
                />
                <label className="flex gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.consentAccepted}
                    onChange={(event) => update("consentAccepted", event.currentTarget.checked)}
                    required
                  />
                  Autorizo a academia a analisar estes dados para decidir sobre meu cadastro.
                </label>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? "Enviando..." : "Enviar solicitação"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
