import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@tatamiq/contracts/generated";
import { Refresh01Icon, ShieldKeyIcon, Tablet01Icon, Unlink01Icon } from "hugeicons-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../api";
import { useAppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { academyQueryKey } from "../../lib/academy-query-keys";

type TotemDevice = components["schemas"]["TotemDeviceDto"];

export function TotemDevicesSection() {
  const queryClient = useQueryClient();
  const { activeAcademy } = useAppShell();
  const activeAcademyId = activeAcademy.id;
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  const devicesQuery = useQuery({
    queryKey: academyQueryKey(activeAcademyId, "totem-devices"),
    queryFn: async () => {
      const { data, error } = await api.GET("/totem/admin/devices");
      if (error || !data) throw new Error("Não foi possível carregar os totens.");
      return data as TotemDevice[];
    },
    enabled: !!activeAcademyId,
  });

  const codeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/totem/admin/pairing-code");
      if (error || !data) throw new Error("Não foi possível gerar o código.");
      return data;
    },
    onSuccess: (data) => {
      setPairingCode(data.code);
      toast.success("Código de pareamento gerado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao gerar código."),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.POST("/totem/admin/devices/{id}/revoke", {
        params: { path: { id } },
      });
      if (error) throw new Error("Não foi possível revogar o totem.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: academyQueryKey(activeAcademyId, "totem-devices"),
      });
      toast.success("Totem revogado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao revogar totem."),
  });

  const devices = devicesQuery.data ?? [];
  const activeDevices = devices.filter((device) => !device.revokedAt);

  return (
    <>
      <Separator className="my-8" />
      <section className="grid grid-cols-1 gap-10 md:grid-cols-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Tablet01Icon className="size-4 text-primary" strokeWidth={2} /> Totens da Academia
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Pareie tablets para exibir o QR Code da aula sem liberar o restante da gestão.
          </p>
        </div>
        <div className="space-y-5 md:col-span-2">
          <div className="rounded-xl border border-border bg-muted/25 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3">
                <ShieldKeyIcon className="mt-0.5 size-5 text-primary" strokeWidth={2} />
                <div>
                  <p className="font-medium">Gerar código de pareamento</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O código dura 10 minutos e só pode ativar um dispositivo.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => codeMutation.mutate()}
                disabled={codeMutation.isPending}
              >
                {codeMutation.isPending ? "Gerando…" : "Gerar código"}
              </Button>
            </div>
            {pairingCode ? (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <span className="font-mono text-2xl font-semibold tracking-[0.25em] text-primary">
                  {pairingCode}
                </span>
                <span className="text-xs text-muted-foreground">Digite no tablet</span>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Dispositivos pareados</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void devicesQuery.refetch()}
                disabled={devicesQuery.isFetching}
              >
                <Refresh01Icon className="size-4" strokeWidth={2} /> Atualizar
              </Button>
            </div>
            {activeDevices.length ? (
              activeDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {device.lastSeenAt
                        ? `Visto ${formatLastSeen(device.lastSeenAt)}`
                        : "Aguardando primeira conexão"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(`Revogar acesso de “${device.name}”?`))
                        revokeMutation.mutate(device.id);
                    }}
                    disabled={revokeMutation.isPending}
                  >
                    <Unlink01Icon className="size-4" strokeWidth={2} /> Revogar
                  </Button>
                </div>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                Nenhum totem pareado ainda.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function formatLastSeen(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}
