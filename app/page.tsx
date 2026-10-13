export default function Home() {
  return (
    <div className="card stack">
      <h1>Enregistrer votre présence</h1>
      <p className="meta">
        Scannez avec l&apos;appareil photo de votre tablette le QR code affiché par le professeur en début de séance.
      </p>
      <ol className="meta">
        <li>Scannez le QR affiché en classe.</li>
        <li>La première fois : choisissez votre nom, le professeur valide votre tablette.</li>
        <li>Touchez « Marquer ma présence » et autorisez la localisation.</li>
      </ol>
    </div>
  );
}
