import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import * as jwt from 'jsonwebtoken';
import { createResponse, maskEmail, docClient, TABLE_NAME } from '../shared/utils';
import { Meeting } from '../scheduler/models';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        const { token } = JSON.parse(event.body);

        if (!token) {
            return createResponse(400, { error: "Missing token" });
        }

        // 1. Lookup Token
        const tokenGet = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TOKEN#${token}`, SK: "METADATA" }
        }));

        if (!tokenGet.Item) {
            return createResponse(403, { error: "TOKEN_NOT_FOUND" });
        }

        const { email, meetingId, status, logicalExpiresAt, expiresAt } = tokenGet.Item;

        // 2. Check if already used (single-use)
        if (status === 'USED') {
            return createResponse(403, {
                error: "TOKEN_USED",
                email: maskEmail(email),
                meetingId
            });
        }

        // 3. Check logical expiry (fall back to expiresAt for legacy tokens without logicalExpiresAt)
        const effectiveExpiry = logicalExpiresAt || expiresAt;
        if (effectiveExpiry && Date.now() / 1000 > effectiveExpiry) {
            return createResponse(403, {
                error: "TOKEN_EXPIRED",
                email: maskEmail(email),
                meetingId
            });
        }

        // 4. Determine Role (Fetch Meeting)
        const meetingGet = await docClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" }
        }));

        const meeting = meetingGet.Item as Meeting | undefined;
        if (!meeting) {
            return createResponse(404, { error: "Meeting not found" });
        }

        // Role Logic: Creator is ADMIN, everyone else is PARTICIPANT
        const isCreator = meeting.creatorEmail && meeting.creatorEmail.toLowerCase() === email.toLowerCase();
        const role = isCreator ? 'ADMIN' : 'PARTICIPANT';

        // Derive displayName: creator has name stored on meeting, participants use email prefix
        const displayName = isCreator && meeting.creatorName
            ? meeting.creatorName
            : email.split('@')[0];

        // 5. Generate JWT
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT_SECRET is not defined");
        }

        // Session valid for 24 hours
        const sessionToken = jwt.sign(
            {
                userId: email,
                meetingId,
                email,
                displayName,
                role,
                sub: email
            },
            jwtSecret,
            { expiresIn: '24h' }
        );

        // 6. Mark Token as Used (soft-expiry — keep for resend flow)
        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `TOKEN#${token}`, SK: "METADATA" },
            UpdateExpression: 'SET #status = :used, usedAt = :now',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
                ':used': 'USED',
                ':now': new Date().toISOString()
            }
        }));

        return createResponse(200, {
            token: sessionToken,
            meetingId,
            role,
            email
        });

    } catch (error) {
        console.error("Error in verify-access:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
