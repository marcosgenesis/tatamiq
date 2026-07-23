import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PreRegistrationLink } from "@tatamiq/contracts";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { academyQueryKey } from "../../lib/academy-query-keys";
import { academyOnboardingChecklistQueryKey } from "../dashboard/academy-onboarding-checklist";

export type DuplicateDecision = "link_to_existing" | "create_new" | "reject_as_duplicate";

export function preRegistrationLinkQueryKey(academyId: string | null | undefined) {
  return academyQueryKey(academyId, "students", "pre-registration-link");
}

export function writePreRegistrationLinkCache(
  queryClient: Pick<ReturnType<typeof useQueryClient>, "setQueryData">,
  academyId: string | null | undefined,
  link: PreRegistrationLink,
) {
  queryClient.setQueryData(preRegistrationLinkQueryKey(academyId), link);
}

export function usePreRegistrationsWorkflow() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalResult, setApprovalResult] = useState<{
    requestId: string;
    firstAccessLink: string;
  } | null>(null);

  const linkQuery = useQuery({
    queryKey: preRegistrationLinkQueryKey(activeAcademyId),
    queryFn: async () => {
      const { data, error } = await api.GET("/students/pre-registration-link");
      if (error) throw new Error("Não foi possível carregar o link.");
      return data;
    },
    enabled: !!activeAcademyId,
  });

  const requestsQuery = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "students", "pre-registrations"),
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
    enabled: !!activeAcademyId,
  });

  const copyLinkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/students/pre-registration-link/copy");
      if (error || !data?.url) throw new Error("Não foi possível copiar o link.");
      await navigator.clipboard.writeText(data.url);
      return data as PreRegistrationLink;
    },
    onSuccess: async (copiedLink) => {
      writePreRegistrationLinkCache(queryClient, activeAcademyId, copiedLink);
      toast("Link de pré-cadastro copiado", { description: copiedLink.url });
      await queryClient.invalidateQueries({
        queryKey: academyOnboardingChecklistQueryKey(activeAcademyId),
      });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Não foi possível copiar o link.");
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
      const { data, error } = await (api.POST as any)(path);
      if (error || !data) throw new Error("Não foi possível atualizar o link.");
      return data as PreRegistrationLink;
    },
    onSuccess: async (link) => {
      writePreRegistrationLinkCache(queryClient, activeAcademyId, link);
      await queryClient.invalidateQueries({
        queryKey: preRegistrationLinkQueryKey(activeAcademyId),
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
        queryKey: academyQueryKey(activeAcademyId, "students", "pre-registrations"),
      });
      setRejectingId(null);
      setRejectReason("");
      toast.success("Solicitação rejeitada.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível rejeitar a solicitação.",
      );
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
      if (data?.firstAccessLink && data.request.firstAccessStatus === "awaiting_password") {
        setApprovalResult({
          requestId: variables.id,
          firstAccessLink: data.firstAccessLink,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "students", "pre-registrations"),
      });
      setApprovingId(null);
      toast.success("Solicitação aprovada.");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível aprovar a solicitação.",
      );
    },
  });

  const generateFirstAccessLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.POST(
        "/students/pre-registrations/{id}/generate-first-access-link",
        { params: { path: { id } } },
      );
      if (error || !data) throw new Error("Não foi possível gerar o link.");
      return { requestId: id, firstAccessLink: data.firstAccessLink };
    },
    onSuccess: (data) => {
      setApprovalResult(data);
      copyFirstAccessLink(data.firstAccessLink);
    },
    onError: () => {
      toast.error("Falha ao gerar link de primeiro acesso");
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
    copyLinkMutation.mutate();
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
    generateFirstAccessLinkPending: generateFirstAccessLinkMutation.isPending,
    sendEmailPending: sendEmailMutation.isPending,
    setRejectReason,
    copyLink,
    copyFirstAccessLink,
    generateFirstAccessLink: (requestId: string) =>
      generateFirstAccessLinkMutation.mutate(requestId),
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
