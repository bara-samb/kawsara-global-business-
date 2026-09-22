import { describe, it, expect } from "vitest";
import { createCaptcha, verifyCaptcha } from "@/lib/captcha";

describe("CAPTCHA maison (cahier des charges section 47)", () => {
  it("accepte la bonne reponse", () => {
    const c = createCaptcha();
    expect(verifyCaptcha(String(c.a), String(c.b), String(c.expires), c.token, String(c.a + c.b))).toBe(true);
  });

  it("refuse une mauvaise reponse", () => {
    const c = createCaptcha();
    expect(verifyCaptcha(String(c.a), String(c.b), String(c.expires), c.token, "999")).toBe(false);
  });

  it("refuse un token falsifie (a/b modifies apres signature)", () => {
    const c = createCaptcha();
    expect(verifyCaptcha(String(c.a + 1), String(c.b), String(c.expires), c.token, String(c.a + 1 + c.b))).toBe(false);
  });

  it("refuse un defi expire", () => {
    const c = createCaptcha();
    const expiredExpires = String(Date.now() - 1000);
    expect(verifyCaptcha(String(c.a), String(c.b), expiredExpires, c.token, String(c.a + c.b))).toBe(false);
  });
});
