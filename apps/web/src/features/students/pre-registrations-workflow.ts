import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";

export type DuplicateDecision = "link_to_existing" | "create_new" | "reject_as_duplicate";

export function usePreRegistrationsWorkflow() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    requestId: string;
    firstAccessLink: string;
  } | null>(null);

  const linkQuery = useQuery({
    queryKey: ["students", "pre-registration-link"],
    queryFn: async () => {
      const { data, error } = await api.GET("/students/pre-registration-link");
      if (error) throw new Error("Não foi possível carregar o link.");
      return data;
    },
  });

  const requestsQuery = useQuery({
    queryKey: ["students", "pre-registrations"],
    queryFn: async () => {
      const { data, error } = await api.GET("/students/pre-registrations");
      if (error) {
        const message =
          typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: string }).message)
            : "Não foi possível carregar pré-cadastros.";
        throw new Error(message);
      }
      return data;
    },
  });

  const linkActionMutation = useMutation({
    mutationFn: async (action: "pause" | "reactivate" | "regenerate") => {
      const path =
        action === "pause"
          ? "/students/pre-registration-link/pause"
          : action === "reactivate"
            ? "/students/pre-registration-link/reactivate"
            : "/students/pre-registration-link/regenerate";
      // biome-ignore lint/suspicious/noExplicitAny: dynamic endpoint path
      const { error } = await (api.POST as any)(path);
      if (error) throw new Error("Não foi possível atualizar o link.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["students", "pre-registration-link"],
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await api.POST("/students/pre-registrations/{id}/reject", {
        params: { path: { id } },
        body: { reason },
      });
      if (error) throw new Error("Não foi possível rejeitar a solicitação.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["students", "pre-registrations"],
      });
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      duplicateDecision,
    }: {
      id: string;
      duplicateDecision?: DuplicateDecision | undefined;
    }) => {
      const { data, error } = await api.POST("/students/pre-registrations/{id}/approve", {
        params: { path: { id } },
        body: duplicateDecision ? { duplicateDecision } : {},
      });
      if (error) throw new Error("Não foi possível aprovar a solicitação.");
      return data;
    },
    onSuccess: async (data, variables) => {
      if (data?.firstAccessLink) {
        setApprovalResult({
          requestId: variables.id,
          firstAccessLink: data.firstAccessLink,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: ["students", "pre-registrations"],
      });
      setApprovingId(null);
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.POST("/students/pre-registrations/{id}/send-first-access-email", {
        params: { path: { id } },
      });
      if (error) throw new Error("Não foi possível enviar o email.");
    },
    onSuccess: () => {
      toast("Email enviado com sucesso");
    },
    onError: () => {
      toast.error("Falha ao enviar email");
    },
  });

  const link = linkQuery.data;
  const requests = requestsQuery.data?.requests ?? [];

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link.url);
    toast("Link de pré-cadastro copiado", { description: link.url });
  }

  function copyFirstAccessLink(url: string) {
    navigator.clipboard.writeText(url);
    toast("Link de primeiro acesso copiado");
  }

  function startReject(requestId: string) {
    setRejectingId(requestId);
    setRejectReason("");
  }

  function submitReject(requestId: string) {
    rejectMutation.mutate({ id: requestId, reason: rejectReason });
  }

  function submitApprove(input: {
    requestId: string;
    hasDuplicate: boolean;
    duplicateDecision?: DuplicateDecision | undefined;
  }) {
    if (input.hasDuplicate && !input.duplicateDecision) {
      setApprovingId(input.requestId);
      return;
    }

    approveMutation.mutate(
      input.duplicateDecision
        ? { id: input.requestId, duplicateDecision: input.duplicateDecision }
        : { id: input.requestId },
    );
  }

  return {
    link,
    requests,
    linkQuery,
    requestsQuery,
    rejectingId,
    rejectReason,
    approvingId,
    approvalResult,
    approvePending: approveMutation.isPending,
    sendEmailPending: sendEmailMutation.isPending,
    setRejectReason,
    copyLink,
    copyFirstAccessLink,
    startReject,
    cancelReject: () => setRejectingId(null),
    submitReject,
    submitApprove,
    cancelApprove: () => setApprovingId(null),
    submitLinkAction: (action: "pause" | "reactivate" | "regenerate") =>
      linkActionMutation.mutate(action),
    sendFirstAccessEmail: (requestId: string) => sendEmailMutation.mutate(requestId),
  };
}
