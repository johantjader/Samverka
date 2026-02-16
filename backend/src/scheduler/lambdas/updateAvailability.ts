import { APIGatewayProxyHandler } from 'aws-lambda';
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { z } from 'zod';

const AvailabilitySchema = z.object({
    weekdays: z.array(z.string()).optional(), // e.g., ["MON", "TUE"]
    hours: z.string().optional(), // e.g., "09:00-17:00"
    exceptions: z.array(z.string()).optional() // Dates
});

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        // Trust Authorizer
        if (!event.requestContext.authorizer) {
            return createResponse(401, { error: "Unauthorized" });
        }
        const userId = event.requestContext.authorizer.principalId;

        const body = JSON.parse(event.body);
        const parseResult = AvailabilitySchema.safeParse(body);

        if (!parseResult.success) {
            return createResponse(400, { error: "Invalid input", details: parseResult.error.issues });
        }

        const { weekdays, hours, exceptions } = body;
        const now = new Date().toISOString();

        // Store using Single Table Design
        // PK: USER#<userId>
        // SK: AVAILABILITY#DEFAULT (For general) or generic.
        // Let's stick to one default implementation for now.

        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                PK: `USER#${userId}`,
                SK: "AVAILABILITY#DEFAULT"
            },
            UpdateExpression: "set weekdays = :w, hours = :h, exceptions = :e, updatedAt = :u, GSI1PK = :gpk, GSI1SK = :gsk",
            ExpressionAttributeValues: {
                ":w": weekdays || [],
                ":h": hours || "09:00-17:00",
                ":e": exceptions || [],
                ":u": now,
                ":gpk": `AVAILABILITY#ALL`, // Allow searching all availabilities if needed (Architecture tip)
                ":gsk": `USER#${userId}`
            }
        }));

        return createResponse(200, { message: "Availability updated" });

    } catch (error) {
        console.error("Error in updateAvailability:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
