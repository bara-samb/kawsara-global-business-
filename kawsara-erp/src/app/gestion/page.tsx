import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import type { Metadata } from "next";
import { Mail, Lock, ShieldCheck, LogIn, AlertCircle, CheckCircle2 } from "lucide-react";
import { auth, signIn } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { CaptchaField } from "@/components/site/captcha-field";

async function authenticate(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "") || "/erp";

  const captchaOk = verifyCaptcha(
    String(formData.get("captchaA") ?? ""),
    String(formData.get("captchaB") ?? ""),
    String(formData.get("captchaExpires") ?? ""),
    String(formData.get("captchaToken") ?? ""),
    String(formData.get("captchaAnswer") ?? "")
  );
  if (!captchaOk) {
    redirect(`/gestion?erreur=captcha&callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      code,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const code = error instanceof CredentialsSignin ? error.code : "1";
      redirect(`/gestion?erreur=${code}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  "1": "Email ou mot de passe incorrect.",
  CredentialsSignin: "Email ou mot de passe incorrect.",
  "2fa_required": "Ce compte est protege par une double authentification : renseignez le code de votre application d'authentification.",
  "2fa_invalid": "Code de double authentification incorrect.",
  captcha: "Reponse de verification incorrecte ou expiree, veuillez reessayer.",
};

// Page de connexion du PERSONNEL uniquement : aucun lien depuis la boutique, et non indexee
// par les moteurs de recherche. Les clients commandent sans compte.
export const metadata: Metadata = {
  title: "Espace gestion - Kawsara",
  robots: { index: false, follow: false },
};

export default async function GestionLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; callbackUrl?: string; deconnecte?: string }>;
}) {
  const { erreur, callbackUrl, deconnecte } = await searchParams;
  const session = await auth();
  if (session?.user && session.user.role !== "CLIENT") redirect("/erp");

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-green-50 px-4 py-12">
      <div className="animate-scale-in w-full max-w-sm rounded-2xl border border-brand-green-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center">
          <Image src="/brand/logo-full.png" alt="Kawsara Global Business" width={590} height={497} className="h-auto w-44" priority />
          <h1 className="mt-4 text-lg font-bold text-brand-green-900">Espace gestion</h1>
          <p className="text-sm text-gray-500">Acces reserve au personnel Kawsara</p>
        </div>

        {erreur && (
          <p className="animate-fade-in mt-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {ERROR_MESSAGES[erreur] ?? ERROR_MESSAGES["1"]}
          </p>
        )}
        {!erreur && deconnecte && (
          <p className="animate-fade-in mt-4 flex items-start gap-2 rounded-md bg-brand-green-50 px-3 py-2 text-sm text-brand-green-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Vous avez bien ete deconnecte.
          </p>
        )}

        <form action={authenticate} className="mt-6 space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
          <div>
            <label className="text-sm font-medium text-brand-green-900" htmlFor="email">
              Email
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm transition focus:border-brand-green-600 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900" htmlFor="password">
              Mot de passe
            </label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm transition focus:border-brand-green-600 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900" htmlFor="code">
              Code de double authentification (si activee)
            </label>
            <div className="relative mt-1">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm transition focus:border-brand-green-600 focus:outline-none focus:ring-2 focus:ring-brand-green-100"
              />
            </div>
          </div>
          <CaptchaField />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-green-700 px-4 py-2 font-semibold text-white transition hover:bg-brand-green-800 active:scale-95"
          >
            <LogIn className="h-4 w-4" />
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}
