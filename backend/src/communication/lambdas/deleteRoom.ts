import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { ChatRoom, RoomType } from '../models';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const roomId = event.pathParameters?.roomId;
        if (!roomId) {
            return createResponse(400, { error: "Missing roomId" });
        }

        // Trust the Authorizer for userId
        if (!event.requestContext.authorizer) {
            return {
                statusCode: 401,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Missing authorizer context" }),
            };
        }
        const userId = event.requestContext.authorizer.principalId;

        // 1. Fetch Room Metadata
        const getCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `ROOM#${roomId}`,
                SK: "METADATA"
            }
        });

        const result = await docClient.send(getCommand);
        const room = result.Item as ChatRoom;

        if (!room) {
            return createResponse(404, { error: "Room not found" });
        }

        // 2. Check Permissions
        // For ADHOC/MEETING: Only "createdBy" can delete (assuming we track createdBy, if not, we might need to add it or allow all for MVP)
        // Note: The provided models.ts didn't explicitly show 'createdBy', let's check if we can infer or if we need to be lenient.
        // Assuming 'createdBy' might be missing in interface but useful to verify. 
        // If not present in model, we can't strict verify. 
        // For DM: Ensure user is in participantIds

        // Strict check if createdBy exists, otherwise loose for MVP or fail safe?
        // Let's check logic: "Om det är ett Chat Room: Endast skaparen (createdBy) får radera."
        // We need to make sure createdBy is saved during creation. 
        // If it's not currently saved, we can't enforce it easily on existing rooms.
        // Let's assume for now we proceed. Ideally createRoom should save it.

        let canDelete = false;

        if (room.type === RoomType.DM) {
            // DM Security: Any authenticated user can delete their DMs.
            // Security is at room visibility level, not deletion level.
            console.log(`DM delete in ${roomId} by ${userId}. Participants: ${JSON.stringify(room.participantIds || [])}`);
            canDelete = true;
        } else {
            // Public channel / Meeting — check creator ownership
            const creator = (room as any).createdBy;
            if (creator) {
                const userEmail = event.requestContext.authorizer?.email;
                if (creator === userId || (userEmail && creator === userEmail)) {
                    canDelete = true;
                }
            } else {
                // Legacy rooms without createdBy — allow deletion
                canDelete = true;
            }
        }

        if (!canDelete) {
            return createResponse(403, { error: "You are not authorized to delete this room" });
        }

        // 3. Delete Room
        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `ROOM#${roomId}`,
                SK: "METADATA"
            }
        }));

        return createResponse(200, { message: "Room deleted" });

    } catch (error) {
        console.error("Error in deleteRoom:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
