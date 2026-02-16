/**
 * Shared Type Definitions for Samverka
 * These types are used by both the Frontend (React) and Backend (Node.js/Lambda).
 */

// ==========================================
// 1. Identity & Users
// ==========================================

export enum UserRole {
    ADMIN = 'ADMIN',
    USER = 'USER',
    GUEST = 'GUEST' // For temporary access via public link
}

export interface User {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    createdAt: string; // ISO 8601
}

// Payload for the JWT session
export interface AuthSession {
    userId: string;
    email: string;
    displayName: string;
    meetingId: string;
    role: UserRole;
    exp: number;
}

// ==========================================
// 2. Scheduling & Meetings
// ==========================================

export enum VoteStatus {
    YES = 'YES',
    MAYBE = 'MAYBE',
    NO = 'NO'
}

export interface TimeSlot {
    id: string;
    meetingId: string;
    startTime: string; // ISO 8601
    endTime: string;   // ISO 8601
}

export interface Vote {
    slotId: string;
    userId: string;
    userName: string; // Denormalized for easier UI display
    status: VoteStatus;
    updatedAt: string;
}


export enum MeetingStatus {
    OPEN = 'OPEN',
    DECIDED = 'DECIDED'
}

export interface ActivityLogEntry {
    type: 'CREATED' | 'UPDATED' | 'VOTE' | 'DECIDED';
    message: string;
    userId: string;
    userName: string;
    timestamp: string; // ISO 8601
}

export type Language = 'sv' | 'en';

export interface Meeting {
    id: string;
    title: string;
    description?: string;
    creatorId: string;
    creatorName: string;

    // Meeting lifecycle
    status?: MeetingStatus;
    lockedSlotId?: string;
    decidedAt?: string;
    decidedBy?: string;

    // Public access token (if enabled for guests)
    publicToken?: string;

    // Public Access
    isPublic?: boolean;
    invitedEmails?: string[];
    participants?: { userId: string; displayName: string; email: string }[];
    language?: Language; // Phase 7: i18n

    startDate?: string; // ISO 8601 of the earliest slot
    endDate?: string;   // ISO 8601 of the latest slot

    createdAt: string;
}

// Composite type often used in API responses
export interface MeetingDetails extends Meeting {
    slots: TimeSlot[];
    votes: Vote[]; // Flat list of all votes for all slots in this meeting
    activityLog?: ActivityLogEntry[];
}

// ==========================================
// 3. Chat & Communication
// ==========================================

export enum RoomType {
    MEETING = 'MEETING', // Tied to a specific meeting
    ADHOC = 'ADHOC',     // Created manually by users
    DM = 'DM'            // Direct Message between two users
}

export interface ChatRoom {
    id: string;
    name: string;
    type: RoomType;
    linkedMeetingId?: string; // If type === MEETING
    participantIds?: string[]; // Mostly used for DMs to know who is in it
    createdAt: string;
}

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    content: string; // Text content (encryption happens at rest, this is decrypted)
    timestamp: string;

    // Reactions: Key is emoji (e.g., "👍"), Value is array of userIds
    reactions?: Record<string, string[]>;
}

// ==========================================
// 4. API & Networking
// ==========================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
