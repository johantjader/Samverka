# UI/UX Design Guidelines - Samverka (Stateless Edition)

## 1. Designprinciper & Filosofi

Vi bygger en **"Zero-Friction"**-plattform. Användaren ska inte känna att de loggar in i ett system, utan att de kliver in i ett rum.

* **Ephemerality (Förgänglighet):** Designen ska tydligt kommunicera att datan är temporär. Vi bygger tillit genom transparens kring radering.
* **Mobile-First & Thumb-Friendly:** Alla kritiska interaktioner (rösta, chatta) ska vara nåbara med tummen på en mobilskärm.
* **Light & Airy:** Vi lämnar den tunga "Admin-känslan". Mycket rymd, mjuka skuggor och tydlig typografi.

### Färgpalett (Tailwind Updates)

Vi byter från den "tunga" blåa/gråa skalan till en modernare Indigo/Slate-kombination.

* **Bakgrunder:** `bg-slate-50` (App Shell), `bg-white` (Kort/Containrar).
* **Primary Brand:** `indigo-600` (CTA-knappar), `indigo-50` (Hover/Active states).
* **Text:** `text-slate-900` (Rubriker), `text-slate-500` (Metadata/Hjälptext).
* **Semantiska Statusfärger:**
* ✅ **YES:** `bg-emerald-500` / `text-white` (Tidigare green-700)
* ⚠️ **MAYBE:** `bg-amber-400` / `text-white` (Tidigare yellow-700)
* ⛔ **NO:** `bg-rose-500` / `text-white` (Tidigare red-700)



---

## 2. Global Layout (The Contextual Shell)

Vi överger "Three-Pane Console" (Slack-layouten) till förmån för en **Header-Centric Layout**.

### A. Global Sticky Header

Alltid synlig högst upp.

* **Vänster:**
* **Logotyp:** Klick leder till Startsidan (`/`).
* **Context Badge:** Visar status på nuvarande möte (t.ex. *"🟢 Öppet"* eller *"🔒 Beslutat"*).


* **Höger:**
* **Mina Möten (History Drawer):** En klock-ikon 🕒 som öppnar en sidomeny med lokalt sparade möteslänkar.
* **Språk:** En enkel toggle (SV/EN).
* **User Pill:** Visar verifierad status (t.ex. *"👤 Anna"*). Klick ger möjlighet att "Glöm mig" (Logga ut/Rensa session).



### B. Huvudytan (Main Stage)

* **Desktop:** "Split View".
* Vänster (65%): Mötesinformation & Röstningsmatris.
* Höger (35%): Chatten (fixerad höjd, alltid synlig).


* **Mobil:** "Single View" med botten-navigering.
* Användaren ser antingen Matrisen ELLER Chatten.



### C. Mobil Navigering (Bottom Tabs)

Visas endast på mobil/tablet (< md breakpoint).

* En fixerad meny längst ner på skärmen.
* **Tab 1:** `[📅 Tid & Svar]`
* **Tab 2:** `[💬 Chatt (3)]` (Badge för olästa meddelanden).

---

## 3. Key Views & Vyer

### A. Startsidan (The Creation Wizard)

*Route:* `/`
En enkel, centrerad "Hero"-sektion. Ingen dashboard.

* **Steg 1 (Vad):** Titel och beskrivning (Valfritt).
* **Steg 2 (Vem):** Din e-post (för att få admin-länken).
* **Steg 3 (När):** Datumväljare och tids-slots.
* **CTA:** "Skapa möte" -> Triggar API och visar bekräftelse ("Kolla din mail!").

### B. Mötesvyn (The Meeting Room)

*Route:* `/m/:meetingId`
Detta är kärnan i applikationen.

**1. Matrisen (Scheduler):**

* **Sticky Header:** Datum och tider ska "klibba" fast i toppen när man scrollar vertikalt.
* **Sticky Column:** Deltagarnas namn (vänsterkant) ska klibba fast när man scrollar horisontellt.
* **Min Rad:** Användarens egen rad markeras tydligt (`bg-indigo-50`) och cellerna är interaktiva knappar (toggle).

**2. Chatten (Communication):**

* Ligger i en egen panel (Desktop) eller flik (Mobil).
* **Bubblor:**
* Mina: Högerställda, `bg-indigo-600`, vit text.
* Andras: Vänsterställda, `bg-slate-200`, mörk text. Namn visas ovanför bubblan.


* **Privacy Footer:**
* En permanent, diskret list under inmatningsfältet:
* *🛡️ Endast deltagare ser detta. Chatten raderas automatiskt om 14 dagar.*



### C. Autentisering (Interstitial)

*Route:* `/auth/verify?token=...`

* När användaren klickar på en Magic Link (från mail) visas en "Laddar..."-skärm medan token valideras.
* Vid framgång: Redirect direkt till `/m/:meetingId`.
* Vid fel: Tydligt felmeddelande ("Länken har gått ut") och knapp för att "Begära ny länk".

---

## 4. Interaktion & Micro-UX

### Lokal Historik (The LocalStorage Drawer)

Eftersom vi inte har inloggade konton, måste vi hjälpa användaren minnas sina möten.

* **Logic:** Varje gång användaren besöker ett möte, sparas `{id, title, token, lastVisited}` i webbläsarens `localStorage`.
* **UI:** Klick på "Historik-ikonen" i headern öppnar en "Drawer" från höger.
* **Innehåll:** En lista på de senaste 10 mötena. Möjlighet att ta bort enskilda objekt (rensa historik).

### Röstning

* **Optimistic UI:** När du klickar på en tid, ändras färgen *omedelbart*. Spinner/laddning visas endast om nätverksanropet tar >1s.
* **Krock-varning:** (Nice to have) Om användaren väljer JA på en tid som krockar med ett annat möte i "Lokal Historik", visa en subtil varning.

### Beslut (The Decision)

* Endast synligt för mötesskaparen (Admin).
* En tydlig knapp "Fastställ denna tid" under varje kolumn i matrisen.
* **Feedback:** Vid klick -> Bekräftelsemodal -> API-anrop -> **Confetti-regn** över skärmen 🎉 -> Status ändras till "Beslutat".

---

## 5. Implementation Notes (Frontend)

För att realisera denna design, genomför följande tekniska förändringar:

### Routing Struktur (React Router)

```tsx
<Routes>
  <Route path="/" element={<LandingPageWizard />} />
  <Route path="/m/:meetingId" element={<MeetingLayout />}>
     {/* MeetingLayout hanterar Split View vs Tabs logik */}
  </Route>
  <Route path="/auth/verify" element={<MagicLinkHandler />} />
  <Route path="*" element={<NotFound />} />
</Routes>

```

### Tailwind Config (`tailwind.config.js`)

Uppdatera färgerna för att matcha specifikationen:

```javascript
theme: {
  extend: {
    colors: {
      brand: colors.indigo,
      status: {
        yes: colors.emerald[500],
        maybe: colors.amber[400],
        no: colors.rose[500]
      }
    }
  }
}

```

### Hooks Requirement

* `useMeetingHistory()`: En custom hook som synkar `localStorage` med "Mina möten"-drawern.
* `useIsMobile()`: För att konditionellt rendera "Tabs" eller "Split View".