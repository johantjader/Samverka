import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { v4 as uuidv4 } from 'uuid';
import { createResponse, docClient, TABLE_NAME } from '../shared/utils';
import { Meeting } from '../scheduler/models';

const LOGICAL_TTL_SECONDS = 24 * 60 * 60; // 24 hours logical validity
const RETENTION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days data retention

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        const { email, meetingId } = JSON.parse(event.body);

        if (!email || !meetingId) {
            return createResponse(400, { error: "Missing email or meetingId" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Verify Meeting Exists
        const meetingGet = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" }
        }));

        const meeting = meetingGet.Item as Meeting | undefined;

        if (!meeting) {
            return createResponse(404, { error: "Meeting not found" });
        }

        // 2. Generate Access Token (Magic Link)
        const token = uuidv4();
        const logicalExpiresAt = Math.floor(Date.now() / 1000) + LOGICAL_TTL_SECONDS;
        const expiresAt = Math.floor(Date.now() / 1000) + RETENTION_TTL_SECONDS;

        // 3. Store Token
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `TOKEN#${token}`,
                SK: "METADATA",
                type: "ACCESS_TOKEN",
                status: "ACTIVE",
                email: normalizedEmail,
                meetingId: meetingId,
                logicalExpiresAt: logicalExpiresAt,
                expiresAt: expiresAt
            }
        }));

        // 4. Send Email via SES
        const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const frontendUrl = rawFrontendUrl.endsWith('/') ? rawFrontendUrl.slice(0, -1) : rawFrontendUrl;

        // New Route: /auth/verify?token=...
        const magicLink = `${frontendUrl}/auth/verify?token=${token}`;

        if (process.env.SOURCE_EMAIL) {
            const ses = new SESClient({ region: process.env.AWS_REGION });
            await ses.send(new SendEmailCommand({
                Source: process.env.SOURCE_EMAIL,
                Destination: { ToAddresses: [normalizedEmail] },
                Message: {
                    Subject: { Data: `Inloggning till möte: ${meeting.title}` },
                    Body: {
                        Html: {
                            Data: `
                                <h1>Dags att samverka!</h1>
                                <p>Du har blivit inbjuden att delta i mötet: <strong>${meeting.title}</strong></p>
                                <p>Klicka på länken nedan för att komma in:</p>
                                <p><a href="${magicLink}">Gå till mötet</a></p>
                                <p><small>Länken är giltig i 24 timmar.</small></p>
                            `
                        },
                        Text: { Data: `Gå till mötet här: ${magicLink}` }
                    }
                }
            }));
        } else {
            console.log("[SIMULATION] Access link generated (SES not configured)");
        }

        return createResponse(200, { message: "Access link sent" });

    } catch (error) {
        console.error("Error in request-access:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
