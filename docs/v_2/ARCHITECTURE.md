Här är en uppdaterad `Architecture.md` som reflekterar den nya visionen om en "zero-friction" samarbetsplattform. Dokumentet bygger på **"Stateless & Ephemeral"**-strategin där vi tar bort den persistenta användartabellen.

---

# Architecture Definition: Samverka

## 1. Project Overview & Core Principles

**Samverka** är en open-source samarbetsplattform designad för att eliminera friktion vid mötesbokning och kommunikation över organisationsgränser.

* **Target Audience:** Organisationer och individer som behöver snabb, säker koordinering utan krav på konto eller inloggning.
* **Core Value:** "Zero-friction collaboration". Inga lösenord, inga permanenta konton, bara unika säkra länkar.
* **Privacy (GDPR by Design):** Minimal datalagring med automatisk radering (Ephemerality).

### Architectural Drivers

* **Open Source:** All kod är öppen och bidragsdriven.
* **Serverless First:** AWS Lambda & DynamoDB för att skala till 0 kr vid inaktivitet.
* **Mobile & Desktop:** Responsivt gränssnitt som fungerar lika bra på mobilen som på datorn.
* **Ephemeral Data:** Data raderas automatiskt när dess syfte är uppfyllt.

## 2. Technology Stack

* **Language:** TypeScript 5.x (Strict Mode).
* **Frontend:** React (Vite), TailwindCSS, Lucide Icons.
* **Backend:** AWS Lambda (Node.js 20.x).
* **Infrastructure:** AWS CDK (Infrastructure as Code).
* **Database:** Amazon DynamoDB med TTL (Time To Live) för automatisk radering.
* **Email:** Amazon SES för distribution av unika länkar och koder.

## 3. System Modules

### A. Stateless Identity Module (New)
*Tidigare `src/identity` ersätts av en lättviktig Auth-modul.*

Vi lagrar inga användare. Identitet är en temporär session.

* **Access Flow:**
    1. Användaren anger E-post.
    2. Systemet skickar en **Magic Link** (innehållande krypterad kontext).
    3. Verifiering returnerar en signerad **JWT** som gäller för *en speficik möteskontext*.

* **Roles & Permissions:**
    * **Creator (Admin):** JWT claim `role: 'ADMIN'`. Behörighet: *Decide, Update, Delete*.
    * **Participant:** JWT claim `role: 'PARTICIPANT'`. Behörighet: *Vote, Chat*.
    * **Guest:** Ingen JWT. Måste begära access via verifieringsflödet.

* **Security:** 
    * JWT payload: `{ meetingId, email, displayName, role, exp }`.
    * **Rate Limiting:** `POST /meetings` och `/auth` skyddas av API Gateway Throttling (t.ex. 5 req/ip/10min) för att skydda SES-kvoten.

### B. Scheduler Module
Hanterar mötesförslag och röstning.

* **Meeting Creation:** 
    * Public endpoint `POST /meetings`.
    * Kräver `creatorEmail` i body.
    * Triggar mail med "Admin Link" till skaparen.
* **Resilience:**
    * **GSI Index:** `email-index` på `creatorEmail` för att möjliggöra "Resend Link"-funktionalitet.
* **Decide-flöde:** 
    * Vid beslut genereras en `.ics`-fil.
    * Distribueras via mail till alla som röstat/bjudits in.
    * `expiresAt` uppdateras på **hela trädet** (Möte + Röster + Meddelanden).

### C. Communication Module
Kontextuell chatt direkt kopplad till mötesinstansen. Chattmeddelanden lagras under samma partitionsnyckel som mötet, vilket garanterar att de raderas samtidigt.

* **Constraints:** Endast text, länkar och emojis.
* **Storage:** Integrerad i Single Table Design (se nedan).

## 4. Data Model (DynamoDB Single Table)

Vi använder `TTL`-attributet på alla rader. När ett möte dör, dör allt kopplat till det.

* **Global Secondary Indexes (GSI):**
    * `GSI1`: PK=`email`, SK=`created` (För att hitta "Mina skapade möten" / Resend Link).

| Entity | PK | SK | Attributes | TTL Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Meeting** | `MEETING#<id>` | `METADATA` | `title`, `creatorEmail`, `status`, `expiresAt` (GSI1PK=`creatorEmail`) | Skapad + 60 dagar (eller Beslut + 14) |
| **TimeSlot** | `MEETING#<id>` | `SLOT#<ts>` | `start`, `end` | Samma som Meeting (Måste kopieras!) |
| **Vote** | `MEETING#<id>` | `VOTE#<slotId>#<email>` | `status` (YES/NO/MAYBE), `userName` | Samma som Meeting (Måste kopieras!) |
| **Message** | `MEETING#<id>` | `MSG#<ts>` | `senderName`, `content` | Samma som Meeting (Måste kopieras!) |
| **Token** | `TOKEN#<uuid>` | `METADATA` | `refersToMeetingId`, `email`, `role` | Skapad + 15 min |

*Observera: Ingen `USER`-entitet.*

## 5. Security & Privacy

### Ephemerality (Data-livslängd)
* **Standard:** Data raderas 60 dagar efter skapande.
* **Vid beslut:** Om en tid väljs uppdateras `expiresAt` till 14 dagar efter mötesdatumet.
* **GUI:** En klocka/notis i gränssnittet visar för användaren när datan upphör att existera.

### GDPR Compliance
* **Minimering:** Endast e-post och namn lagras temporärt i röstningssyfte.
* **Transparens:** Inga dolda profiler.
* **Isolation:** Ingen data delas mellan olika mötesinstanser.

## 6. API Interface (REST)

* **Public:**
    * `POST /meetings` - Skapa möte, skicka admin-länk.
    * `POST /auth/request-access` - Begär magic link för ett möte.
    * `POST /auth/verify` - Byt magic link mot JWT.
* **Protected (Kräver JWT):**
    * `GET /meetings/{id}` - Hämta detaljer.
    * `PATCH /meetings/{id}` - Redigera (Endast Creator-roll).
    * `POST /meetings/{id}/votes` - Rösta.
    * `POST /meetings/{id}/decide` - Lås tid.
    * `POST /meetings/{id}/messages` - Chat.

## 7. Migration Strategy (From SaaS to Stateless)
1. **Archive:** Flytta `src/identity` till `legacy/`.
2. **Refactor:** Uppdatera `createMeeting` att acceptera email direkt.
3. **Pipeline:** Uppdatera CDK att ta bort User-tabellen (eller bara tömma den) och aktivera TTL.