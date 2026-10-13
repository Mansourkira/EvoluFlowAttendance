"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  markPresence,
  requestPairing,
  resolvePresence,
  type MarkResponse,
  type Proof,
  type ResolveResponse,
  type SeanceCard,
} from "@/lib/api";
import { getDeviceKey } from "@/lib/device";
import { getPosition } from "@/lib/position";

/** Pendant l'attente de validation par le professeur. */
const PAIRING_POLL_MS = 3000;

type Failure = { message: string; code: string };

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

function SeanceHeader({ seance }: { seance: SeanceCard }) {
  const horaire = seance.heureDebut ? `${seance.heureDebut} – ${seance.heureFin ?? ""}` : null;
  return (
    <div className="card">
      <p className="seance-title">{seance.titre}</p>
      <p className="meta">{[formatDate(seance.date), horaire].filter(Boolean).join(" · ")}</p>
      <p className="meta">{[seance.salle, seance.site].filter(Boolean).join(" · ")}</p>
    </div>
  );
}

function Status({ tone, title, children }: { tone: "success" | "danger" | "warning" | "info"; title: string; children?: React.ReactNode }) {
  return (
    <div className={`status status-${tone}`} role={tone === "danger" ? "alert" : "status"}>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

const RESCAN_CODES = new Set(["QR_EXPIRED", "QR_INVALID"]);

export function PresenceFlow({ code }: { code: string }) {
  const [proof, setProof] = useState<Proof>({ code });
  const [data, setData] = useState<ResolveResponse | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<{ reference: string; nomPrenom: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [marked, setMarked] = useState<MarkResponse | null>(null);
  const [persisted, setPersisted] = useState(true);
  const proofRef = useRef(proof);
  proofRef.current = proof;

  const toFailure = (e: unknown): Failure =>
    e instanceof ApiError ? { message: e.message, code: e.code } : { message: "Erreur inattendue, réessayez.", code: "UNKNOWN" };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await resolvePresence(proofRef.current);
      // Après le premier scan, on continue avec le laissez-passer de la tablette (le QR change toutes les 30 s).
      if (res.ticket) setProof({ ticket: res.ticket });
      setData(res);
      setFailure(null);
    } catch (e) {
      setFailure(toFailure(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPersisted(getDeviceKey().persisted);
    void load();
  }, [load]);

  // En attente de validation : on interroge l'état jusqu'à la décision du professeur.
  const waiting = data?.etat === "EN_ATTENTE";
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(() => void load(true), PAIRING_POLL_MS);
    return () => window.clearInterval(id);
  }, [waiting, load]);

  const etudiants = data && (data.etat === "NON_ASSOCIE" || data.etat === "EN_ATTENTE") ? data.etudiants : [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? etudiants.filter((e) => e.nomPrenom.toLowerCase().includes(q)) : etudiants;
  }, [etudiants, search]);

  const confirmPairing = async () => {
    if (!chosen) return;
    setBusy(true);
    setActionError(null);
    try {
      await requestPairing(proofRef.current, chosen.reference);
      setChosen(null);
      await load(true);
    } catch (e) {
      const f = toFailure(e);
      if (RESCAN_CODES.has(f.code) || f.code === "CLOSED") setFailure(f);
      else setActionError(f.message);
    } finally {
      setBusy(false);
    }
  };

  const mark = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const pos = await getPosition();
      if (!pos.ok) {
        setActionError(pos.message);
        return;
      }
      setMarked(
        await markPresence(proofRef.current, { latitude: pos.latitude, longitude: pos.longitude, accuracy: pos.accuracy })
      );
    } catch (e) {
      const f = toFailure(e);
      if (RESCAN_CODES.has(f.code) || f.code === "CLOSED") setFailure(f);
      else setActionError(f.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data && !failure) {
    return (
      <div className="card center">
        <span className="spinner" aria-label="Chargement" />
      </div>
    );
  }

  if (failure) {
    return (
      <div className="stack">
        <Status tone={failure.code === "CLOSED" ? "warning" : "danger"} title={failure.message}>
          {RESCAN_CODES.has(failure.code) ? <p>Scannez à nouveau le QR affiché par le professeur.</p> : null}
        </Status>
        {failure.code === "NETWORK" || failure.code === "SERVER" || failure.code === "RATE_LIMITED" ? (
          <button className="btn btn-ghost" onClick={() => void load()}>
            Réessayer
          </button>
        ) : null}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="stack">
      <SeanceHeader seance={data.seance} />

      {!persisted ? (
        <Status tone="warning" title="Navigation privée détectée">
          <p>Votre tablette ne sera pas reconnue la prochaine fois. Ouvrez ce lien dans une fenêtre normale.</p>
        </Status>
      ) : null}

      {data.etat === "ASSOCIE" ? (
        marked || data.moi.presence === true ? (
          <div className="status status-success center" role="status">
            <div className="big-check">✓</div>
            <strong>Présence enregistrée</strong>
            {(marked?.heure ?? data.moi.heure) ? <p>à {marked?.heure ?? data.moi.heure}</p> : null}
            <p>{data.moi.nomPrenom}</p>
          </div>
        ) : data.moi.presence === false ? (
          <Status tone="danger" title="Vous êtes noté absent pour cette séance">
            <p>Adressez-vous au professeur s&apos;il s&apos;agit d&apos;une erreur.</p>
          </Status>
        ) : (
          <div className="card stack">
            <h1>Bonjour {data.moi.nomPrenom}</h1>
            {!data.seance.siteLocalise ? (
              <Status tone="warning" title="Présence QR indisponible">
                <p>Le site n&apos;est pas encore localisé. Prévenez le professeur.</p>
              </Status>
            ) : null}
            <button className="btn btn-primary" disabled={busy || !data.seance.siteLocalise} onClick={mark}>
              {busy ? <span className="spinner" /> : null}
              {busy ? "Vérification de votre position…" : "Marquer ma présence"}
            </button>
            <p className="meta center">Votre position est vérifiée une seule fois, au moment de marquer la présence.</p>
          </div>
        )
      ) : null}

      {data.etat === "HORS_SEANCE" ? (
        <Status tone="warning" title="Vous n'êtes pas inscrit à cette séance">
          <p>Cette tablette est associée à {data.moi.nomPrenom}. Adressez-vous au professeur.</p>
        </Status>
      ) : null}

      {data.etat === "EN_ATTENTE" ? (
        <Status tone="info" title="En attente de validation par le professeur">
          <p>
            Demande envoyée pour <b>{data.demande?.nomPrenom}</b>. Le professeur va valider votre tablette depuis son écran.
          </p>
          <p className="center">
            <span className="spinner" aria-hidden />
          </p>
        </Status>
      ) : null}

      {data.etat === "NON_ASSOCIE" ? (
        chosen ? (
          <div className="card stack">
            <h1>Vous êtes {chosen.nomPrenom} ?</h1>
            <p className="meta">
              Le professeur va confirmer que c&apos;est bien vous. Cette tablette sera ensuite liée à votre nom pour tout le
              cours.
            </p>
            <button className="btn btn-primary" disabled={busy} onClick={confirmPairing}>
              {busy ? <span className="spinner" /> : null}
              Oui, c&apos;est moi
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => setChosen(null)}>
              Non, revenir à la liste
            </button>
          </div>
        ) : (
          <div className="card stack">
            <h1>Qui êtes-vous ?</h1>
            <p className="meta">Première utilisation de cette tablette pour ce cours : choisissez votre nom.</p>
            {etudiants.length > 8 ? (
              <input
                type="search"
                placeholder="Rechercher votre nom…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Rechercher votre nom"
              />
            ) : null}
            <ul className="name-list">
              {filtered.map((e) => (
                <li key={e.reference}>
                  <button
                    className="name-btn"
                    disabled={e.dejaAssocie}
                    onClick={() => setChosen({ reference: e.reference, nomPrenom: e.nomPrenom })}
                  >
                    {e.nomPrenom}
                    {e.dejaAssocie ? <small>Tablette déjà associée</small> : null}
                  </button>
                </li>
              ))}
            </ul>
            {filtered.length === 0 ? <p className="meta center">Aucun nom ne correspond.</p> : null}
          </div>
        )
      ) : null}

      {actionError ? <Status tone="danger" title={actionError} /> : null}
    </div>
  );
}
