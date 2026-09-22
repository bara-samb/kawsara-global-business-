import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";

describe("References uniques (cahier des charges section 55)", () => {
  it("genere des references sequentielles au format PREFIXE-ANNEE-000001", async () => {
    const year = new Date().getFullYear();
    const key = `product-${year}`;
    await prisma.referenceCounter.deleteMany({ where: { key } });

    const first = await generateReference("product");
    const second = await generateReference("product");

    expect(first).toMatch(/^PRD-\d{4}-\d{6}$/);
    expect(second).toMatch(/^PRD-\d{4}-\d{6}$/);
    expect(first).not.toBe(second);

    const firstSeq = Number(first.split("-")[2]);
    const secondSeq = Number(second.split("-")[2]);
    expect(secondSeq).toBe(firstSeq + 1);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
