import Link from "next/link";
import Image from "next/image";
import { User, Mail, Phone, MapPin, Lock, UserPlus, AlertCircle, LogIn, ArrowLeft } from "lucide-react";
import { registerCustomer } from "@/lib/actions/auth-register";
import { CaptchaField } from "@/components/site/captcha-field";

function FieldIcon({ icon: Icon }: { icon: typeof User }) {
  return <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />;
}

const INPUT_CLASS =
  "w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm transition focus:border-brand-green-600 focus:outline-none focus:ring-2 focus:ring-brand-green-100";

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-green-50 px-4 py-12">
      <div className="animate-scale-in w-full max-w-md rounded-2xl border border-brand-green-100 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center">
          <Image src="/logo-kawsara.jpg" alt="Kawsara Global Business" width={64} height={64} />
          <h1 className="mt-4 text-lg font-bold text-brand-green-900">Creer un compte client</h1>
          <p className="text-sm text-gray-500">Pour commander sur la boutique en ligne</p>
        </div>

        {erreur === "email" && (
          <p className="animate-fade-in mt-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Un compte existe deja avec cet email.
          </p>
        )}
        {erreur === "captcha" && (
          <p className="animate-fade-in mt-4 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Reponse de verification incorrecte ou expiree, veuillez reessayer.
          </p>
        )}

        <form action={registerCustomer} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-brand-green-900" htmlFor="name">Nom complet</label>
            <div className="relative mt-1">
              <FieldIcon icon={User} />
              <input id="name" name="name" required className={INPUT_CLASS} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900" htmlFor="email">Email</label>
            <div className="relative mt-1">
              <FieldIcon icon={Mail} />
              <input id="email" name="email" type="email" required className={INPUT_CLASS} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900" htmlFor="phone">Telephone</label>
            <div className="relative mt-1">
              <FieldIcon icon={Phone} />
              <input id="phone" name="phone" className={INPUT_CLASS} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900" htmlFor="address">Adresse</label>
            <div className="relative mt-1">
              <FieldIcon icon={MapPin} />
              <input id="address" name="address" className={INPUT_CLASS} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-green-900" htmlFor="password">Mot de passe</label>
            <div className="relative mt-1">
              <FieldIcon icon={Lock} />
              <input id="password" name="password" type="password" required minLength={8} className={INPUT_CLASS} />
            </div>
          </div>
          <CaptchaField />
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-green-700 px-4 py-2 font-semibold text-white transition hover:bg-brand-green-800 active:scale-95"
          >
            <UserPlus className="h-4 w-4" />
            Creer mon compte
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-sm">
          <LogIn className="h-4 w-4 text-brand-green-700" />
          Deja un compte ? <Link href="/connexion" className="font-semibold text-brand-green-700 hover:text-brand-gold-600">Se connecter</Link>
        </p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-sm">
          <ArrowLeft className="h-4 w-4 text-brand-green-700" />
          <Link href="/" className="text-brand-green-700 hover:text-brand-gold-600">Retour a la boutique</Link>
        </p>
      </div>
    </main>
  );
}
