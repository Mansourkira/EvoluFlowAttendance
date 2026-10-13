import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Présence – ADMISSION",
  description: "Enregistrez votre présence en cours en scannant le QR affiché par le professeur.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f6fd1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <main>
          <div className="brand">● ADMISSION · Présence</div>
          {children}
        </main>
      </body>
    </html>
  );
}
