# UI/UX Design Guidelines - Samverka

## 1. Design System Principles
* **Framework:** TailwindCSS (Standard config).
* **Style:** "Professional SaaS". Clean, minimalistic, trustworthy.
* **Layout Structure:** Global Top Navigation Bar (Sticky) + Content Area.
* **Responsiveness:** Mobile-First. Complex grids become stacked cards on mobile.
* **Modularity:** Distinct visual separation between modules (Scheduler vs Chat).

### Color Palette (Tailwind Reference)
* **Backgrounds:** `bg-slate-50` (App Shell), `bg-white` (Cards/Modules).
* **Primary Brand:** `blue-600` (Buttons, Active States, "My" Chat bubbles).
* **Text:** `text-slate-900` (Headings), `text-slate-600` (Body).
* **Status Colors:**
    * ✅ Yes/Available: `green-100` (bg) / `green-700` (text).
    * ⚠️ Maybe: `yellow-100` (bg) / `yellow-700` (text).
    * ⛔ No/Busy: `red-100` (bg) / `red-700` (text).
    * 🔔 Notification: `red-500` (Badge).

## 2. Global Layout Strategy (The Three-Pane Console)
We are moving away from a traditional website layout to an **Enterprise Console Layout**, similar to Slack or Discord. This layout is persistent across the application.

### Zone 1: The Navigation Rail (Leftmost)
* **Width:** Fixed (approx. 72px).
* **Appearance:** Dark Theme (`bg-slate-900` to `bg-slate-800`), contrasting with the rest of the app.
* **Content:**
    * **Top:** App Logo (Small icon).
    * **Middle (Module Switcher):** Vertical list of icons.
        1.  🏠 **Overview** (Dashboard).
        2.  📅 **Meetings** (Scheduler).
        3.  💬 **Chat** (Communication).
        * *State:* Selected icon has a lighter background/accent color.
    * **Bottom:** User Profile (Circular Avatar).
        * *Interaction:* Clicking opens a Popover menu (Settings, Log out).

### Zone 2: The Context Sidebar (Middle-Left)
* **Width:** Fixed (approx. 260px).
* **Appearance:** Light Gray (`bg-slate-50`), distinct from the white main stage. Border-right (`border-slate-200`).
* **Content (Dynamic based on Rail Selection):**
    * **If "Overview" is selected:**
        * Simple menu: "Home", "Notifications", "Activity Feed".
    * **If "Meetings" is selected:**
        * **Header:** "Your Meetings" + `[+]` New Meeting Button.
        * **List:** Scrollable list of upcoming meetings, sorted by date.
    * **If "Chat" is selected:**
        * **Header:** "Rooms" + `[+]` New Room Button.
        * **Sections:** "Favorites", "Channels" (#general), "Direct Messages".

### Zone 3: The Main Stage (Right/Remaining)
* **Width:** Flexible (`flex-grow`), takes up all remaining space.
* **Appearance:** White (`bg-white`), clean canvas.
* **Content:** Displays the active view from the Sidebar selection.
    * **Header:** A context-specific Top Bar *inside* this view (e.g., showing the name of the current Chat Room or Meeting Title).

### Mobile Adaptation
* **Rail & Sidebar:** Hidden by default.
* **Navigation:** A **Hamburger Menu** (Top-Left) slides out the Navigation Rail and Sidebar logic as a drawer.

## 3. Key Views & Component Behavior

### A. Dashboard (Overview Module)
* **Main Stage:**
    * **Stats:** High-level counters (Unread messages, Upcoming votes).
    * **Activity:** A timeline of recent relevant actions.

### B. Scheduler Module
* **Main Stage:**
    * **Meeting Detail View:**
        * **Matrix Grid:** The core voting interface.
        * **Chat Tab:** A secondary tab or side-panel within the Main Stage for meeting-specific chat.

### C. Communication Module
* **Main Stage:**
    * **Chat Interface:**
        * **Message History:** Standard chat scroll.
        * **Input:** Bottom-anchored text area.
        * **Right Panel (Optional):** Thread view or Channel details.

## 4. Interaction Guidelines
* **Feedback:** All actions (voting, sending) show optimistic UI updates (immediate change) followed by confirmation.
* **Modals:** Use for profile editing and creating meetings to keep context.
* **Transitions:** Smooth fade-ins when switching tabs or opening dropdowns.