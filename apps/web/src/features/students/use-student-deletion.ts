import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Student } from "@tatamiq/contracts";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { academyQueryKey } from "../../lib/academy-query-keys";

export function useStudentDeletion(academyId: string) {
  const queryClient = useQueryClient();
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await api.DELETE("/students/{id}", { params: { path: { id: studentId } } });
      if (error) throw new Error(errorMessage(error));
    },
    onSuccess: async () => {
      setStudentToDelete(null);
      await queryClient.invalidateQueries({ queryKey: academyQueryKey(academyId, "students") });
      toast.success("Cadastro do aluno excluído");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao excluir aluno."),
  });

  return {
    studentToDelete,
    requestDeletion: setStudentToDelete,
    cancelDeletion: () => setStudentToDelete(null),
    confirmDeletion: () => studentToDelete && deleteMutation.mutate(studentToDelete.id),
    isDeleting: deleteMutation.isPending,
  };
}

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (typeof message === "string") return message;
  }
  return "Não foi possível excluir o cadastro do aluno.";
}
