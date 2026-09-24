import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter,
  Globe,
  KeyRound,
  LogIn,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePagePermission } from "@/lib/require-permission";
import {
  AUDIT_CATEGORIES,
  actionsOfCategory,
  describeAudit,
  parseMetadata,
  type AuditCategory,
} from "@/lib/audit-display";

const PAGE_SIZE = 40;
const TIME_ZONE = "Africa/Dakar";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  GERANT: "Gerant",
  CAISSIER: "Caissier",
  MAGASINIER: "Magasinier",
  COMPTABLE: "Comptable",
  VENDEUR: "Vendeur",
  CLIENT: "Client",
};

const EVENT_LABELS: Record<string, string> = {
  LOGIN_FAILED: "Connexion echouee",
  LOGIN_BLOCKED: "Connexion bloquee",
};

const dayKey = new Intl.DateTimeFormat("fr-CA", { timeZone: TIME_ZONE }); // AAAA-MM-JJ
const dayTitle = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, dateStyle: "short", timeStyle: "medium" });

function relative(date: Date, now: Date) {
  const s = Math.round((now.getTime() - date.getTime()) / 1000);
  if (s < 60) return "a l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "hier" : `il y a ${d} jours`;
}

function dayLabel(date: Date, now: Date) {
  const key = dayKey.format(date);
  if (key === dayKey.format(now)) return "Aujourd'hui";
  if (key === dayKey.format(new Date(now.getTime() - 86400000))) return "Hier";
  const label = dayTitle.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

/** Nom lisible (reference, nom...) de chaque element cite dans les entrees affichees. */
async function resolveNames(logs: { action: string; entity: string; entityId: string | null; metadata: string | null }[]) {
  const ids: Record<string, Set<string>> = {};
  const add = (entity: string, id: unknown) => {
    if (typeof id !== "string" || !id) return;
    (ids[entity] ??= new Set()).add(id);
  };
  for (const log of logs) {
    add(log.entity, log.entityId);
    if (log.action === "STOCK_ADJUST") {
      const meta = parseMetadata(log.metadata);
      add("Product", meta?.productId);
      add("Store", meta?.storeId);
    }
  }
  const list = (e: string) => [...(ids[e] ?? [])];
  const byRef = { select: { id: true, reference: true } } as const;
  const byName = { select: { id: true, name: true } } as const;

  const [sales, invoices, debits, orders, supplierOrders, debts, customers, suppliers, products, categories, stores, users, sessions] =
    await Promise.all([
      prisma.sale.findMany({ where: { id: { in: list("Sale") } }, ...byRef }),
      prisma.invoice.findMany({ where: { id: { in: list("Invoice") } }, ...byRef }),
      prisma.debit.findMany({ where: { id: { in: list("Debit") } }, ...byRef }),
      prisma.ecommerceOrder.findMany({ where: { id: { in: list("EcommerceOrder") } }, ...byRef }),
      prisma.supplierOrder.findMany({ where: { id: { in: list("SupplierOrder") } }, ...byRef }),
      prisma.customerDebt.findMany({ where: { id: { in: list("CustomerDebt") } }, ...byRef }),
      prisma.customer.findMany({ where: { id: { in: list("Customer") } }, ...byName }),
      prisma.supplier.findMany({ where: { id: { in: list("Supplier") } }, ...byName }),
      prisma.product.findMany({ where: { id: { in: list("Product") } }, ...byName }),
      prisma.category.findMany({ where: { id: { in: list("Category") } }, ...byName }),
      prisma.store.findMany({ where: { id: { in: list("Store") } }, ...byName }),
      prisma.user.findMany({ where: { id: { in: list("User") } }, ...byName }),
      prisma.cashSession.findMany({ where: { id: { in: list("CashSession") } }, select: { id: true, cashRegister: { select: { name: true } } } }),
    ]);

  const names = new Map<string, string>();
  const put = (entity: string, rows: { id: string; reference?: string; name?: string }[]) =>
    rows.forEach((r) => names.set(`${entity}:${r.id}`, r.reference ?? r.name ?? r.id));
  put("Sale", sales);
  put("Invoice", invoices);
  put("Debit", debits);
  put("EcommerceOrder", orders);
  put("SupplierOrder", supplierOrders);
  put("CustomerDebt", debts);
  put("Customer", customers);
  put("Supplier", suppliers);
  put("Product", products);
  put("Category", categories);
  put("Store", stores);
  put("User", users);
  sessions.forEach((s) => names.set(`CashSession:${s.id}`, s.cashRegister.name));
  return names;
}

export default async function SecuritePage({
  searchParams,
}: {
  searchParams: Promise<{ utilisateur?: string; type?: string; du?: string; au?: string; page?: string }>;
}) {
  await requirePagePermission("security.view");
  const params = await searchParams;
  const type = params.type && params.type in AUDIT_CATEGORIES ? (params.type as AuditCategory) : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const now = new Date();
  const since24h = new Date(now.getTime() - 86400000);

  const createdAt: Prisma.DateTimeFilter = {};
  if (params.du) createdAt.gte = new Date(`${params.du}T00:00:00Z`); // Dakar = UTC toute l'annee
  if (params.au) createdAt.lte = new Date(`${params.au}T23:59:59.999Z`);
  const where: Prisma.AuditLogWhereInput = {
    ...(params.utilisateur ? { userId: params.utilisateur } : {}),
    ...(type ? { action: { in: actionsOfCategory(type) } } : {}),
    ...(params.du || params.au ? { createdAt } : {}),
  };
  const filtered = !!(params.utilisateur || type || params.du || params.au);

  const [logs, total, securityEvents, lockedUsers, staff, stats] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, role: true, reference: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.user.findMany({ where: { lockedUntil: { gt: now } } }),
    prisma.user.findMany({ where: { role: { not: "CLIENT" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: since24h }, action: { notIn: ["LOGIN", "LOGOUT"] } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: since24h }, action: "LOGIN" } }),
      prisma.auditLog.count({ where: { createdAt: { gte: since24h }, action: "ACCESS_DENIED" } }),
      prisma.securityEvent.count({ where: { createdAt: { gte: since24h } } }),
    ]),
  ]);
  const [actions24h, logins24h, denied24h, failed24h] = stats;
  const names = await resolveNames(logs);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Regroupement par jour (heure de Dakar).
  const days: { label: string; logs: typeof logs }[] = [];
  for (const log of logs) {
    const label = dayLabel(log.createdAt, now);
    if (days.at(-1)?.label !== label) days.push({ label, logs: [] });
    days.at(-1)!.logs.push(log);
  }

  const pageHref = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/erp/securite${s ? `?${s}` : ""}`;
  };

  const kpis = [
    { label: "Actions (24 h)", value: actions24h, icon: Activity, tone: "bg-brand-green-100 text-brand-green-700" },
    { label: "Connexions (24 h)", value: logins24h, icon: LogIn, tone: "bg-slate-100 text-slate-700" },
    { label: "Acces refuses (24 h)", value: denied24h, icon: ShieldAlert, tone: denied24h > 0 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-500" },
    { label: "Echecs de connexion (24 h)", value: failed24h, icon: KeyRound, tone: failed24h > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500" },
  ];

  return (
    <div className="space-y-6">
      {/* ---------- En-tete ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-brand-green-900">
            <ShieldCheck className="h-7 w-7 text-brand-gold-600" aria-hidden />
            Centre de securite
          </h1>
          <p className="mt-1 text-sm text-gray-500">Qui a fait quoi, et quand. Chaque action du personnel est enregistree.</p>
        </div>
        <Link
          href="/erp/securite/2fa"
          className="inline-flex items-center gap-2 rounded-xl border border-brand-green-100 bg-white px-4 py-2 text-sm font-semibold text-brand-green-800 shadow-sm transition hover:border-brand-gold-400"
        >
          <Lock className="h-4 w-4" aria-hidden />
          Securiser mon compte (2FA)
        </Link>
      </div>

      {/* ---------- Indicateurs ---------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.tone}`}>
              <k.icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold leading-none text-brand-green-900">{k.value}</p>
              <p className="mt-1 truncate text-xs text-gray-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {lockedUsers.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <UserX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
          <div>
            <p className="text-sm font-bold text-red-800">
              {lockedUsers.length} compte(s) verrouille(s) : 20 echecs de connexion, attaque probable
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-red-700">
              {lockedUsers.map((u) => (
                <li key={u.id}>
                  {u.name} ({u.email}) — jusqu&apos;a {u.lockedUntil ? timeFmt.format(u.lockedUntil) : "?"}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ---------- Journal d'activite ---------- */}
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-brand-green-900">Journal d&apos;activite</h2>
            <form className="mt-3 flex flex-wrap items-center gap-2">
              <select name="utilisateur" defaultValue={params.utilisateur ?? ""} aria-label="Utilisateur" className="min-w-0 flex-1 basis-44 rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tous les utilisateurs</option>
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <select name="type" defaultValue={type ?? ""} aria-label="Type d'action" className="min-w-0 flex-1 basis-44 rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tous les types d&apos;action</option>
                {Object.entries(AUDIT_CATEGORIES).map(([key, c]) => (
                  <option key={key} value={key}>{c.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                Du
                <input type="date" name="du" defaultValue={params.du} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800" />
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                au
                <input type="date" name="au" defaultValue={params.au} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800" />
              </label>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
                  <Filter className="h-4 w-4" aria-hidden />
                  Filtrer
                </button>
                {filtered && (
                  <Link href="/erp/securite" title="Effacer les filtres" className="inline-flex items-center rounded-lg border border-gray-300 px-2.5 text-gray-600 hover:bg-gray-50">
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  </Link>
                )}
              </div>
            </form>
            <p className="mt-2 text-xs text-gray-400">
              {total} action{total > 1 ? "s" : ""} {filtered ? "correspondant aux filtres" : "enregistree" + (total > 1 ? "s" : "")} · heures de Dakar
            </p>
          </div>

          {days.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-400">Aucune action pour ces criteres.</p>
          ) : (
            <div className="p-4 sm:p-5">
              {days.map((day) => (
                <div key={day.label} className="mb-6 last:mb-0">
                  <h3 className="sticky top-0 z-10 mb-3 bg-white/95 py-1 text-xs font-bold uppercase tracking-wider text-gray-400 backdrop-blur">
                    {day.label}
                  </h3>
                  <ol className="relative space-y-1 border-l-2 border-gray-100 pl-5">
                    {day.logs.map((log) => {
                      const d = describeAudit(log, names);
                      const cat = AUDIT_CATEGORIES[d.category];
                      return (
                        <li key={log.id} className="relative rounded-xl px-3 py-2.5 transition hover:bg-gray-50">
                          <span aria-hidden className={`absolute -left-[27px] top-4 h-3 w-3 rounded-full ring-4 ring-white ${cat.dot}`} />
                          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                            <time
                              dateTime={log.createdAt.toISOString()}
                              title={dateTimeFmt.format(log.createdAt)}
                              className="w-16 shrink-0 pt-0.5 font-mono text-xs font-semibold text-gray-500"
                            >
                              {timeFmt.format(log.createdAt)}
                            </time>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-relaxed text-gray-700">
                                {log.user ? (
                                  <>
                                    <span className="mr-1.5 inline-flex h-6 w-6 translate-y-[-1px] items-center justify-center rounded-full bg-brand-green-700 align-middle text-[10px] font-bold text-white">
                                      {initials(log.user.name)}
                                    </span>
                                    <span className="font-bold text-brand-green-900">{log.user.name}</span>
                                    <span className="text-gray-400"> ({ROLE_LABELS[log.user.role] ?? log.user.role})</span>
                                  </>
                                ) : (
                                  <span className="font-bold text-gray-600">Client sans compte</span>
                                )}{" "}
                                {d.verb}
                                {d.object && (
                                  <>
                                    {" "}
                                    {d.object.label}{" "}
                                    {d.object.name &&
                                      (d.object.href ? (
                                        <Link href={d.object.href} className="font-semibold text-brand-green-700 underline decoration-brand-green-100 underline-offset-2 hover:text-brand-gold-600">
                                          {d.object.name}
                                        </Link>
                                      ) : (
                                        <span className="font-semibold text-gray-800">{d.object.name}</span>
                                      ))}
                                  </>
                                )}
                              </p>
                              {(d.details.length > 0 || log.ipAddress) && (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {d.details.map((detail) => (
                                    <span key={detail.label} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                      <span className="text-gray-400">{detail.label} :</span> {detail.value}
                                    </span>
                                  ))}
                                  {log.ipAddress && log.ipAddress !== "unknown" && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-500">
                                      <Globe className="h-3 w-3" aria-hidden />
                                      {log.ipAddress}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${cat.badge}`}>{cat.label}</span>
                              <span className="text-[11px] text-gray-400">{relative(log.createdAt, now)}</span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <nav className="flex items-center justify-between border-t border-gray-100 p-4 text-sm" aria-label="Pagination">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="inline-flex items-center gap-1 font-semibold text-brand-green-700 hover:text-brand-gold-600">
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Plus recentes
                </Link>
              ) : <span />}
              <span className="text-gray-500">Page {page} / {pageCount}</span>
              {page < pageCount ? (
                <Link href={pageHref(page + 1)} className="inline-flex items-center gap-1 font-semibold text-brand-green-700 hover:text-brand-gold-600">
                  Plus anciennes <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : <span />}
            </nav>
          )}
        </section>

        {/* ---------- Tentatives de connexion ---------- */}
        <aside className="order-first min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm 2xl:order-none">
          <div className="border-b border-gray-100 p-4">
            <h2 className="flex items-center gap-2 font-bold text-brand-green-900">
              <KeyRound className="h-5 w-5 text-red-500" aria-hidden />
              Tentatives de connexion suspectes
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">Mots de passe errones, codes 2FA invalides, blocages.</p>
          </div>
          {securityEvents.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">Aucune tentative suspecte.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto 2xl:max-h-none">
              {securityEvents.map((e) => (
                <li key={e.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${e.type === "LOGIN_BLOCKED" ? "bg-red-600 text-white" : "bg-red-50 text-red-700"}`}>
                      {EVENT_LABELS[e.type] ?? e.type}
                    </span>
                    <time dateTime={e.createdAt.toISOString()} className="font-mono text-[11px] text-gray-400" title={dateTimeFmt.format(e.createdAt)}>
                      {dateTimeFmt.format(e.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-gray-800">{e.email ?? "Email inconnu"}</p>
                  {e.detail && <p className="text-xs text-gray-500">{e.detail}</p>}
                  {e.ipAddress && e.ipAddress !== "unknown" && <p className="mt-0.5 font-mono text-[11px] text-gray-400">IP {e.ipAddress}</p>}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
