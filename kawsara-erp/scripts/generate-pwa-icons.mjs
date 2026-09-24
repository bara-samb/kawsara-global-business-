// Genere, a partir du logo original, toutes les declinaisons utilisees par le site.
// A relancer si le logo change. Usage : node scripts/generate-pwa-icons.mjs
//
// Le fichier d'origine (public/logo-kawsara.jpg) contient de grandes marges blanches : affiche
// en petit, l'embleme devenait minuscule et flou. On produit donc :
//  - public/brand/logo-mark.png  : l'embleme seul, recadre, fond transparent (petits formats) ;
//  - public/brand/logo-full.png  : embleme + nom, recadre, fond transparent (connexion, factures) ;
//  - public/icons/*.png + src/app/favicon.ico : icones construites a partir de l'embleme.
import sharp from "sharp";
import fs from "node:fs";

const SRC = "public/logo-kawsara.jpg";
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
fs.mkdirSync("public/brand", { recursive: true });
fs.mkdirSync("public/icons", { recursive: true });

const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;
const isInk = (x, y) => {
  const i = (y * width + x) * 3;
  return Math.min(data[i], data[i + 1], data[i + 2]) < 225;
};

function bbox(y0, y1) {
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < width; x++) {
      if (!isInk(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// L'embleme est separe du texte par une bande de lignes vides : on la cherche.
const rowHasInk = Array.from({ length: height }, (_, y) => {
  for (let x = 0; x < width; x++) if (isInk(x, y)) return true;
  return false;
});
const firstInk = rowHasInk.indexOf(true);
let gapStart = -1;
for (let y = firstInk, run = 0; y < height; y++) {
  run = rowHasInk[y] ? 0 : run + 1;
  if (run === 12) { gapStart = y - 11; break; }
}
if (gapStart < 0) throw new Error("Impossible de separer l'embleme du texte dans le logo.");

const markBox = bbox(0, gapStart);
const fullBox = bbox(0, height);

// Blanc -> transparent, sans halo : chaque pixel est "de-multiplie" par rapport au blanc.
async function whiteToAlpha(box, margin) {
  const ext = {
    left: Math.max(0, box.left - margin),
    top: Math.max(0, box.top - margin),
    width: Math.min(width - Math.max(0, box.left - margin), box.width + margin * 2),
    height: Math.min(height - Math.max(0, box.top - margin), box.height + margin * 2),
  };
  const { data: px, info: i } = await sharp(SRC).extract(ext).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(i.width * i.height * 4);
  for (let p = 0; p < i.width * i.height; p++) {
    const [r, g, b] = [px[p * 3], px[p * 3 + 1], px[p * 3 + 2]];
    let a = Math.max(255 - r, 255 - g, 255 - b) / 255;
    if (a < 0.08) a = 0; // bruit JPEG autour du logo
    const un = (c) => (a === 0 ? 0 : Math.round(Math.min(255, Math.max(0, (c - 255 * (1 - a)) / a))));
    out.set([un(r), un(g), un(b), Math.round(a * 255)], p * 4);
  }
  return sharp(out, { raw: { width: i.width, height: i.height, channels: 4 } }).png();
}

const mark = await (await whiteToAlpha(markBox, 6)).toBuffer();
await sharp(mark).toFile("public/brand/logo-mark.png");
await (await whiteToAlpha(fullBox, 10)).toFile("public/brand/logo-full.png");
console.log(`Cree : public/brand/logo-mark.png et logo-full.png (embleme ${markBox.width}x${markBox.height})`);

async function squareIcon(size, padding) {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await sharp(mark).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: logo, gravity: "center" }])
    .png();
}

await (await squareIcon(192, 0.1)).toFile("public/icons/icon-192.png");
await (await squareIcon(512, 0.1)).toFile("public/icons/icon-512.png");
// Icone "maskable" : marge plus large pour survivre au masquage rond de certains launchers Android.
await (await squareIcon(512, 0.2)).toFile("public/icons/icon-maskable-512.png");
await (await squareIcon(180, 0.1)).toFile("public/icons/apple-touch-icon.png");

// favicon.ico : format ICO contenant des images PNG (32 et 48 px), lu par tous les navigateurs.
const icoImages = await Promise.all([32, 48].map(async (s) => ({ size: s, png: await (await squareIcon(s, 0.04)).toBuffer() })));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoImages.length, 4);
let offset = 6 + 16 * icoImages.length;
const entries = icoImages.map(({ size, png }) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(size, 0);
  e.writeUInt8(size, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
fs.writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...entries, ...icoImages.map((i) => i.png)]));

console.log("Icones et favicon generes a partir de l'embleme.");
