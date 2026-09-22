import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { otpAuthUri } from "@/lib/totp";
import { generateTwoFactorSecret, confirmTwoFactor, disableTwoFactor } from "@/lib/actions/two-factor";

export default async function TwoFactorPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({ where: { id: session!.user.id } });
  if (!user) return null;

  let qrDataUrl: string | null = null;
  let uri: string | null = null;
  if (user.twoFactorSecret && !user.twoFactorEnabled) {
    uri = otpAuthUri(user.twoFactorSecret, user.email);
    qrDataUrl = await QRCode.toDataURL(uri);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-brand-green-900">Double authentification (2FA)</h1>
      <p className="mt-1 text-sm text-gray-500">
        Protegez votre compte avec un code a usage unique genere par une application comme
        Google Authenticator, Microsoft Authenticator ou Authy.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
        {user.twoFactorEnabled ? (
          <>
            <p className="text-sm font-semibold text-brand-green-700">✓ La double authentification est active sur ce compte.</p>
            <form action={disableTwoFactor} className="mt-4">
              <button className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                Desactiver la 2FA
              </button>
            </form>
          </>
        ) : user.twoFactorSecret ? (
          <>
            <p className="text-sm text-gray-600">
              1. Scannez ce QR code avec votre application d&apos;authentification, ou saisissez
              la cle manuellement.
            </p>
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR code 2FA" width={200} height={200} className="mt-4" />
            )}
            <p className="mt-3 break-all rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
              {user.twoFactorSecret}
            </p>
            <form action={confirmTwoFactor} className="mt-4 flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-brand-green-900">2. Entrez le code affiche</label>
                <input name="code" required inputMode="numeric" placeholder="123456" className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
                Activer
              </button>
            </form>
          </>
        ) : (
          <form action={generateTwoFactorSecret}>
            <button className="rounded-md bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-800">
              Configurer la 2FA
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
