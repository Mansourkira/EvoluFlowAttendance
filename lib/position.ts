export type PositionResult =
  | { ok: true; latitude: number; longitude: number; accuracy: number }
  | { ok: false; message: string };

/** Position GPS précise, avec un message clair pour chaque refus. HTTPS obligatoire. */
export function getPosition(): Promise<PositionResult> {
  if (typeof window === "undefined" || !window.isSecureContext) {
    return Promise.resolve({ ok: false, message: "La localisation exige une connexion sécurisée (https)." });
  }
  if (!("geolocation" in navigator)) {
    return Promise.resolve({ ok: false, message: "Cette tablette ne permet pas la localisation." });
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        resolve({
          ok: false,
          message:
            err.code === err.PERMISSION_DENIED
              ? "Localisation refusée. Autorisez la position pour ce site dans le navigateur, puis réessayez."
              : err.code === err.TIMEOUT
                ? "La position met trop de temps à arriver. Réessayez."
                : "Position introuvable. Activez la localisation (GPS) de la tablette et réessayez.",
        }),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    );
  });
}
