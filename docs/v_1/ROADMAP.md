# Implementation Roadmap: Samverka

This document tracks the progress of the Samverka project.
**AI Instruction:** When asked to work on a task, read the specific requirements below and cross-reference with `ARCHITECTURE.md` and `UI_UX_DESIGN.md`.

## Phase 1: Foundation & Infrastructure (The Skeleton)
*Goal: Get the AWS environment up and the shared types in place.*

- [x] **1.1. Project Structure Setup**
    - Initialize standard monorepo-style structure: `infra/` (CDK), `backend/` (Lambdas), `frontend/` (React).
    - Configure `tsconfig.json` for strict typing.
- [x] **1.2. Shared Types Definition**
    - Create `src/shared/types.ts` exactly as defined in the Architecture/Types design.
    - Ensure both Frontend and Backend can import from this file.
- [x] **1.3. Infrastructure as Code (CDK)**
    - Set up a CDK stack in `infra/`.
    - Define the **DynamoDB Table** (Single Table Design).
    - Deploy the stack to AWS (eu-north-1) to verify connectivity.

## Phase 2: Identity & Authentication (The Gatekeeper)
*Goal: Allow users to log in via Magic Links.*

- [x] **2.1. Backend: Auth Lambdas**
    - Implement `auth-request-link` Lambda (Trigger SES email).
    - Implement `auth-verify` Lambda (Exchange token for JWT).
    - Implement `authorizer` Lambda (Custom Authorizer for API Gateway).
- [x] **2.2. Frontend: Login UI**
    - Build `/login` view (Email input).
    - Build `/verify` view (Handle URL token).
    - Create `AuthProvider` (React Context) to manage session state.
- [x] **2.3. User Management (Admin)**
    - Create a script or simple endpoint to "Approve" a user (flip status PENDING -> ACTIVE).

## Phase 3: Scheduling Core (The Value)
*Goal: Users can create meetings and vote on times.*

- [x] **3.1. Backend: Meeting CRUD**
    - Implement `createMeeting` Lambda.
    - Implement `getMeeting` Lambda (Fetch meeting + slots + votes).
    - Implement `listMeetings` Lambda (For dashboard).
- [x] **3.2. Frontend: Dashboard**
    - Build `/` (Dashboard) fetching the list of meetings.
    - Implement "Create Meeting" Wizard (Forms for title, description, slot rows).
- [x] **3.3. Backend: Voting Logic**
    - Implement `castVote` Lambda (Update Vote entity).
    - Ensure one user cannot vote twice on the same slot (update, don't create new).
- [x] **3.4. Frontend: The Meeting Grid**
    - Build the Matrix UI (Rows: Time, Cols: People).
    - Connect the voting cells to the `castVote` API.
    - Add visual feedback (Optimistic UI updates).

## Phase 4: Communication (The Context)
*Goal: Enable chat within meeting rooms.*

- [x] **4.1. Backend: Chat API**
    - Define `Message` entity in DynamoDB.
    - Implement `sendMessage` Lambda.
    - Implement `getMessages` Lambda (Pagination).
- [x] **4.2. Frontend: Chat Component**
    - Build the Chat Layout (Message list + Input area).
    - Integrate `React-Query` for polling (fetch new messages every 3-5s).
    - Implement URL parsing (Make links clickable).
- [x] **4.3. Integration**
    - Embed Chat Component into the Meeting Detail View (Split screen).

## Phase 5: Security & Polish
*Goal: Lock it down and make it usable for guests.*

- [x] **5.1. Guest Access**
    - Implement public access for Meetings (`isPublic` flag).
    - Allow guests to vote with a Display Name (no login required).
- [ ] **5.2. Meeting Locking**
    - Implement `lockMeeting` endpoint (Admin only).
    - Add logic: If meeting is locked, reject new votes.
- [x] **5.3. Final UI Polish**
    - Add Empty States (No meetings yet).
    - Add Loading Skeletons.
    - Verify Mobile responsiveness.
    - **Refined Layout:** Two-column design for Meeting Details.

## Phase 6.5: Refactoring & Modules (The Cleanup)
*Goal: Ensure code maintainability and separation of concerns.*

- [x] **6.5.1. Modular Codebase**
    - Split into `identity`, `scheduler`, `communication` modules.
    - Centralize shared types in `src/shared`.
- [x] **6.5.2. Enhanced Chat UX**
    - Implement "Slack-style" message bubbles (Blue for me, Gray for others).
    - Add Delete Message functionality (Hover action).
    - Add Custom Chat Rooms support in Dashboard.

## Phase 6: Deployment & Integration (The Launchpad)
*Goal: Get it live on the internet.*

- [x] **6.1. Infrastructure**
    - Configure AWS environment (Account/Region).
    - Bootstrap CDK.
    - Deploy Core Stack (DynamoDB, Lambdas, API Gateway).
- [x] **6.2. Frontend Configuration**
    - Create `.env.production` with live API URL.
    - Build & Test against live API.

## Phase 7: Frontend Hosting (The Face)
*Goal: Serve the app via global CDN.*

- [x] **7.1. Infrastructure Update**
    - Update CDK with S3 Bucket and CloudFront Distribution.
    - Configure OAC and Error Responses (SPA routing).
    - Associate ACM Certificate for HTTPS.
- [x] **7.2. Deployment**
    - Build React App (`vite build`).
    - Sync `dist/` to S3.
    - Invalidate CloudFront Cache.

## Phase 8: Enterprise UX & Advanced Features (The Polish)
*Goal: Transform the MVP into a professional SaaS platform as defined in UI_UX_DESIGN.md.*

- [ ] **8.1. Global App Shell (Top Bar)**
    - Implement the "Global Navigation & Identity" bar defined in Design Guidelines.
    - Persistent sticky header with Navigation (Center) and User Profile (Right).
- [ ] **8.2. Notification System**
    - **Backend:** Create `Notification` entity (`USER#<id>`, `SK=NOTIF#<ts>`).
    - **Frontend:** Add "Bell Icon" in Top Bar with unread badge.
    - **Frontend:** Build Notification Dropdown.
- [ ] **8.3. Advanced Chat Features**
    - **Mentions:** Implement `@username` lookup.
    - **Backend:** Trigger Notifications on mentions.
    - **Unread Counters:** Track read status per room.
- [ ] **8.4. Visual Overhaul (SaaS Look)**
    - Apply `bg-slate-50` globally as specified in the Color Palette.
    - Implement "Card" styling for Dashboard and Meetings.
## Phase 9: Administration & Governance (The Control Room)
*Goal: Secure user management and role-based access control.*

- [ ] **9.1. Backend: Admin API & RBAC**
    - Update `User` model to include `role`, `createdAt`, `lastLoginAt`.
    - Implement `adminAuthorizer` middleware (or update existing to check roles).
    - Implement `listUsers` Lambda (Admin only).
    - Implement `updateUserStatus` Lambda (Approve/Revoke).
    - Implement `updateUserRole` Lambda (Promote/Demote).
- [ ] **9.2. Frontend: Admin Dashboard**
    - Create `AdminLayout` (distinct from AppLayout).
    - Build User Table (Columns: Name, Email, Role, Status, Created, Last Login).
    - Add Action Buttons (Approve, Revoke, Make Admin).
    - Add Navigation: Switch between "App" and "Admin" for admin users.
- [ ] **9.3. Onboarding Flow Updates**
    - Create `/register` page for "Request Access".
    - Update `/login` logic to handle PENDING/REVOKED states gracefully.
