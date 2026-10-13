import { PresenceFlow } from "@/components/PresenceFlow";

/** Page ouverte par le scan du QR : https://attendance.admission.tn/s/<code>. */
export default async function ScanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PresenceFlow code={decodeURIComponent(code)} />;
}
