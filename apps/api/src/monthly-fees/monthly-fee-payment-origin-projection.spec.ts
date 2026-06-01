import { describe, expect, it } from "vitest";
import { projectMonthlyFeePaymentOrigin } from "./monthly-fee-payment-origin-projection";

function event(type: string, createdAt: string) {
  return { type, createdAt: new Date(createdAt) };
}

describe("projectMonthlyFeePaymentOrigin", () => {
  it("derives Pagamento Manual origin from Evento de Mensalidade", () => {
    expect(
      projectMonthlyFeePaymentOrigin({ status: "paid" }, [
        event("adjusted", "2026-01-01T10:00:00.000Z"),
        event("manual_payment", "2026-01-02T10:00:00.000Z"),
      ]),
    ).toBe("manual_payment");
  });

  it("derives Verificação de Pagamento approval origin from Evento de Mensalidade", () => {
    expect(
      projectMonthlyFeePaymentOrigin({ status: "paid" }, [
        event("receipt_approved", "2026-01-02T10:00:00.000Z"),
      ]),
    ).toBe("receipt_approved");
  });

  it("uses the latest payment event when more than one payment event exists", () => {
    expect(
      projectMonthlyFeePaymentOrigin({ status: "paid" }, [
        event("manual_payment", "2026-01-01T10:00:00.000Z"),
        event("receipt_approved", "2026-01-02T10:00:00.000Z"),
      ]),
    ).toBe("receipt_approved");
  });

  it("returns no origin when the Mensalidade is not paid", () => {
    expect(
      projectMonthlyFeePaymentOrigin({ status: "open" }, [
        event("manual_payment", "2026-01-02T10:00:00.000Z"),
      ]),
    ).toBeNull();
  });

  it("returns no origin when paid status has no derivable payment event", () => {
    expect(
      projectMonthlyFeePaymentOrigin({ status: "paid" }, [
        event("adjusted", "2026-01-01T10:00:00.000Z"),
      ]),
    ).toBeNull();
  });
});
