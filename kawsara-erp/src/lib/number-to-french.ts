const UNITS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
];

function underHundred(value: number): string {
  if (value < 17) return UNITS[value];
  if (value < 20) return `dix-${UNITS[value - 10]}`;

  const tens = Math.floor(value / 10);
  const units = value % 10;
  const tensWords = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

  if (tens < 7) {
    if (units === 0) return tensWords[tens];
    if (units === 1) return `${tensWords[tens]} et un`;
    return `${tensWords[tens]}-${UNITS[units]}`;
  }
  if (tens === 7) return units === 1 ? "soixante et onze" : `soixante-${underHundred(10 + units)}`;
  if (tens === 8) return units === 0 ? "quatre-vingts" : `quatre-vingt-${UNITS[units]}`;
  return units === 0 ? "quatre-vingt-dix" : `quatre-vingt-${underHundred(10 + units)}`;
}

function underThousand(value: number): string {
  if (value < 100) return underHundred(value);
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const prefix = hundreds === 1 ? "cent" : `${UNITS[hundreds]} cent`;
  if (remainder === 0) return hundreds > 1 ? `${prefix}s` : prefix;
  return `${prefix} ${underHundred(remainder)}`;
}

export function numberToFrench(value: number): string {
  const amount = Math.max(0, Math.floor(value));
  if (amount < 1000) return underThousand(amount);
  if (amount < 1_000_000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    const thousandsWords = thousands === 1 ? "mille" : `${underThousand(thousands)} mille`;
    if (remainder === 0) return thousandsWords;
    return `${thousandsWords} ${underThousand(remainder)}`;
  }

  if (amount < 1_000_000_000) {
    const millions = Math.floor(amount / 1_000_000);
    const remainder = amount % 1_000_000;
    const millionsWords = millions === 1 ? "un million" : `${numberToFrench(millions)} millions`;
    if (remainder === 0) return millionsWords;
    return `${millionsWords} ${numberToFrench(remainder)}`;
  }

  const billions = Math.floor(amount / 1_000_000_000);
  const remainder = amount % 1_000_000_000;
  const billionsWords = billions === 1 ? "un milliard" : `${numberToFrench(billions)} milliards`;
  if (remainder === 0) return billionsWords;
  return `${billionsWords} ${numberToFrench(remainder)}`;
}

export function amountToFrench(value: number): string {
  return `${numberToFrench(value)} francs CFA`;
}
