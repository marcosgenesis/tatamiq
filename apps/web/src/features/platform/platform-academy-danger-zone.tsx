import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Delete02Icon } from "hugeicons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  deletePlatformAcademy,
  type PlatformAcademiesResponse,
  type PlatformAcademyDeletionPreview,
  type PlatformAcademySummary,
  platformAcademyDeletionPreviewQuery,
  platformKeys,
  removeAcademyFromAcademiesResponse,
} from "./platform-queries";

export function PlatformAcademyDangerZone({
  academy,
  sessionUserId,
}: {
  academy: PlatformAcademySummary;
  sessionUserId: string | null | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    confirmationSlug: "",
    irreversibleAccepted: false,
    reason: "",
  });
  const deletionPreview = useQuery(
    platformAcademyDeletionPreviewQuery(sessionUserId, academy.id, isOpen),
  );

  const deleteAcademy = useMutation({
    mutationFn: async () =>
      deletePlatformAcademy({
        academyId: academy.id,
        confirmationSlug: form.confirmationSlug,
        irreversibleAccepted: form.irreversibleAccepted,
        ...(form.reason ? { reason: form.reason } : {}),
      }),
    onSuccess: async (result) => {
      toast.success("Academia excluída definitivamente.");
      queryClient.setQueriesData<PlatformAcademiesResponse | undefined>(
        { queryKey: ["platform", "academies"] },
        (current) => removeAcademyFromAcademiesResponse(current, result.deletedAcademyId),
      );
      queryClient.removeQueries({ queryKey: platformKeys.academy(sessionUserId, academy.id) });
      queryClient.removeQueries({
        queryKey: platformKeys.academyOperationalOverview(sessionUserId, academy.id),
      });
      queryClient.removeQueries({
        queryKey: platformKeys.academyDeletionPreview(sessionUserId, academy.id),
      });
      await queryClient.invalidateQueries({ queryKey: ["platform", "academies"] });
      await navigate({ to: "/platform/academies" });
    },
    onError: () => {
      toast.error(
        "Não foi possível excluir a academia. Nenhum dado foi excluído se a remoção de arquivos falhou.",
      );
    },
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-destructive/30 bg-card shadow-sm">
      <header className="border-b border-destructive/20 bg-destructive/5 px-5 py-4">
        <h2 className="text-[0.95rem] font-bold tracking-tight text-destructive">Zona de perigo</h2>
      </header>
      <div className="space-y-3 p-5">
        <p className="text-sm text-muted-foreground">
          Exclua definitivamente esta academia, seus dados operacionais, vínculos de acesso e
          arquivos associados. As contas de usuários serão preservadas.
        </p>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (open) {
              deleteAcademy.reset();
              setForm({ confirmationSlug: "", irreversibleAccepted: false, reason: "" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Delete02Icon className="size-4" />
              Excluir academia definitivamente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir academia definitivamente</DialogTitle>
              <DialogDescription>
                Digite o slug <strong>{academy.slug}</strong> e confirme que entende a
                irreversibilidade da ação.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {deletionPreview.isLoading ? (
                <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                  Calculando impacto...
                </p>
              ) : deletionPreview.data ? (
                <DeletionImpactSummary preview={deletionPreview.data} />
              ) : deletionPreview.isError ? (
                <p className="text-destructive text-sm">
                  Não foi possível carregar a prévia de impacto.
                </p>
              ) : null}
              <Input
                placeholder="Slug exato da academia"
                value={form.confirmationSlug}
                onChange={(event) =>
                  setForm((current) => ({ ...current, confirmationSlug: event.target.value }))
                }
              />
              <label className="flex items-start gap-3 rounded-xl bg-destructive/10 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={form.irreversibleAccepted}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      irreversibleAccepted: event.target.checked,
                    }))
                  }
                />
                <span>
                  Entendo que esta ação apagará definitivamente a academia e não poderá ser
                  revertida pelo produto.
                </span>
              </label>
              <Input
                placeholder="Motivo para auditoria (opcional)"
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reason: event.target.value }))
                }
              />
              {deleteAcademy.isError ? (
                <p className="text-destructive text-sm">Não foi possível excluir a academia.</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteAcademy.mutate()}
                disabled={
                  deleteAcademy.isPending ||
                  deletionPreview.isLoading ||
                  form.confirmationSlug !== academy.slug ||
                  !form.irreversibleAccepted
                }
              >
                {deleteAcademy.isPending ? "Excluindo..." : "Excluir definitivamente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

function DeletionImpactSummary({ preview }: { preview: PlatformAcademyDeletionPreview }) {
  const impact = preview.impact;
  return (
    <div className="space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
      <p className="font-medium">Impacto da exclusão de {preview.academy.name}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Responsáveis: {preview.affectedResponsibles.length}</span>
        <span>Alunos: {impact.students}</span>
        <span>Turmas: {impact.classGroups}</span>
        <span>Aulas: {impact.classSessions}</span>
        <span>Presenças: {impact.attendances}</span>
        <span>Mensalidades: {impact.monthlyFees}</span>
        <span>Comprovantes: {impact.paymentReceipts}</span>
        <span>Arquivos: {impact.files}</span>
      </div>
    </div>
  );
}
