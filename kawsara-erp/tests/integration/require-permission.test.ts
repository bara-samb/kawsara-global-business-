import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";

let testSession: { user: Record<string, unknown> } | null = null;
vi.mock("@/lib/auth", () => ({ auth: async () => testSession }));

const { requirePermission } = await import("@/lib/require-permission");

describe("requirePermission : refus cote serveur + audit (criteres 6 et 58.11)", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        reference: await generateReference("user"),
        name: "Caissier Permission Vitest",
        email: `caissier-permission-vitest-${Date.now()}@example.com`,
        passwordHash: "unused-in-tests",
        role: "CAISSIER",
      },
    });
    userId = user.id;
    testSession = {
      user: { id: user.id, name: user.name, email: user.email, role: "CAISSIER", reference: user.reference, storeId: null, customerId: null },
    };
  });

  it("autorise une permission accordee au role", async () => {
    const user = await requirePermission("sale.create");
    expect(user.id).toBe(userId);
  });

  it("refuse une permission non accordee et journalise un ACCESS_DENIED", async () => {
    await expect(requirePermission("product.update")).rejects.toThrow(/acces refuse/i);

    const log = await prisma.auditLog.findFirst({
      where: { userId, action: "ACCESS_DENIED", entity: "product.update" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
  });

  it("refuse tout acces quand personne n'est connecte", async () => {
    testSession = null;
    await expect(requirePermission("sale.create")).rejects.toThrow();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });
});
