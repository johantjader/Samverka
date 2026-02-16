import { APIGatewayProxyHandler } from 'aws-lambda';
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const roomId = event.pathParameters?.roomId;
        const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit) : 50;

        if (!roomId) {
            return createResponse(400, { error: "Missing roomId" });
        }

        const command = new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `ROOM#${roomId}`,
                ":sk": "MSG#"
            },
            ScanIndexForward: true, // Oldest first (chat log style)
            Limit: limit
        });

        const result = await docClient.send(command);

        return createResponse(200, { messages: result.Items || [] });

    } catch (error) {
        console.error("Error in getMessages:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
