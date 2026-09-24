import { describe, it, expect, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createCaptcha } from "@/lib/captcha";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ signIn: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));

const redirectCalls: string[] = [];
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectCalls.push(url);
    const err = new Error(`NEXT_REDIRECT:${url}`);
    (err as { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw err;
  },
  // Comme le vrai unstable_rethrow : laisse passer les redirections interceptees par runAction.
  unstable_rethrow: (error: unknown) => {
    if (String((error as { digest?: string })?.digest ?? "").startsWith("NEXT_REDIRECT")) throw error;
  },
}));

const { registerCustomer } = await import("@/lib/actions/auth-register");

function formDataOf(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("Inscription client (cahier des charges section 26/47 - CAPTCHA)", () => {
  const testEmail = `vitest-register-${Date.now()}@example.com`;

  it("refuse une reponse CAPTCHA incorrecte SANS creer de compte", async () => {
    const c = createCaptcha();
    const fd = formDataOf({
      name: "Vitest User",
      email: testEmail,
      phone: "",
      address: "",
      password: "Password123",
      captchaA: String(c.a),
      captchaB: String(c.b),
      captchaExpires: String(c.expires),
      captchaToken: c.token,
      captchaAnswer: "999999",
    });

    await expect(registerCustomer(fd)).rejects.toThrow();
    expect(redirectCalls.at(-1)).toContain("erreur=captcha");

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    expect(user).toBeNull();
  });

  it("cree le compte ET le profil client quand le CAPTCHA est correct", async () => {
    const c = createCaptcha();
    const fd = formDataOf({
      name: "Vitest User",
      email: testEmail,
      phone: "+221700000000",
      address: "Dakar",
      password: "Password123",
      captchaA: String(c.a),
      captchaB: String(c.b),
      captchaExpires: String(c.expires),
      captchaToken: c.token,
      captchaAnswer: String(c.a + c.b),
    });

    // signIn est mocke (pas de contexte HTTP en test) : on verifie juste la creation en base.
    await registerCustomer(fd).catch(() => {});

    const user = await prisma.user.findUnique({ where: { email: testEmail }, include: { customer: true } });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("CLIENT");
    expect(user?.customer).not.toBeNull();
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  });
});
