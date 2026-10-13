/**
 * Clé secrète de la tablette : générée une fois, gardée dans le navigateur, envoyée en en-tête X-Device-Key.
 * Le serveur n'en stocke que l'empreinte ; c'est elle que le professeur associe au candidat.
 */
const STORAGE_KEY = "evoluflow.attendance.deviceKey";

let memoryKey: string | null = null;

function randomKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** { key, persisted } : persisted = false si le navigateur bloque le stockage (navigation privée). */
export function getDeviceKey(): { key: string; persisted: boolean } {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && /^[A-Za-z0-9_-]{32,128}$/.test(existing)) return { key: existing, persisted: true };
    const key = randomKey();
    localStorage.setItem(STORAGE_KEY, key);
    return { key, persisted: localStorage.getItem(STORAGE_KEY) === key };
  } catch {
    if (!memoryKey) memoryKey = randomKey();
    return { key: memoryKey, persisted: false };
  }
}
