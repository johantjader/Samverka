import { APIGatewayProxyHandler } from 'aws-lambda';
import { DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const meetingId = event.pathParameters?.id;
        if (!meetingId) {
            return createResponse(400, { error: "Missing meetingId" });
        }

        // Trust the Authorizer
        if (!event.requestContext.authorizer) {
            return {
                statusCode: 401,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Missing authorizer context" }),
            };
        }
        const userId = event.requestContext.authorizer.principalId;
        if (!userId) {
            return createResponse(401, { error: "Unauthorized" });
        }

        // 1. Get Meeting to verify ownership
        const getCmd = new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" }
        });
        const getResult = await docClient.send(getCmd);

        if (!getResult.Item) {
            return createResponse(404, { error: "Meeting not found" });
        }

        if (getResult.Item.creatorId !== userId) {
            return createResponse(403, { error: "Only the creator can delete this meeting" });
        }

        // 2. Soft Delete (Set TTL or Status)
        // For now, let's just delete the METADATA item so it disappears from lists.
        // Ideally we should delete all related items (Slots, Votes), but that requires Query+BatchWrite.
        // A "Soft Delete" by setting a flag is safer, but requires filtering in listMeetings.
        // Let's go with DELETE METADATA for now to make it disappear effectively.
        // Wait, if we delete METADATA, listMeetings (which queries GSI1) might still find it if GSI1 is not updated?
        // GSI1 is projected from the item. If we delete the item, GSI1 entry is gone.

        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" }
        }));

        return createResponse(200, { message: "Meeting deleted" });

    } catch (error) {
        console.error("Error in deleteMeeting:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
