import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createCategory, deleteCategory } from "@/lib/actions/categories";
import { ActionForm } from "@/components/action-form";
import { requirePagePermission } from "@/lib/require-permission";

export default async function CategoriesPage() {
  await requirePagePermission("category.read");
  const session = await auth();
  const role = session!.user.role;
  const isPrincipalAdmin = session!.user.isPrincipalAdmin;

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { parent: true, _count: { select: { products: true } } },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-brand-green-900">Categories</h1>

      {can(role, "category.create") && (
        <ActionForm action={createCategory} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <div>
            <label className="text-xs font-medium text-brand-green-900">Nom</label>
            <input name="name" required className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-brand-green-900">Sous-categorie de</label>
            <select name="parentId" className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">— Categorie principale —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
            Ajouter
          </button>
        </ActionForm>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Categorie parente</th>
              <th className="px-4 py-3">Produits</th>
              {can(role, "category.delete", isPrincipalAdmin) && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((c) => {
              const del = deleteCategory.bind(null, c.id);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-brand-green-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.parent?.name ?? "-"}</td>
                  <td className="px-4 py-3">{c._count.products}</td>
                  {can(role, "category.delete", isPrincipalAdmin) && (
                    <td className="px-4 py-3 text-right">
                      <ActionForm
                        action={del}
                        confirm={{
                          title: "Supprimer cette categorie ?",
                          message: `La categorie « ${c.name} » sera definitivement supprimee.`,
                          confirmLabel: "Oui, supprimer",
                        }}
                      >
                        <button className="text-xs font-medium text-red-600 hover:underline">Supprimer</button>
                      </ActionForm>
                    </td>
                  )}
                </tr>
              );
            })}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Aucune categorie.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
