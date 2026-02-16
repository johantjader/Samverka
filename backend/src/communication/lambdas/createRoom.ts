import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { v4 as uuidv4 } from 'uuid';
import { ChatRoom, RoomType } from '../models';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        // Get creator from authorizer
        const createdBy = event.requestContext?.authorizer?.principalId || 'unknown';

        const { name, topic, type, participantIds } = JSON.parse(event.body);
        if (!name && (!type || type !== 'DM')) {
            if (!name) return createResponse(400, { error: "Name is required" });
        }

        const roomId = uuidv4();
        const now = new Date().toISOString();
        const roomType = type || RoomType.ADHOC;
        const expiresAt = Math.floor(Date.now() / 1000) + (60 * 24 * 60 * 60); // 60 days default

        // For DMs, ensure the creator is included in participantIds
        let finalParticipantIds = participantIds || [];
        if (roomType === RoomType.DM && createdBy !== 'unknown') {
            if (!finalParticipantIds.includes(createdBy)) {
                finalParticipantIds = [createdBy, ...finalParticipantIds];
            }
        }

        const roomItem: ChatRoom & { PK: string; SK: string; GSI1PK: string; GSI1SK: string; topic?: string; participantIds?: string[]; createdBy: string; expiresAt: number } = {
            PK: `ROOM#${roomId}`,
            SK: "METADATA",
            GSI1PK: "ROOMS",
            GSI1SK: `ROOM#${now}`,
            id: roomId,
            name,
            topic,
            type: roomType,
            participantIds: finalParticipantIds,
            createdBy,
            createdAt: now,
            expiresAt: expiresAt
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: roomItem
        }));

        return createResponse(201, { room: roomItem });

    } catch (error) {
        console.error("Error in createRoom:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
