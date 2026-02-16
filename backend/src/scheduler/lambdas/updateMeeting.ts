import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { z } from 'zod';

const UpdateMeetingSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    invitedEmails: z.array(z.string().email()).optional(),
});

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const meetingId = event.pathParameters?.id;
        if (!meetingId) {
            return createResponse(400, { error: "Missing meetingId" });
        }

        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        const authorizer = event.requestContext.authorizer;
        if (!authorizer) {
            return createResponse(401, { error: "Unauthorized" });
        }

        const userId = authorizer.principalId;
        const userName = authorizer.displayName || 'Unknown';

        // Validate input
        const body = JSON.parse(event.body);
        const parseResult = UpdateMeetingSchema.safeParse(body);
        if (!parseResult.success) {
            return createResponse(400, { error: "Invalid input", details: parseResult.error.issues });
        }

        // Check meeting exists and user is creator
        const { Item: meeting } = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" }
        }));

        if (!meeting) {
            return createResponse(404, { error: "Meeting not found" });
        }

        if (meeting.creatorId !== userId) {
            return createResponse(403, { error: "Only the creator can edit this meeting" });
        }

        // Build dynamic update expression
        const { title, description, invitedEmails } = parseResult.data;
        let updateExp = "SET";
        const expValues: Record<string, any> = {};
        const expNames: Record<string, string> = {};
        const changes: string[] = [];

        if (title !== undefined) {
            updateExp += " #t = :t,";
            expValues[":t"] = title;
            expNames["#t"] = "title";
            changes.push(`Titel ändrad till "${title}"`);
        }

        if (description !== undefined) {
            updateExp += " #d = :d,";
            expValues[":d"] = description;
            expNames["#d"] = "description";
            changes.push("Beskrivning uppdaterad");
        }

        if (invitedEmails !== undefined) {
            updateExp += " invitedEmails = :ie,";
            expValues[":ie"] = invitedEmails;
            changes.push(`Inbjudna uppdaterade (${invitedEmails.length} st)`);
        }

        if (Object.keys(expValues).length === 0) {
            return createResponse(400, { error: "No fields to update" });
        }

        // Remove trailing comma
        updateExp = updateExp.slice(0, -1);

        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" },
            UpdateExpression: updateExp,
            ExpressionAttributeValues: expValues,
            ...(Object.keys(expNames).length > 0 && { ExpressionAttributeNames: expNames })
        }));

        // Write activity log entry
        const now = new Date().toISOString();
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `MEETING#${meetingId}`,
                SK: `LOG#${now}`,
                type: 'UPDATED',
                message: changes.join('. '),
                userId,
                userName,
                timestamp: now
            }
        }));

        return createResponse(200, { message: "Meeting updated" });

    } catch (error) {
        console.error("Error in updateMeeting:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
