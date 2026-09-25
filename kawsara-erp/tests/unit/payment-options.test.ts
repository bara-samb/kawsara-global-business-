import { describe, it, expect } from "vitest";
import { parsePaymentOption } from "@/lib/payment-options";

describe("Modes de paiement (cahier des charges section 23)", () => {
  it("decode une option caisse en methode ESPECES avec la session liee", () => {
    const result = parsePaymentOption("CASH:abc123");
    expect(result).toEqual({ method: "ESPECES", cashSessionId: "abc123" });
  });

  it("decode une methode non-especes sans session de caisse", () => {
    expect(parsePaymentOption("METHOD:WAVE")).toEqual({ method: "WAVE", cashSessionId: null });
    expect(parsePaymentOption("METHOD:CHEQUE")).toEqual({ method: "CHEQUE", cashSessionId: null });
  });
});

describe("Modes de paiement : valeurs invalides", () => {
  it("refuse une methode inconnue ou mal formee", () => {
    expect(() => parsePaymentOption("METHOD:BITCOIN")).toThrow();
    expect(() => parsePaymentOption("WAVE")).toThrow();
    expect(() => parsePaymentOption("CASH:")).toThrow();
  });
});
