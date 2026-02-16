
export enum VoteStatus {
    YES = 'YES',
    MAYBE = 'MAYBE',
    NO = 'NO'
}

export enum MeetingStatus {
    OPEN = 'OPEN',
    DECIDED = 'DECIDED'
}

export interface TimeSlot {
    id: string;
    meetingId: string;
    startTime: string;
    endTime: string;
}

export interface Vote {
    slotId: string;
    userId: string;
    userName: string;
    status: VoteStatus;
    updatedAt: string;
    userEmail?: string; // Phase 7: For iCal invites
}

export interface ActivityLogEntry {
    type: 'CREATED' | 'UPDATED' | 'VOTE' | 'DECIDED';
    message: string;
    userId: string;
    userName: string;
    timestamp: string;
}

export interface Meeting {
    id: string;
    title: string;
    description?: string;
    creatorId: string;
    creatorName: string;
    creatorEmail: string; // Added for V2 Stateless
    status?: MeetingStatus;
    lockedSlotId?: string;
    decidedAt?: string;
    decidedBy?: string;
    publicToken?: string;
    isPublic?: boolean;
    invitedEmails?: string[];
    createdAt: string;
    expiresAt?: number; // Added for V2 TTL
}

export interface MeetingDetails extends Meeting {
    slots: TimeSlot[];
    votes: Vote[];
    activityLog?: ActivityLogEntry[];
}
