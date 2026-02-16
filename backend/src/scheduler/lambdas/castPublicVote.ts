import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { Vote, VoteStatus } from '../models';

/**
 * Public endpoint — NO authorizer required.
 * Allows guests to cast votes on public meetings by providing their name.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        const { meetingId, slotId, status, guestName } = JSON.parse(event.body);

        if (!meetingId || !slotId || !status) {
            return createResponse(400, { error: "Missing required fields (meetingId, slotId, status)" });
        }

        if (!guestName || typeof guestName !== 'string' || guestName.trim().length === 0) {
            return createResponse(400, { error: "Guest name is required" });
        }

        if (!Object.values(VoteStatus).includes(status)) {
            return createResponse(400, { error: "Invalid status" });
        }

        // Verify meeting is public
        const { Item: meeting } = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `MEETING#${meetingId}`,
                SK: "METADATA"
            }
        }));

        if (!meeting) {
            return createResponse(404, { error: "Meeting not found" });
        }

        if (!meeting.isPublic) {
            return createResponse(403, { error: "This meeting is private. Please log in to vote." });
        }

        const trimmedName = guestName.trim();
        // Deterministic guest ID: same name always maps to same ID
        // This prevents duplicate votes — voting again overwrites the previous vote
        const guestId = `guest-${trimmedName.toLowerCase().replace(/\s+/g, '-')}`;
        const now = new Date().toISOString();
        const expiresAt = meeting.expiresAt; // Clean inheritance

        const voteItem: Vote & { PK: string; SK: string; GSI1PK: string; GSI1SK: string; expiresAt?: number } = {
            PK: `MEETING#${meetingId}`,
            SK: `VOTE#${slotId}#${guestId}`,
            GSI1PK: `USER#${guestId}`,
            GSI1SK: `VOTE#${meetingId}`,
            slotId,
            userId: guestId,
            userName: `${trimmedName} (Gäst)`,
            status: status as VoteStatus,
            updatedAt: now,
            expiresAt: expiresAt
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: voteItem
        }));

        return createResponse(200, { message: "Vote cast", vote: voteItem });

    } catch (error) {
        console.error("Error in castPublicVote:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
