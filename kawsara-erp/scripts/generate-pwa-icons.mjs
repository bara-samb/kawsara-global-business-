// Genere les icones PWA a partir du logo existant. A relancer si le logo change.
// Usage : node scripts/generate-pwa-icons.mjs
import sharp from "sharp";
import fs from "node:fs";

const SRC = "public/logo-kawsara.jpg";
const OUT_DIR = "public/icons";
fs.mkdirSync(OUT_DIR, { recursive: true });

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function squareIcon(size, filename, padding = 0.08) {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: WHITE })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 3, background: WHITE },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(`${OUT_DIR}/${filename}`);

  console.log(`Cree : ${OUT_DIR}/${filename}`);
}

await squareIcon(192, "icon-192.png");
await squareIcon(512, "icon-512.png");
// Icone "maskable" : marge de securite plus large pour survivre au masquage circulaire/rond
// applique par certains launchers Android.
await squareIcon(512, "icon-maskable-512.png", 0.2);
await squareIcon(180, "apple-touch-icon.png");

console.log("Icones PWA generees.");
