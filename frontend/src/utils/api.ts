

const rawApiUrl = import.meta.env.VITE_API_URL || '';
const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

class ApiClient {
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
    }

    async get(endpoint: string) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint: string, body: any) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async put(endpoint: string, body: any) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async patch(endpoint: string, body: any) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
    }

    async deleteEndpoint(endpoint: string, body?: any) {
        return this.request(endpoint, {
            method: 'DELETE',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    // Auth
    async requestAccess(email: string) {
        return this.post('/auth/request-access', { email });
    }

    async verifyLink(token: string) {
        return this.post('/auth/verify', { token });
    }

    async resendLink(token: string) {
        return this.post('/auth/resend', { token });
    }

    // Chat / Rooms
    async createRoom(name: string, topic?: string, type: 'ADHOC' | 'MEETING' | 'DM' = 'ADHOC', participantIds?: string[]) {
        return this.post('/chat/rooms', { name, topic, type, participantIds });
    }

    async listRooms() {
        return this.get('/chat/rooms');
    }

    async listUsers() {
        return this.get('/users');
    }

    async deleteMessage(roomId: string, timestamp: string, messageId: string) {
        return this.deleteEndpoint('/chat/messages', { roomId, timestamp, messageId });
    }

    async sendMessage(roomId: string, content: string, senderId: string, senderName: string) {
        return this.post('/chat/messages', { roomId, content, senderId, senderName });
    }

    async updateMeeting(id: string, data: { title?: string; description?: string; invitedEmails?: string[] }) {
        return this.patch(`/meetings/${id}`, data);
    }

    async decideMeeting(id: string, slotId: string) {
        return this.post(`/meetings/${id}/decide`, { slotId });
    }

    async deleteMeeting(meetingId: string) {
        return this.deleteEndpoint(`/meetings/${meetingId}`);
    }

    async deleteRoom(roomId: string) {
        return this.deleteEndpoint(`/chat/rooms/${roomId}`);
    }

    async getMessages(roomId: string, limit: number = 50) {
        return this.get(`/chat/messages/${roomId}?limit=${limit}`);
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
        };

        const response = await fetch(`${API_URL}${endpoint}`, config);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
            const err = new Error(errorBody.error || `Request failed with status ${response.status}`);
            (err as any).data = errorBody;
            (err as any).details = errorBody.details;
            (err as any).status = response.status;
            throw err;
        }

        return response.json();
    }
}

export const api = new ApiClient();
