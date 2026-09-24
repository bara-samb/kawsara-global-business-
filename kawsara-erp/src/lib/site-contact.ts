// Coordonnees officielles de la boutique : une seule source pour tout le site
// (boutons WhatsApp, page contact), afin d'eviter deux numeros differents.
export const CONTACT_PHONE_DISPLAY = "+221 77 743 29 49";
export const CONTACT_EMAIL = "kawsaraglobalbusiness@gmail.com";
export const CONTACT_ADDRESS = "Touba, Senegal";

// Identifiants legaux (identiques a ceux imprimes sur les factures).
export const COMPANY_RCCM = "SN.DBL.2024.A.3.963";
export const COMPANY_NINEA = "011.539.064";

const WHATSAPP_NUMBER = "221777432949";

export const CONTACT_PHONE_HREF = `tel:+${WHATSAPP_NUMBER}`;
export const CONTACT_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Kawsara Global Business, ${CONTACT_ADDRESS}`)}`;

export function whatsappUrl(message?: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
