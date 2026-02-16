import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { MeetingDetails, TimeSlot, Vote, ActivityLogEntry } from '../models';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const meetingId = event.pathParameters?.id;

        if (!meetingId) {
            return createResponse(400, { error: "Missing meetingId" });
        }

        // 1. Get Metadata
        const metadataPromise = docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" }
        }));

        // 2. Scan Slots & Votes (Query PK = MEETING#id)
        // We query everything for the meeting that isn't metadata to get slots and votes in one go if possible,
        // or just separate queries. For simplicity and since we have distinct SK prefixes:

        const slotsPromise = docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `MEETING#${meetingId}`,
                ":sk": "SLOT#"
            }
        }));

        const votesPromise = docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `MEETING#${meetingId}`,
                ":sk": "VOTE#"
            }
        }));

        const logsPromise = docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `MEETING#${meetingId}`,
                ":sk": "LOG#"
            }
        }));

        const [metadataResult, slotsResult, votesResult, logsResult] = await Promise.all([metadataPromise, slotsPromise, votesPromise, logsPromise]);

        if (!metadataResult.Item) {
            return createResponse(404, { error: "Meeting not found" });
        }

        const meeting = metadataResult.Item as any;

        // Access Control
        if (!event.requestContext.authorizer) {
            return {
                statusCode: 401,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Missing authorizer context" }),
            };
        }
        const authorizer = event.requestContext.authorizer;
        // If no authorizer, and we rely on public access, we need to handle that. 
        // But our API Gateway currently forces Authorization for this endpoint.
        // So we assume user is logged in.

        if (authorizer) {
            const userId = authorizer.userId;
            const userEmail = authorizer.email; // Ensure authorizer passes this (it does in our code)

            const isCreator = meeting.creatorId === userId;
            const isPublic = !!meeting.isPublic;
            const isInvited = Array.isArray(meeting.invitedEmails) && meeting.invitedEmails.includes(userEmail);

            if (!isCreator && !isPublic && !isInvited) {
                return createResponse(403, { error: "Access denied. You are not invited to this meeting." });
            }
        }

        const slots = (slotsResult.Items || []) as TimeSlot[];
        const votes = (votesResult.Items || []) as Vote[];
        const activityLog = ((logsResult.Items || []) as ActivityLogEntry[]).sort(
            (a, b) => a.timestamp.localeCompare(b.timestamp)
        );

        const response: MeetingDetails = {
            ...meeting,
            slots,
            votes,
            activityLog
        };

        return createResponse(200, response);

    } catch (error) {
        console.error("Error in getMeeting:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
