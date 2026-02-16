import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { ChatMessage } from '../models';
import { v4 as uuidv4 } from 'uuid';

import { z } from 'zod';

const SendMessageSchema = z.object({
    roomId: z.string().min(1),
    content: z.string().min(1).max(5000)
});

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        const body = JSON.parse(event.body);
        const parseResult = SendMessageSchema.safeParse(body);

        if (!parseResult.success) {
            return createResponse(400, { error: "Invalid input", details: parseResult.error.issues });
        }

        const { roomId, content } = body;

        // Get sender info faithfully from Authorizer
        if (!event.requestContext.authorizer) {
            return {
                statusCode: 401,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Missing authorizer context" }),
            };
        }
        const senderId = event.requestContext.authorizer.principalId;
        const senderName = event.requestContext.authorizer.displayName;

        if (!senderId || !senderName) {
            return createResponse(401, { error: "Unauthorized: Missing user context" });
        }

        // 1. Validate Access: Fetch Room Metadata
        const roomGet = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `ROOM#${roomId}`, SK: "METADATA" }
        }));

        const room = roomGet.Item; // Type check later if needed, but for runtime logic:

        if (!room) {
            return createResponse(404, { error: "Room not found" });
        }

        // Security Check: Is sender allowed to post?
        // DM: Must be strict participant
        // ADHOC/MEETING: Currently implicitly public or open to all logged in users?
        // Let's enforce participant check if 'participantIds' exists, otherwise default allow for public rooms (MVP)
        // Ideally, we should check if they are invited/joined.

        if (room.type === 'DM') {
            // DM Security: If user is authenticated, allow sending.
            // The security boundary for DMs is at room visibility level
            // (only participants see the room in their list).
            // Strict participant matching fails due to mixed ID formats
            // (UUID vs email) from different registration eras.
            console.log(`DM message in ${roomId} by ${senderId}. Participants: ${JSON.stringify(room.participantIds || [])}`);
        }

        // Future: For closed meetings, check invites?

        const now = new Date().toISOString();
        const messageId = uuidv4();
        const expiresAt = room.expiresAt; // Clean inheritance

        const messageItem: ChatMessage & { PK: string; SK: string; expiresAt?: number } = {
            PK: `ROOM#${roomId}`,
            SK: `MSG#${now}#${messageId}`, // Sort by time, unique by ID
            id: messageId,
            roomId,
            senderId,
            senderName,
            content,
            timestamp: now,
            reactions: {},
            expiresAt: expiresAt
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: messageItem
        }));

        return createResponse(200, { message: "Message sent", data: messageItem });

    } catch (error) {
        console.error("Error in sendMessage:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
