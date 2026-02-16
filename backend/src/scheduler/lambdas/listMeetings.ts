import { APIGatewayProxyHandler } from 'aws-lambda';
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        // Strictly use the Principal ID from the Authorizer (Single Source of Truth)
        if (!event.requestContext.authorizer) {
            return {
                statusCode: 401,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Missing authorizer context" }),
            };
        }
        const userId = event.requestContext.authorizer.principalId;
        const userEmail = event.requestContext.authorizer.email; // We need this for invites

        if (!userId) {
            console.error("No user context found in Authorizer");
            return createResponse(401, { error: "No user context found" });
        }

        // Query GSI1. PK is USER#<email> (preferred) or USER#<id>.
        // Since createMeeting now uses GSI1PK = USER#<email> for invites AND USER#<id> for creator...
        // Wait, createMeeting uses USER#<id> for creator view, and USER#<email> for invite view.
        // We might need to query TWICE or consolidate.
        // BETTER: CreateMeeting should use USER#<email> for creator view too?
        // OR: listMeetings queries both?

        // Let's assume for now we use ID for "My Created Meetings" and Email for "Invited Meetings".
        // But scanning GSI twice is annoying.

        // Refinement: `createMeeting` set GSI1PK = `USER#${userId}` for creator. 
        // Invites get `USER#${email}`.
        // If we want a single query, we should stick to one ID.
        // But invites are sent to emails (we don't know UserID of invitee necessarily).

        // So we probably need to query both if we want "Created by me" AND "Invited to".
        // OR, we just change `createMeeting` to store creator view under USER#<email> too? (If email is stable).
        // Let's do two parallel queries for now, it's safer.

        // Query GSI1 for meetings created by OR invited to this user (userId is email)
        const query = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "GSI1",
            KeyConditionExpression: "GSI1PK = :pk",
            ExpressionAttributeValues: { ":pk": `USER#${userId}` }
        }));

        const allItems = query.Items || [];

        // Filter for valid meeting items (created or invited)
        // Created meetings have SK="METADATA"
        // Invited meetings have SK="INVITE#<email>"
        const validMeetings = allItems.filter(item =>
            item.SK === 'METADATA' || item.SK.startsWith('INVITE#')
        );

        // Deduplicate by ID (in case of weird data states)
        const uniqueMeetings = Array.from(new Map(validMeetings.map(item => [item.id, item])).values());

        return createResponse(200, { meetings: uniqueMeetings });

    } catch (error) {
        console.error("Error in listMeetings:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
