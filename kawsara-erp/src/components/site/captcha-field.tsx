import { createCaptcha } from "@/lib/captcha";

export function CaptchaField() {
  const { a, b, expires, token } = createCaptcha();
  return (
    <div>
      <label className="text-sm font-medium text-brand-green-900">
        Verification anti-robot : combien font {a} + {b} ?
      </label>
      <input type="hidden" name="captchaA" value={a} />
      <input type="hidden" name="captchaB" value={b} />
      <input type="hidden" name="captchaExpires" value={expires} />
      <input type="hidden" name="captchaToken" value={token} />
      <input
        name="captchaAnswer"
        required
        inputMode="numeric"
        autoComplete="off"
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
