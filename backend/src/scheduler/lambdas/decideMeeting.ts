import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, UpdateCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { MeetingStatus } from '../models';
import { generateIcsContent } from '../../shared/icalUtils';
import { getLocale, t, formatDate, Language } from '../../shared/locale';

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

        const { slotId } = JSON.parse(event.body);
        if (!slotId) {
            return createResponse(400, { error: "Missing slotId" });
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
            return createResponse(403, { error: "Only the creator can decide the meeting time" });
        }

        if (meeting.status === MeetingStatus.DECIDED) {
            return createResponse(400, { error: "Meeting is already decided" });
        }

        const now = new Date().toISOString();
        const newExpiresAt = Math.floor(Date.now() / 1000) + (14 * 24 * 60 * 60); // 14 days from now

        // Get Language
        const lang: Language = (meeting.language as Language) || 'sv';
        const dict = getLocale(lang);

        // Update meeting with decided status
        await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `MEETING#${meetingId}`, SK: "METADATA" },
            UpdateExpression: "SET #s = :s, lockedSlotId = :sl, decidedAt = :da, decidedBy = :db, expiresAt = :exp",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: {
                ":s": MeetingStatus.DECIDED,
                ":sl": slotId,
                ":da": now,
                ":db": userName,
                ":exp": newExpiresAt
            }
        }));

        // Write activity log entry
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `MEETING#${meetingId}`,
                SK: `LOG#${now}`,
                type: 'DECIDED',
                message: t(dict.decide.activityLog, { userName }),
                userId,
                userName,
                timestamp: now,
                expiresAt: newExpiresAt
            }
        }));

        // --- iCal Integration Phase 7 ---
        // 1. Fetch Meeting Details & Slots to get the decided time
        const slotsQuery = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `MEETING#${meetingId}`,
                ":sk": "SLOT#"
            }
        }));

        const decidedSlot = slotsQuery.Items?.find(s => s.id === slotId);

        if (decidedSlot) {
            // 2. Fetch Participants (Votes and Invites)
            // We need unique emails. 
            // - Creator (meeting.creatorId/email)
            // - Voters (GSI1)
            // - Invites (INVITE# items)

            // Getting ALL items for the meeting to parse participants
            const meetingItemsQuery = await docClient.send(new QueryCommand({
                TableName: TABLE_NAME,
                KeyConditionExpression: "PK = :pk",
                ExpressionAttributeValues: { ":pk": `MEETING#${meetingId}` }
            }));

            const allItems = meetingItemsQuery.Items || [];
            const uniqueParticipants = new Map<string, { email: string; name: string }>();

            // Add Creator (if we have email)
            if (meeting.createdBy) { // Assuming createMeeting stores createdBy as email or we have it. 
                // Wait, createList stores createdBy as email in GSI, but let's check metadata.
                // createMeeting sets: createdBy: normalizedCreatorEmail
                uniqueParticipants.set(meeting.createdBy, { email: meeting.createdBy, name: meeting.creatorName || 'Arrangör' });
            }

            // Parse Invites and Votes
            allItems.forEach(item => {
                if (item.SK.startsWith('INVITE#') && item.email) {
                    uniqueParticipants.set(item.email, { email: item.email, name: 'Deltagare' });
                }
                if (item.SK.startsWith('VOTE#')) {
                    // Phase 7 Fix: Capture emails from Votes (Public guests via Magic Link)
                    if (item.userEmail) {
                        uniqueParticipants.set(item.userEmail, { email: item.userEmail, name: item.userName || 'Deltagare' });
                    }
                }
            });

            const recipients = Array.from(uniqueParticipants.values());

            if (recipients.length > 0 && process.env.SOURCE_EMAIL) {
                const startTime = new Date(decidedSlot.startTime);
                const endTime = new Date(decidedSlot.endTime);
                
                const formattedDate = formatDate(startTime, lang);

                const icalContent = generateIcsContent({
                    uid: `samverka-${meetingId}`,
                    startTime,
                    endTime,
                    summary: meeting.title,
                    description: meeting.description || t(dict.decide.text, { title: meeting.title, date: formattedDate }),
                    organizer: { name: meeting.creatorName || 'Samverka', email: process.env.SOURCE_EMAIL },
                    attendees: recipients,
                    url: `${process.env.FRONTEND_URL}/m/${meetingId}`
                });

                // 3. Send Emails via SES (Parallel)
                const ses = new SESClient({ region: process.env.AWS_REGION });

                // Sanitize Header Injection Risk
                const cleanTitle = meeting.title.replace(/[\r\n]+/g, ' ').trim();
                const subject = t(dict.decide.subject, { title: cleanTitle });

                const emailPromises = recipients.map(recipient => {
                    const boundary = `NextPart_${Date.now()}`;
                    const rawMessage = [
                        `From: "Samverka" <${process.env.SOURCE_EMAIL}>`,
                        `To: ${recipient.email}`,
                        `Subject: ${subject}`,
                        `MIME-Version: 1.0`,
                        `Content-Type: multipart/mixed; boundary="${boundary}"`,
                        ``,
                        `--${boundary}`,
                        `Content-Type: text/html; charset=UTF-8`,
                        ``,
                        `<html><body>`,
                        `<h2>${dict.decide.htmlHeader}</h2>`,
                        `<p>${t(dict.decide.htmlBody, { title: meeting.title, date: formattedDate })}</p>`,
                        `<p>${dict.decide.htmlFooter}</p>`,
                        `<p><a href="${process.env.FRONTEND_URL}/m/${meetingId}">${dict.common.goToMeeting}</a></p>`,
                        `</body></html>`,
                        ``,
                        `--${boundary}`,
                        `Content-Type: text/calendar; charset=UTF-8; method=REQUEST`,
                        `Content-Disposition: attachment; filename="invite.ics"`,
                        `Content-Transfer-Encoding: base64`,
                        ``,
                        Buffer.from(icalContent).toString('base64'),
                        ``,
                        `--${boundary}--`
                    ].join('\r\n');

                    return ses.send(new SendRawEmailCommand({
                        RawMessage: { Data: new TextEncoder().encode(rawMessage) }
                    }));
                });

await Promise.allSettled(emailPromises);
            }
        }

return createResponse(200, { message: "Meeting time decided", slotId });

    } catch (error) {
    console.error("Error in decideMeeting:", error);
    return createResponse(500, { error: "Internal Server Error" });
}
};
