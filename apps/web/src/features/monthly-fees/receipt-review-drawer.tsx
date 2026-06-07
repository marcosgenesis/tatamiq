import type { MonthlyFeeDetail } from "@tatamiq/contracts";
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
import { receiptHistory } from "./receipt-state";

export function ReceiptReviewDrawer(props: {
  detail: MonthlyFeeDetail | null;
  isLoading: boolean;
  pendingReceipt: MonthlyFeeDetail["receipts"][number] | null;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onOpenReceipt: (feeId: string, receiptId: string) => void;
  onApprove: (feeId: string, receiptId: string) => void;
  onReject: (feeId: string, receiptId: string, reason: string) => void;
}) {
  const history = props.detail ? receiptHistory(props.detail) : [];

  return (
    <Drawer
      direction="right"
      open={props.detail !== null || props.isLoading}
      onOpenChange={props.onOpenChange}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Verificação de pagamento</DrawerTitle>
          <DrawerDescription>
            Revise o comprovante ativo antes de aprovar ou rejeitar.
          </DrawerDescription>
        </DrawerHeader>
        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4">
          {props.isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {props.detail && props.pendingReceipt ? (
            <div className="space-y-4 rounded-2xl border border-border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Aluno</p>
                <strong>{props.detail.studentName}</strong>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Observação do aluno</p>
                <p className="text-sm">{props.pendingReceipt.note || "Sem observação."}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  props.onOpenReceipt(props.detail?.id ?? "", props.pendingReceipt?.id ?? "")
                }
              >
                Abrir comprovante
              </Button>
              <div className="space-y-2">
                <Field
                  label="Motivo da rejeição"
                  value={props.rejectReason}
                  onChange={props.onRejectReasonChange}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      props.onApprove(props.detail?.id ?? "", props.pendingReceipt?.id ?? "")
                    }
                  >
                    Aprovar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={!props.rejectReason.trim()}
                    onClick={() =>
                      props.onReject(
                        props.detail?.id ?? "",
                        props.pendingReceipt?.id ?? "",
                        props.rejectReason,
                      )
                    }
                  >
                    Rejeitar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {props.detail && !props.pendingReceipt ? (
            <p className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
              Nenhum comprovante pendente ativo.
            </p>
          ) : null}
          {history.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Histórico</h3>
              {history.map((receipt) => (
                <div
                  key={receipt.id}
                  className="rounded-2xl border border-border p-3 text-sm text-muted-foreground"
                >
                  {receipt.status} · {formatDateTime(receipt.createdAt)}
                  {receipt.rejectionReason ? <span> · {receipt.rejectionReason}</span> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button type="button" variant="secondary">
              Fechar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
