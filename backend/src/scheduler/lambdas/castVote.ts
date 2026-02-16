import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { Vote, VoteStatus, MeetingStatus } from '../models';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        const { meetingId, slotId, status, userId, userName } = JSON.parse(event.body);

        if (!meetingId || !slotId || !status) {
            return createResponse(400, { error: "Missing required fields (meetingId, slotId, status)" });
        }

        if (!Object.values(VoteStatus).includes(status)) {
            return createResponse(400, { error: "Invalid status" });
        }

        // Check if meeting is decided (locked)
        const { Item: meetingMeta } = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" }
        })) as { Item?: { status: string; expiresAt: number } };

        if (meetingMeta?.status === MeetingStatus.DECIDED) {
            return createResponse(400, { error: "Mötet är redan bestämt. Röstning stängd." });
        }

        // Check for logged-in user
        const authorizer = event.requestContext?.authorizer;
        let effectiveUserId = authorizer?.userId;
        let effectiveUserName = authorizer?.displayName;

        // If not logged in, handle guest access
        if (!effectiveUserId) {
            if (!userName) {
                return createResponse(401, { error: "Unauthorized. Please login or provide a name." });
            }

            // Verify Meeting is Public
            const { Item: meeting } = await docClient.send(new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `MEETING#${meetingId}`,
                    SK: "METADATA"
                }
            }));

            if (!meeting || !meeting.isPublic) {
                return createResponse(403, { error: "This meeting is private." });
            }

            // For guests, we can trust the client provided userName, but we should generate a userId or use a temporary one.
            // If the client didn't send a userId, generate one.
            effectiveUserId = userId || `guest-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            effectiveUserName = userName + ' (Guest)';
        } else {
            // If logged in, ensure we use their real ID
            if (!authorizer) {
                // Should not happen given the logic flow, but satisfies TS
                return createResponse(401, { error: "Missing authorizer context" });
            }
            effectiveUserId = authorizer.userId;
            effectiveUserName = authorizer.displayName;
        }

        const now = new Date().toISOString();
        const expiresAt = meetingMeta?.expiresAt; // Safe access

        const voteItem: Vote & { PK: string; SK: string; GSI1PK: string; GSI1SK: string; expiresAt?: number } = {
            PK: `MEETING#${meetingId}`,
            SK: `VOTE#${slotId}#${effectiveUserId}`,
            GSI1PK: `USER#${effectiveUserId}`,
            GSI1SK: `VOTE#${meetingId}`,
            slotId,
            userId: effectiveUserId,
            // Store Email if available (for iCal invites later)
            userEmail: authorizer?.email,
            userName: effectiveUserName || 'Anonymous',
            status: status as VoteStatus,
            updatedAt: now,
            expiresAt: expiresAt // Inherit TTL
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: voteItem
        }));

        // Write activity log entry
        const statusLabel = status === VoteStatus.YES ? 'Ja' : status === VoteStatus.MAYBE ? 'Kanske' : 'Nej';
        const logNow = new Date().toISOString();
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `MEETING#${meetingId}`,
                SK: `LOG#${logNow}`,
                type: 'VOTE',
                message: `${effectiveUserName} svarade ${statusLabel}`,
                userId: effectiveUserId,
                userName: effectiveUserName || 'Anonymous',
                timestamp: logNow,
                expiresAt: expiresAt // Inherit TTL
            }
        }));

        return createResponse(200, { message: "Vote cast", vote: voteItem });

    } catch (error) {
        console.error("Error in castVote:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
