# RFC: Soft-expiry tokens med "Skicka ny länk"-knapp

**Datum:** 2026-02-16
**Status:** `IMPLEMENTERAD — Redo för deploy`
**Prioritet:** P1

---

## 1. Problembeskrivning

### Bakgrund
Tokens raderades från DynamoDB direkt vid första verify (single-use). Om användaren klickade samma länk igen — i annan browser, efter cache-rensning, eller dubbel-klick — visades kryptiskt "Ogiltig länk" utan möjlighet att komma vidare.

### Ny design: Två nivåer av livslängd

| Nivå | Admin-token | Deltagare-token | Syfte |
|------|-------------|-----------------|-------|
| **Logisk giltighet** | 24 timmar | 60 dagar | Single-use. Efter verify → status "USED" |
| **Datalagring (DynamoDB TTL)** | 30 dagar | 60 dagar | Token kvar i DB. Möjliggör "Skicka ny länk" |

---

## 2. Implementerade åtgärder

### A: Soft-expiry i `verify-access.ts`
- `DeleteCommand` ersatt med `UpdateCommand`: `status: "USED"`, `usedAt: <timestamp>`
- Ny felkoder: `TOKEN_USED`, `TOKEN_EXPIRED`, `TOKEN_NOT_FOUND`
- Returnerar maskerad email + meetingId vid USED/EXPIRED (för resend-flöde)
- Legacy-tokens (utan `status`/`logicalExpiresAt`) hanteras med fallback

### B: Ny fält på alla tokens
- `status: "ACTIVE"` vid skapande
- `logicalExpiresAt`: logisk utgångstid
- `expiresAt`: DynamoDB retention TTL (30 dagar)

### C: Ny Lambda `resend-link.ts` + route `POST /auth/resend`
- Input: `{ token }` (gamla UUID:t från URL)
- Slår upp gammalt token → hämtar email + meetingId
- Genererar nytt ACTIVE-token, skickar mail med ny länk
- Returnerar `{ message, email: maskEmail(email) }`

### D: Frontend `Verify.tsx` — ny UX
- `TOKEN_USED` → "Länken har redan använts" + knapp: "Skicka mig en ny inloggningslänk"
- `TOKEN_EXPIRED` → "Länken har gått ut" + samma knapp
- Klick → `POST /auth/resend` → "Ny länk skickad till jo***@example.com"

### E: `maskEmail()` utility
- `johan@example.com` → `jo***@example.com`

---

## 3. Påverkade filer

| Fil | Ändring | Risk |
|-----|---------|------|
| `backend/src/shared/utils.ts` | Ny `maskEmail()` | Låg. Ny funktion. |
| `backend/src/auth/verify-access.ts` | Soft-expiry: UpdateCommand istf DeleteCommand | Medel. Kärn-auth-logik. |
| `backend/src/auth/resend-link.ts` | **Ny fil.** Resend-endpoint. | Låg. Ny Lambda. |
| `backend/src/auth/request-access.ts` | Token-modell: status, logicalExpiresAt, 24h TTL | Låg. Additivt. |
| `backend/src/scheduler/lambdas/createMeeting.ts` | Token-modell: status, logicalExpiresAt, retentionTTL | Låg. Additivt. |
| `infra/lib/infra-stack.ts` | Ny Lambda + route `POST /auth/resend` | Låg. Ny resource. |
| `frontend/src/pages/Verify.tsx` | Ny UX: resend-knapp vid USED/EXPIRED | Medel. Omskriven. |
| `frontend/src/utils/api.ts` | `resendLink()`, `err.data` på errors | Låg. |
| `frontend/src/i18n/locales.ts` | Nya auth-strängar (sv + en) | Låg. |

---

## 4. Testplan

| Testfall | Förväntat resultat |
|----------|-------------------|
| Skapa möte → klicka admin-länk | Verifiera OK → redirect till mötessida |
| Klicka samma admin-länk igen | "Länken har redan använts" + "Skicka ny länk"-knapp |
| Klicka "Skicka ny länk" | Mail skickas → bekräftelse med maskerad email |
| Klicka ny länk i mail | Verifiera OK → redirect till mötessida |
| Deltagare: samma flöde | Fungerar identiskt |
| Legacy-token (utan status-fält) | Behandlas som ACTIVE → verify OK |

---

## 5. Deploy-plan

```bash
git push origin main
# CI/CD: CDK deploy (ny Lambda + route) + frontend build + S3 sync + CloudFront invalidation
```

---

## 6. Ändringslogg

| Datum | Ändring |
|-------|---------|
| 2026-02-16 | RFC skapad — Zod datetime-hypotes |
| 2026-02-16 | Iteration 2 — Korrigerad efter code review |
| 2026-02-16 | Iteration 3 — superRefine, error propagation, felmappning |
| 2026-02-16 | Iteration 4 — JWT displayName, lokal UserProfileModal |
| 2026-02-16 | Iteration 5 — Chat 401 (authorizer displayName), deltagare 403 (token TTL) |
| 2026-02-16 | **Iteration 6** — Soft-expiry tokens: USED/EXPIRED status, resend-link Lambda, "Skicka ny länk"-UX |
