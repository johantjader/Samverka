
export enum RoomType {
    MEETING = 'MEETING',
    ADHOC = 'ADHOC',
    DM = 'DM'
}

export interface ChatRoom {
    id: string;
    name: string;
    type: RoomType;
    linkedMeetingId?: string;
    participantIds?: string[];
    createdAt: string;
}

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string;
    reactions?: Record<string, string[]>;
}
