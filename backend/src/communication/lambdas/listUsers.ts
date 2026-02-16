import { APIGatewayProxyHandler } from 'aws-lambda';
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        // Scans for all profiles
        // Note: In production, scanning is expensive. Use GSI preferably.
        // Assuming profiles have PK starting with USER# and SK="PROFILE"
        // Or if we have a GSI for users.
        // Let's scan for SK="PROFILE".

        const command = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: "SK = :sk",
            ExpressionAttributeValues: {
                ":sk": "PROFILE"
            }
        });

        const response = await docClient.send(command);

        // Map to simpler user objects
        // IMPORTANT: Use item.id (UUID) as the canonical user identifier.
        // This matches authorizer.principalId (which comes from JWT userId = UUID).
        // Do NOT use item.PK.replace('USER#', '') — that gives email, causing format mismatches.
        const users = (response.Items || []).map(item => ({
            id: item.id || item.PK.replace('USER#', ''), // Prefer UUID, fallback to email
            displayName: item.displayName || item.email,
            email: item.email,
            role: item.role
        }));

        return createResponse(200, { users });

    } catch (error) {
        console.error("Error listing users:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
