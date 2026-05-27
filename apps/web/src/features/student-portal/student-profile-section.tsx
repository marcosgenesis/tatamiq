import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export function StudentProfileSection() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ["student", "me"],
    queryFn: async () => {
      const { data, error } = await api.GET("/student/me");
      if (error) throw new Error("Erro ao carregar perfil.");
      return data;
    },
  });

  useEffect(() => {
    if (meQuery.data) {
      const s = meQuery.data.student as { phone?: string; email?: string };
      setPhone(s.phone ?? "");
      setEmail(s.email ?? "");
    }
  }, [meQuery.data]);

  const mutation = useMutation({
    mutationFn: async (body: { phone?: string; email?: string }) => {
      // biome-ignore lint/suspicious/noExplicitAny: endpoint not in generated types
      const { error } = await (api.PATCH as any)("/student/profile", { body });
      if (error) throw new Error("Não foi possível salvar.");
    },
    onSuccess: () => {
      setSuccess("Perfil atualizado com sucesso.");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["student", "me"] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccess(null);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    const body: { phone?: string; email?: string } = {};
    if (phone) body.phone = phone;
    if (email) body.email = email;
    mutation.mutate(body);
  }

  if (meQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando perfil...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meu perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="student-phone" className="text-sm font-medium">
              Telefone
            </label>
            <Input
              id="student-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="student-email" className="text-sm font-medium">
              E-mail
            </label>
            <Input
              id="student-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aluno@email.com"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <Button type="submit" disabled={mutation.isPending} className="min-h-11 w-full md:w-auto">
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
