import { APIGatewayProxyHandler } from 'aws-lambda';
import { DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        const { roomId, timestamp, messageId } = JSON.parse(event.body);

        if (!roomId || !timestamp || !messageId) {
            return createResponse(400, { error: "Missing required fields (roomId, timestamp, messageId)" });
        }

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

        // Key Construction:
        // In sendMessage.ts: PK: `ROOM#${roomId}`, SK: `MSG#${now}#${messageId}`
        const pk = `ROOM#${roomId}`;
        const sk = `MSG#${timestamp}#${messageId}`;

        // 1. Verify Ownership
        const getCmd = new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: pk, SK: sk }
        });

        const getResult = await docClient.send(getCmd);

        if (!getResult.Item) {
            return createResponse(404, { error: "Message not found" });
        }

        if (getResult.Item.senderId !== userId) {
            return createResponse(403, { error: "You can only delete your own messages" });
        }

        // 2. Delete
        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: pk, SK: sk }
        }));

        return createResponse(200, { message: "Deleted" });

    } catch (error) {
        console.error("Error in deleteMessage:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
