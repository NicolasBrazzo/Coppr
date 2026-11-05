// Unico punto che spedisce email. Per collegare Resend si cambia solo questo file.
// Regola: qui si possono loggare i link solo in sviluppo; mai password, token o cookie.

type EmailLink = { to: string; url: string };

const isProd = process.env.NODE_ENV === "production";

function deliver(subject: string, { to, url }: EmailLink) {
  if (!isProd) {
    console.log(`[email] ${subject} → ${to}\n        ${url}`);
    return Promise.resolve();
  }
  // Nessun servizio email ancora configurato: niente link nei log di produzione
  console.warn(`[email] servizio email non configurato, "${subject}" non inviata`);
  return Promise.resolve();
}

export function sendVerificationEmail(link: EmailLink) {
  return deliver("Verifica il tuo indirizzo email", link);
}

export function sendPasswordResetEmail(link: EmailLink) {
  return deliver("Reimposta la password", link);
}
