"use client";

// Filet de securite si la mise en page racine elle-meme plante : remplace tout le document,
// d'ou les balises html/body et les styles en ligne (globals.css n'est pas charge ici).
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem", color: "#1f2937" }}>
        <title>Erreur - Kawsara</title>
        <h1 style={{ fontSize: "1.25rem", color: "#0f3d22" }}>Oups, quelque chose s&apos;est mal passe</h1>
        <p style={{ fontSize: "0.875rem", color: "#4b5563" }}>
          L&apos;application n&apos;a pas pu s&apos;afficher. Reessayez ; si le probleme persiste, contactez
          l&apos;administrateur.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Reference a communiquer : {error.digest}</p>
        )}
        <button
          onClick={() => retry()}
          style={{ marginTop: "1.5rem", padding: "0.5rem 1rem", background: "#1b6337", color: "#fff", border: 0, borderRadius: "0.375rem", cursor: "pointer" }}
        >
          Reessayer
        </button>
      </body>
    </html>
  );
}
