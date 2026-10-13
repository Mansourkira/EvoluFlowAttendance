# EvoluFlow Attendance

Student app for QR attendance, at **https://attendance.admission.tn**. The student scans the QR the
professor shows, picks their name the first time (the professor approves the tablet), then taps
"Marquer ma présence". GPS is checked against the site's radius.

The app holds no business logic. It calls the ERP's public routes (`EvoluFlowBack/src/api/public_presence.ts`).

## Run locally

```bash
cp .env.example .env.local            # NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
npm install
npm run dev                           # http://localhost:3002
```

In `EvoluFlowFront/.env`, set `NEXT_PUBLIC_ATTENDANCE_URL=http://localhost:3002` so the professor's QR opens this app.

Browsers only allow geolocation over **HTTPS or localhost**. To test from a real tablet, use the server
(https) or an HTTPS tunnel; a phone opening `http://192.168.x.x:3002` cannot send its position.

## Production (Windows server, IIS + pm2)

Already in place: DNS `attendance.admission.tn`, the IIS site on `C:\apps\attendance.admission.tn`,
the Let's Encrypt certificate (win-acme).

One-time setup on the server:

1. Copy `web.config` from this repo into `C:\apps\attendance.admission.tn\`. It replaces the placeholder:
   HTTPS redirect, then reverse proxy to port 3070.
2. Create `C:\apps\attendance.admission.tn\.env`:
   ```
   NEXT_PUBLIC_API_URL=https://<ERP API domain>/api/v1
   PORT=3070
   ```
3. Delete the placeholder `index.html`.
4. Run the **Deploy Attendance** workflow (Actions tab → "Use workflow from" = branch). It typechecks, builds
   (Next `standalone`), starts pm2 `attendance` (`.next\standalone\server.js`, port from `.env`, listening on
   127.0.0.1 only), runs `pm2 save`, then checks that the app answers.

`pm2 save` adds `attendance` to the list that the server's pm2 Windows service restores at boot, like `front` and
`admission-back`. Check with `pm2 list` after a server restart.

On the ERP side:
- Backend `.env`: `PRESENCE_QR_SECRET=<long random string>`. If `CORS_ALLOWED_ORIGINS` is set, add
  `https://attendance.admission.tn` to it.
- Front `.env`: `NEXT_PUBLIC_ATTENDANCE_URL=https://attendance.admission.tn`, then redeploy the front.
- Migrations: `presence_seance_token.sql`, `site_presence_location.sql`, `presence_qr_attendance.sql`.
