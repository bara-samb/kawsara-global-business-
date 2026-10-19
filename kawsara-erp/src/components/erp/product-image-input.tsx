"use client";

import { useEffect, useState, type ChangeEvent } from "react";

// Une photo de telephone pese 2 a 6 Mo : bien au-dela de ce qu'une Server Action accepte
// (limite de next.config.ts, et 4,5 Mo maximum par requete sur Vercel). L'image est donc
// redimensionnee et recompressee dans le navigateur avant l'envoi.
const MAX_DIMENSION = 1600;
const QUALITY = 0.85;

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponible");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
  // Certains navigateurs ne savent pas encoder en WebP : ils renvoient du PNG, plus lourd.
  const output =
    blob && blob.type === "image/webp"
      ? blob
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!output) throw new Error("Compression impossible");

  // On garde l'original s'il est deja plus leger (petite image deja optimisee).
  if (output.size >= file.size) return file;
  const extension = output.type === "image/webp" ? ".webp" : ".jpg";
  const name = file.name.replace(/\.[^.]+$/, "") + extension;
  return new File([output], name, { type: output.type });
}

export function ProductImageInput({ name = "image" }: { name?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setPreview(null);
    setStatus(null);
    if (!file) return;

    let finalFile = file;
    try {
      setStatus("Optimisation de la photo...");
      finalFile = await compressImage(file);
      const transfer = new DataTransfer();
      transfer.items.add(finalFile);
      input.files = transfer.files;
    } catch {
      // Navigateur trop ancien : l'original est envoye, le serveur verifie la taille.
    }
    setPreview(URL.createObjectURL(finalFile));
    setStatus(`Photo prete (${(finalFile.size / 1024 / 1024).toFixed(2)} Mo).`);
  }

  return (
    <div>
      <input
        id="product-image"
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <p className="mt-1 text-xs text-gray-500">
        Formats acceptes : JPG, PNG ou WebP. Les photos du telephone sont automatiquement optimisees.
      </p>
      {status && <p className="mt-1 text-xs text-brand-green-700">{status}</p>}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element -- apercu local (blob:), pas d'optimisation possible
        <img src={preview} alt="Apercu de la photo" className="mt-2 h-32 w-32 rounded-md border border-gray-200 object-contain" />
      )}
    </div>
  );
}
