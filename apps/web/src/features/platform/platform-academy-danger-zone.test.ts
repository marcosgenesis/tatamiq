import { describe, expect, it, vi } from "vitest";
import { createSingleFlightGate } from "./platform-academy-danger-zone";

describe("createSingleFlightGate", () => {
  it("allows only one destructive submit until the failed request releases the gate", () => {
    const gate = createSingleFlightGate();
    const submit = vi.fn();

    if (gate.enter()) submit();
    if (gate.enter()) submit();

    expect(submit).toHaveBeenCalledTimes(1);
    expect(gate.locked).toBe(true);

    gate.release();
    if (gate.enter()) submit();

    expect(submit).toHaveBeenCalledTimes(2);
  });
});
