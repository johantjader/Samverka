# Migration Analysis: From SaaS to Zero-Friction

This document analyses the technical implications of pivoting Samverka from a persistent account-based SaaS to a stateless, ephemeral meeting tool.

## Philosophy
The core shift is from **"User-Centric"** (Users own data, have history, login to a dashbaord) to **"Meeting-Centric"** (The meeting is the universe; users are transient participants).

---

## Analysis 1: The "Adapt & Evolve" Strategy (Conservative)
*Goal: Retain maximum existing code while enabling public access.*

### Concept
Keep the `User` table but treat "Guests" as temporary users with a special flag.

### Pros
*   **Speed:** Existing `auth-lambdas` and `authorizer` can be reused with minor tweaks.
*   **Chat:** The existing independent `Room` structure works well if we just auto-create a room for each meeting.
*   **Consistency:** "verified" users (via the old register flow) and "guest" users share the same data structure.

### Cons
*   **GDPR Risk:** We still accumulate user records in `USER#<email>` partition keys. We'd need aggressive TTL cleanup on the User table too.
*   **Complexity:** The frontend has to handle "Is this a real user or a temp user?" logic.
*   **Friction:** The "Request Access" flow is overkill for a guest just wanting to vote.

### Verdict
Good for a "hybrid" model, but fails the "Zero-Friction" promise because it relies on the heavy machinery of the Identity module.

---

## Analysis 2: The "Stateless & Ephemeral" Strategy (Radical)
*Goal: Token-based access. No User entity.*

### Concept
Delete the `User` table. Identity is derived entirely from a JWT signed with a secret, containing `email`, `displayName`, and `meetingId`.

### Architectural Changes
1.  **Identity:**
    *   **REMOVE:** `src/identity/*` (User management, Registration, Global Login).
    *   **ADD:** `src/auth/issue-token` (Generates Magic Link/OTP) and `src/auth/verify` (Returns JWT).
    *   **Authorizer:** Updated to validate meeting-scoped JWTs.

2.  **Scheduler:**
    *   `Meeting` items no longer map `creatorId` to a `USER#UUID`. Instead, `creatorEmail` is stored directly on the Meeting item.
    *   **Public Access:** `createMeeting` is open. Abuse prevention via Rate Limiting (WAF) or simple CAPTCHA.

3.  **Communication:**
    *   **Merge:** Chat Rooms are no longer separate. Messages live directly under the `MEETING#<id>` partition key (or close to it).
    *   **Simplify:** Removed "Direct Messages" or "Multi-room" support. One Meeting = One Chat.

4.  **Data Lifecycle (TTL):**
    *   Since there is no "User Profile" to persist, *everything* is tied to the Meeting ID.
    *   When the Meeting expires (TTL), all Votes, Messages, and Participant records vanish. **GDPR by Design.**

### Pros
*   **True Zero-Friction:** No "account" ever created.
*   **Privacy:** Absolute data isolation.
*   **Simplicity:** Drastically reduces the "Identity Management" surface area (no "Reset Password", "Update Profile", etc.).

### Cons
*   **Loss of History:** A creator cannot see "My Past Meetings" unless they save the links (or we implement a browser-localstorage "My History").
*   **Refactoring:** Requires gutting the `identity` module.

### Verdict
**Recommended.** This aligns perfectly with the new vision. The trade-off (loss of persistent history) is a feature, not a bug, for this specific privacy-focused use case.

---

## Reusability Audit

| Module | Component | Action | Notes |
| :--- | :--- | :--- | :--- |
| **Scheduler** | `createMeeting` | **Modify** | Remove `creatorId` check. Add SES email trigger. |
| **Scheduler** | `vote` | **Keep** | Logic is sound. Just update Authorizer context. |
| **Scheduler** | `decide` | **Modify** | Add iCal generation logic. |
| **Communication** | `sendMessage` | **Simplify** | Bind strict to Meeting ID. |
| **Identity** | `register`, `login` | **Delete** | Replaced by lightweight OTP flow. |
| **Infra** | DynamoDB | **Keep** | Enable TTL. |
| **Frontend** | `MeetingDetails` | **Keep** | Core UI is good. |
| **Frontend** | `Dashboard` | **Replace** | Becomes Public Landing Page. |

