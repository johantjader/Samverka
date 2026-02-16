# Architecture Definition: Samverka

## 1. Project Overview & Core Principles
**Samverka** is a secure, web-based collaboration tool designed for cross-organizational meetings and communication.
* **Target Audience:** ~20 users across different organizations + temporary guests.
* **Key Value:** Simplicity, Security (Encryption-at-rest/transit), and Transparency (Open rooms).
* **Compliance:** Not for classified government data, but high "business security" standards.

### Architectural Drivers
* **AI-First Development:** The codebase must be modular, strongly typed (TypeScript), and explicit to ensure high success rates for AI code generation.
* **Serverless:** Fully hosted on AWS (eu-north-1) to minimize maintenance.
* **Privacy:** No persistent tracking. Users own their data.

## 2. Technology Stack
* **Language:** TypeScript 5.x (Strict Mode enabled).
* **Frontend:** React (Vite), TailwindCSS, React Query.
* **Backend:** AWS Lambda (Node.js 20.x).
* **API:** AWS API Gateway (REST).
* **Database:** Amazon DynamoDB (Single Table Design preferred).
* **Infrastructure as Code:** AWS CDK (TypeScript).
* **Auth:** Passwordless (Magic Links) + Custom JWT.

## 3. System Modules (Domain Driven Design)

The application is structured into three core domains found in `src/`.

### A. Identity & Access Module (`src/identity`)
Handles onboarding and authentication without central AD integration.

* **Authentication Flow:**
    1.  User enters Email.
    2.  System sends a "Magic Link" with a short-lived token.
    3.  Clicking the link exchanges token for a Session JWT.
* **Guest Access:**
    * **Public Meetings:** Can be accessed by anyone with the link (if `isPublic` is true).
    * **Guest Voting:** Guests can vote by providing a `guestName`.
* **Registration Flow (Request Access):**
    1. User submits Email + Desired Username via `/auth/register`.
    2. System creates User with `status: 'PENDING'` and `role: 'USER'`.
    3. Admin receives notification (future) or sees user in Admin Dashboard.
    4. Admin approves -> Status becomes `ACTIVE`.
* **Login Flow Update:**
    * If status is `PENDING`: Do not send login link (or send "Wait for approval" email).
    * If status is `REVOKED`: Block access.

### B. Scheduler Module (`src/scheduler`)
Handles the negotiation of time without external calendar integration.

* **Core Concepts:**
    * **Meeting Proposal:** A collection of `TimeSlots`.
    * **Vote:** Determining the best time.
* **Business Logic:**
    * **Public/Private:** Meetings can be marked valid for public access.

### C. Communication Module (`src/communication`)
(Formerly `src/chat`) Handles real-time text communication.

* **Structure:**
    * **Meeting Rooms:** Tied to a meeting.
    * **Custom Rooms:** Created users for specific topics.
* **Constraints:**
    * **Text Only:** No image uploads.
    * **Rich Interactions:** Link parsing, Emoji reactions, Message Deletion.

## 4. Data Model (DynamoDB Schema Strategy)

We use a Single Table Design pattern for efficiency and strong consistency.
**Partition Key (PK):** `string`
**Sort Key (SK):** `string`

| Entity | PK | SK | Attributes |
| :--- | :--- | :--- | :--- |
| **User** | `USER#<email>` | `PROFILE` | `id`, `name`, `status` ('PENDING'/'ACTIVE'/'REVOKED'), `role` ('ADMIN'/'USER'), `createdAt`, `lastLoginAt` |
| **Meeting** | `MEETING#<id>` | `METADATA` | `title`, `description`, `creatorId`, `isPublic` (bool), `invitedEmails` (list), `startDate`, `endDate` |
| **TimeSlot** | `MEETING#<id>` | `SLOT#<ts_start>` | `startTime`, `endTime` |
| **Vote** | `MEETING#<id>` | `VOTE#<slotId>#<userId>` | `status`, `userId` (or `guest-...`), `guestName` (if guest) |
| **Room** | `ROOM#<id>` | `METADATA` | `name`, `type`, `createdBy`, `participantIds` (list) |
| **Message** | `ROOM#<id>` | `MSG#<timestamp>` | `senderId`, `content`, `reactions` |

## 5. Security Architecture

### Encryption
* **At Rest:** AWS DynamoDB encryption (KMS).
* **In Transit:** TLS 1.3 enforced on API Gateway and CloudFront.
* **Application Level (Optional/Future):** `content` field in Messages can be AES-encrypted by the backend before storage to prevent DB admin snooping.

### Network
* **API:** Protected by WAF (Web Application Firewall) basic rules.
* **CORS:** Strictly limited to the frontend domain.

## 6. API Interface (REST Standards)


* **Admin (Requires ROLE=ADMIN):**
    * `GET /admin/users` - List all users (with status, role, dates).
    * `PATCH /admin/users/{userId}/status` - Approve/Revoke user (`status`: 'ACTIVE' | 'REVOKED').
    * `PATCH /admin/users/{userId}/role` - Promote/Demote user (`role`: 'ADMIN' | 'USER').
* **Auth:**
    * `POST /auth/login` - Request Magic Link.
    * `POST /auth/verify-link` - Verify link -> Get JWT.
    * `POST /auth/register` - Request access (Email + Name).
* **User:**
    * `PATCH /users/me` - Update profile (Display Name).
* **Meetings:**
    * `GET /meetings` - List meetings.
    * `POST /meetings` - Create proposal (supports `isPublic`, `invitedEmails`).
    * `GET /meetings/{id}` - Get meeting details.
    * `DELETE /meetings/{id}` - Delete meeting (Owner only).
    * `POST /votes` - Cast vote (supports `guestName`).
* **Chat:**
    * `POST /chat/rooms` - Create a new chat room.
    * `GET /chat/rooms` - List available rooms.
    * `POST /chat/messages` - Send a message.
    * `GET /chat/messages/{roomId}` - Get chat history.
    * `DELETE /chat/messages` - Delete a message (Sender only).
* `WS /ws` (Optional) - Or use polling (swr) for initial MVP simplicity regarding chat updates. *Decision: Polling every 3s is acceptable for MVP, moving to WebSocket later.*