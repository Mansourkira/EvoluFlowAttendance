import { getDeviceKey } from "./device";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");

export type SeanceCard = {
  titre: string;
  module: string | null;
  salle: string | null;
  site: string | null;
  date: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  siteLocalise: boolean;
  rayonM: number;
};

export type ResolveResponse =
  | {
      ticket: string | null;
      seance: SeanceCard;
      etat: "ASSOCIE" | "HORS_SEANCE";
      moi: { nomPrenom: string; presence: boolean | null; heure: string | null; retardMinutes: number | null };
    }
  | {
      ticket: string | null;
      seance: SeanceCard;
      etat: "NON_ASSOCIE" | "EN_ATTENTE";
      demande: { nomPrenom: string } | null;
      etudiants: Array<{ reference: string; nomPrenom: string; dejaAssocie: boolean }>;
    };

export type MarkResponse = { etat: "PRESENT" | "DEJA_PRESENT"; heure: string | null; retardMinutes: number | null };

/** Erreur API avec le code métier renvoyé par le serveur (QR_EXPIRED, OUT_OF_RANGE…). */
export class ApiError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
}

/** Preuve de passage : le code du QR au premier appel, puis le laissez-passer de la tablette. */
export type Proof = { code: string } | { ticket: string };

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_ROOT}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Device-Key": getDeviceKey().key },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Connexion impossible. Vérifiez la connexion internet de votre téléphone.", "NETWORK", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error || "Erreur inattendue, réessayez.", String(data?.code || "SERVER"), res.status);
  }
  return data as T;
}

export const resolvePresence = (proof: Proof) => post<ResolveResponse>("/public/presence/resolve", proof);

export const requestPairing = (proof: Proof, candidatRef: string) =>
  post<{ etat: "EN_ATTENTE"; demande: { nomPrenom: string } }>("/public/presence/pair", { ...proof, candidatRef });

export const markPresence = (
  proof: Proof,
  position: { latitude: number; longitude: number; accuracy: number }
) => post<MarkResponse>("/public/presence/mark", { ...proof, ...position });
