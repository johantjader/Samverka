import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { MeetingDetails, TimeSlot, Vote } from '../models';

/**
 * Public endpoint — NO authorizer required.
 * Returns meeting details only if the meeting is marked as isPublic.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const meetingId = event.pathParameters?.id;

        if (!meetingId) {
            return createResponse(400, { error: "Missing meetingId" });
        }

        // 1. Get Metadata
        const metadataResult = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" }
        }));

        if (!metadataResult.Item) {
            return createResponse(404, { error: "Meeting not found" });
        }

        const meeting = metadataResult.Item as any;

        // Access Control: Only public meetings
        if (!meeting.isPublic) {
            return createResponse(403, { error: "This meeting is private. Please log in to access it." });
        }

        // 2. Get Slots & Votes
        const [slotsResult, votesResult] = await Promise.all([
            docClient.send(new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues: {
                    ":pk": `MEETING#${meetingId}`,
                    ":sk": "SLOT#"
                }
            })),
            docClient.send(new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues: {
                    ":pk": `MEETING#${meetingId}`,
                    ":sk": "VOTE#"
                }
            }))
        ]);

        const slots = (slotsResult.Items || []) as TimeSlot[];
        const votes = (votesResult.Items || []) as Vote[];

        const response: MeetingDetails = {
            ...meeting,
            slots,
            votes
        };

        return createResponse(200, response);

    } catch (error) {
        console.error("Error in getPublicMeeting:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
