import { APIGatewayProxyHandler } from 'aws-lambda';
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { v4 as uuidv4 } from 'uuid';
import { createResponse, maskEmail, docClient, TABLE_NAME } from '../shared/utils';
import { Meeting } from '../scheduler/models';

const LOGICAL_TTL_SECONDS = 24 * 60 * 60; // 24 hours logical validity
const RETENTION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days data retention

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        const { token } = JSON.parse(event.body);

        if (!token) {
            return createResponse(400, { error: "Missing token" });
        }

        // 1. Lookup old token to get email + meetingId
        const tokenGet = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TOKEN#${token}`, SK: "METADATA" }
        }));

        if (!tokenGet.Item) {
            return createResponse(404, { error: "Token not found" });
        }

        const { email, meetingId } = tokenGet.Item;

        // 2. Verify meeting still exists
        const meetingGet = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" }
        }));

        const meeting = meetingGet.Item as Meeting | undefined;
        if (!meeting) {
            return createResponse(404, { error: "Meeting not found" });
        }

        // 3. Generate new token
        const newToken = uuidv4();
        const logicalExpiresAt = Math.floor(Date.now() / 1000) + LOGICAL_TTL_SECONDS;
        const expiresAt = Math.floor(Date.now() / 1000) + RETENTION_TTL_SECONDS;

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `TOKEN#${newToken}`,
                SK: "METADATA",
                type: "ACCESS_TOKEN",
                status: "ACTIVE",
                email,
                meetingId,
                logicalExpiresAt,
                expiresAt
            }
        }));

        // 4. Send email with new link
        const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const frontendUrl = rawFrontendUrl.endsWith('/') ? rawFrontendUrl.slice(0, -1) : rawFrontendUrl;
        const magicLink = `${frontendUrl}/auth/verify?token=${newToken}`;

        if (process.env.SOURCE_EMAIL) {
            const ses = new SESClient({ region: process.env.AWS_REGION });
            await ses.send(new SendEmailCommand({
                Source: process.env.SOURCE_EMAIL,
                Destination: { ToAddresses: [email] },
                Message: {
                    Subject: { Data: `Ny inloggningslänk: ${meeting.title}` },
                    Body: {
                        Html: {
                            Data: `
                                <h1>Här är din nya länk!</h1>
                                <p>Du begärde en ny inloggningslänk till mötet: <strong>${meeting.title}</strong></p>
                                <p>Klicka på länken nedan för att komma in:</p>
                                <p><a href="${magicLink}">Gå till mötet</a></p>
                                <p><small>Länken är giltig i 24 timmar.</small></p>
                            `
                        },
                        Text: { Data: `Ny inloggningslänk: ${magicLink}` }
                    }
                }
            }));
        } else {
            console.log("[SIMULATION] Resend link generated (SES not configured)");
        }

        return createResponse(200, {
            message: "New link sent",
            email: maskEmail(email)
        });

    } catch (error) {
        console.error("Error in resend-link:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
