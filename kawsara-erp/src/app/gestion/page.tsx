import { redirect } from "next/navigation";

// Ancienne URL de la page de connexion : conservee pour ne pas casser les liens partages.
export default async function GestionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  redirect(query ? `/connexion?${query}` : "/connexion");
}
