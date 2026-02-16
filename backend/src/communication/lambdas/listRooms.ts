import { APIGatewayProxyHandler } from 'aws-lambda';
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        // Query GSI1 where PK = "ROOMS"
        const command = new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "GSI1",
            KeyConditionExpression: "GSI1PK = :pk",
            ExpressionAttributeValues: {
                ":pk": "ROOMS"
            }
        });

        const result = await docClient.send(command);

        // Also, we want to include the "General" room manually if it's not in DB, 
        // to ensure it always exists in the list for the UI.
        const generalRoom = {
            id: 'general',
            name: 'General Lobby',
            topic: 'The common area',
            type: 'ADHOC',
            createdAt: new Date().toISOString() // Mock
        };

        const rooms = result.Items ? [...result.Items] : [];
        // Add general if not present (though 'general' is hardcoded in frontend for now)
        // Let's just return the DB rooms. Frontend handles "General".

        return createResponse(200, { rooms });

    } catch (error) {
        console.error("Error in listRooms:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
