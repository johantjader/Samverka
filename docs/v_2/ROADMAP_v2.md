# Roadmap V2: The Zero-Friction Era

This roadmap defines the steps to transition Samverka from a SaaS MVP to a stateless, privacy-first meeting tool.

## Phase 1: The "Identity" Audit & Refactor
*Goal: Remove the concept of "Registered Users" and replace with "Meeting Sessions".*

- [ ] **1.1. Archive Legacy Identity**
    - Move `backend/src/identity` to `backend/src/legacy_identity`.
    - Remove User Table definition from `infra-stack.ts` (or deprecate it).
- [ ] **1.2. Implement Stateless Auth**
    - Create `backend/src/auth/request-access.ts`: Generates OTP/Magic Link for a specific meeting.
    - Create `backend/src/auth/verify-access.ts`: Validates OTP -> Returns JWT `{ meetingId, role: 'CREATOR'|'PARTICIPANT' }`.
    - Update Authorizer to validate these new JWTs.

## Phase 2: Public Access & "The Hook"
*Goal: Allow anyone to create a meeting instantly.*

- [ ] **2.1. Public Creation Endpoint**
    - Update `createMeeting` Lambda to:
        - Accept `creatorEmail` (no `creatorId` check).
        - Generate `adminToken` (JWT) internally.
        - Send "Admin Link" email to creator via SES.
- [ ] **2.2. Frontend Pivot**
    - Replace `Dashboard` with a public `LandingPage`.
    - Connect `CreateMeetingWizard` to the accessible endpoint.
    - Implement "Check Email" state for creators.

## Phase 2.5: Resilience & Safety
*Goal: Protect the platform and ensure users can recover access.*

- [ ] **2.5.1. Rate Limiting**
    - Configure API Gateway Throttling / WAF for `POST /meetings` and `POST /auth/request-access`.
    - (Optional) Implement Honeypot field in public forms.
- [ ] **2.5.2. Resend Functionality**
    - Create `POST /auth/recover`:
        - Accepts email.
        - Queries GSI (CreatorEmailIndex) for active meetings.
        - Resends Admin Links via SES.

## Phase 3: Ephemerality (The Promise)
*Goal: Data disappears when it's supposed to.*

- [ ] **3.1. Infrastructure TTL**
    - Enable TTL on DynamoDB `expiresAt` attribute.
- [ ] **3.2. Lifecycle Logic**
    - Update `createMeeting` to set `expiresAt = now + 60 days`.
    - Update `vote` and `sendMessage` to inherit `expiresAt` from the parent meeting (TTL Propagation).

## Phase 3.5: Data Consistency
*Goal: Prevent Zombie Data.*

- [ ] **3.5.1. TTL Propagation**
    - Explicitly verify that `castVote` and `sendMessage` lambdas read `expiresAt` from meeting metadata and write it to the new items.

## Phase 4: The "Decide" Experience
*Goal: Close the loop.*

- [ ] **4.1. iCal Generation**
    - Implement `.ics` generation logic in `decideMeeting`.
    - Send email with attachment to all participants.
    - Update `expiresAt` to `decisionDate + 14 days`.

## Reference Documents
*   [Architecture V2](ARCHITECTURE.md) - The Stateless Design.
*   [Migration Analysis](MIGRATION_ANALYSIS.md) - Why we chose this path.