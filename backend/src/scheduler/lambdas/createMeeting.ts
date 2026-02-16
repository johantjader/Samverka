import { APIGatewayProxyHandler } from 'aws-lambda';
import { BatchWriteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { v4 as uuidv4 } from 'uuid';
import { createResponse, docClient, TABLE_NAME } from '../../shared/utils';
import { getLocale, t, formatDate, Language } from '../../shared/locale';

import { z } from 'zod';

const CreateMeetingSchema = z.object({
    title: z.string().min(1).max(200).transform(val => val.trim()),
    description: z.string().optional().transform(val => val?.trim()),
    slots: z.array(z.object({
        startTime: z.string().datetime(),
        endTime: z.string().datetime()
    })).min(1),
    isPublic: z.boolean().optional(),
    invitedEmails: z.array(z.string().email().transform(val => val.trim().toLowerCase())).optional(),
    creatorEmail: z.string().email().transform(val => val.trim().toLowerCase()),
    creatorName: z.string().min(1).transform(val => val.trim()),
    language: z.enum(['sv', 'en']).optional().default('sv')
}).superRefine((data, ctx) => {
    const now = new Date();
    const toleranceMs = 10 * 60 * 1000; // 10 minutes tolerance
    data.slots.forEach((slot, i) => {
        const startTime = new Date(slot.startTime);
        if (startTime.getTime() < now.getTime() - toleranceMs) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Meeting slot must be in the future",
                path: ['slots', i, 'startTime'],
            });
        }
    });
});

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        if (!event.body) {
            return createResponse(400, { error: "Missing body" });
        }

        const body = JSON.parse(event.body);
        const parseResult = CreateMeetingSchema.safeParse(body);

        if (!parseResult.success) {
            console.log("Zod validation failed:", JSON.stringify(parseResult.error.issues, null, 2));
            return createResponse(400, { error: "Invalid input", details: parseResult.error.issues });
        }

        const { title, description, slots, isPublic, invitedEmails, creatorEmail, creatorName, language } = parseResult.data;

        // Schema now auto-sanitizes: trim() + toLowerCase() for emails, trim() for strings
        const normalizedCreatorEmail = creatorEmail; // Already normalized by schema
        const effectiveCreatorName = creatorName; // Now required, already trimmed
        const lang: Language = language as Language;
        const dict = getLocale(lang);

        const meetingId = uuidv4();
        const now = new Date().toISOString();
        const expiresAt = Math.floor(Date.now() / 1000) + (60 * 24 * 60 * 60); // 60 days

        // Calculate start and end dates from slots
        const sortedSlots = slots.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
        const startDate = sortedSlots[0]?.startTime;
        const endDate = sortedSlots[sortedSlots.length - 1]?.endTime;

        // 1. Prepare Meeting Metadata Item
        const meetingItem = {
            PK: `MEETING#${meetingId}`,
            SK: "METADATA",
            GSI1PK: `USER#${normalizedCreatorEmail}`,
            GSI1SK: `MEETING#${now}`,
            id: meetingId,
            title,
            description,
            creatorId: normalizedCreatorEmail,
            creatorName: effectiveCreatorName,
            creatorEmail: normalizedCreatorEmail,
            createdAt: now,
            startDate,
            endDate,
            isPublic: !!isPublic,
            invitedEmails: Array.isArray(invitedEmails) ? invitedEmails : [],
            status: 'OPEN',
            language: lang, // Store language preference
            expiresAt: expiresAt
        };

        // 2. Prepare Time Slot Items
        const slotItems = slots.map((s: any) => ({
            PK: `MEETING#${meetingId}`,
            SK: `SLOT#${s.startTime}`,
            id: uuidv4(),
            meetingId,
            startTime: s.startTime,
            endTime: s.endTime,
            proposedBy: normalizedCreatorEmail,
            expiresAt: expiresAt
        }));

        // 3. Prepare Invite Items
        const validInvites = Array.isArray(invitedEmails)
            ? [...new Set(invitedEmails)].filter((email: string) => email.toLowerCase() !== normalizedCreatorEmail)
            : [];

        const inviteItems = validInvites.map((email: string) => ({
            PK: `MEETING#${meetingId}`,
            SK: `INVITE#${email}`,
            GSI1PK: `USER#${email}`,
            GSI1SK: `MEETING#${now}`,
            id: meetingId,
            title,
            startDate,
            endDate,
            creatorName: effectiveCreatorName,
            isInvite: true,
            expiresAt: expiresAt
        }));

        // 3b. Prepare Room Metadata Item
        const roomItem = {
            PK: `ROOM#${meetingId}`,
            SK: "METADATA",
            GSI1PK: "ROOMS",
            GSI1SK: `ROOM#${now}`,
            id: meetingId,
            name: title,
            type: 'MEETING',
            createdBy: normalizedCreatorEmail,
            createdAt: now,
            expiresAt: expiresAt
        };

        // 4. Batch Write
        const allItems: any[] = [meetingItem, roomItem, ...slotItems, ...inviteItems];

        // 5. Generate Admin Token
        const adminToken = uuidv4();
        const adminLogicalExpiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24h logical
        const retentionTtl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days retention

        const adminTokenItem = {
            PK: `TOKEN#${adminToken}`,
            SK: "METADATA",
            type: "ACCESS_TOKEN",
            status: "ACTIVE",
            email: normalizedCreatorEmail,
            meetingId: meetingId,
            role: 'ADMIN',
            logicalExpiresAt: adminLogicalExpiry,
            expiresAt: retentionTtl
        };

        // 6. Generate Participant Tokens
        const participantTokens = validInvites.map((email: string) => {
            const token = uuidv4();
            return {
                email,
                token,
                item: {
                    PK: `TOKEN#${token}`,
                    SK: "METADATA",
                    type: "ACCESS_TOKEN",
                    status: "ACTIVE",
                    email,
                    meetingId,
                    role: 'PARTICIPANT',
                    logicalExpiresAt: expiresAt,
                    expiresAt: expiresAt // 60 days (already > 30 day retention)
                }
            };
        });

        allItems.push(adminTokenItem);
        participantTokens.forEach(pt => allItems.push(pt.item));

        // Chunking & Writing
        const chunks = [];
        for (let i = 0; i < allItems.length; i += 25) {
            chunks.push(allItems.slice(i, i + 25));
        }

        for (const chunk of chunks) {
            await docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [TABLE_NAME]: chunk.map(item => ({ PutRequest: { Item: item } }))
                }
            }));
        }

        // Write activity log
        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                PK: `MEETING#${meetingId}`,
                SK: `LOG#${now}`,
                type: 'CREATED',
                message: `Mötesförslaget "${title}" skapades`,
                userId: normalizedCreatorEmail,
                userName: effectiveCreatorName,
                timestamp: now,
                expiresAt: expiresAt
            }
        }));

        // 7. Send Emails via SES (Localized)
        const rawFrontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const frontendUrl = rawFrontendUrl.endsWith('/') ? rawFrontendUrl.slice(0, -1) : rawFrontendUrl;
        const adminLink = `${frontendUrl}/auth/verify?token=${adminToken}`;
        const publicLink = `${frontendUrl}/m/${meetingId}`;

        if (process.env.SOURCE_EMAIL) {
            const ses = new SESClient({ region: process.env.AWS_REGION });

            try {
                // Email to Creator
                const creatorSubject = t(dict.createMeeting.subject, { title });
                const creatorHtml = `
                <h1>${dict.createMeeting.subject.replace('{{title}}', title)}</h1>
                <p>${dict.common.adminLink}: <a href="${adminLink}">${dict.common.manageMeeting}</a></p>
                <p>${dict.common.shareLink}</p>
                <p><a href="${publicLink}">${publicLink}</a></p>
                <br>
                <p><small>${dict.common.autoDelete}</small></p>
            `;
                const creatorText = `${creatorSubject}\n\n${dict.common.adminLink}: ${adminLink}\n${dict.common.publicLink}: ${publicLink}`;

                const creatorEmailPromise = ses.send(new SendEmailCommand({
                    Source: process.env.SOURCE_EMAIL,
                    Destination: { ToAddresses: [normalizedCreatorEmail] },
                    Message: {
                        Subject: { Data: creatorSubject },
                        Body: {
                            Html: { Data: creatorHtml },
                            Text: { Data: creatorText }
                        }
                    }
                }));

                // Emails to Invited Participants
                const invitePromises = participantTokens.map(pt => {
                    const inviteLink = `${frontendUrl}/auth/verify?token=${pt.token}`;
                    const inviteSubject = t(dict.invite.subject, { title });
                    const inviteHtml = `
                    <h2>${t(dict.common.youAreInvited, { title })}</h2>
                    <p>${t(dict.common.invitedBy, { name: effectiveCreatorName })}</p>
                    <p>${dict.common.clickToRespond}</p>
                    <p><a href="${inviteLink}">${dict.common.goToMeeting}</a></p>
                    <br>
                    <p><small>${dict.common.linkNotWorking} ${inviteLink}</small></p>
                `;
                    const inviteText = `${inviteSubject}\n${t(dict.common.invitedBy, { name: effectiveCreatorName })}\n${dict.common.goToMeeting}: ${inviteLink}`;

                    return ses.send(new SendEmailCommand({
                        Source: process.env.SOURCE_EMAIL,
                        Destination: { ToAddresses: [pt.email] },
                        Message: {
                            Subject: { Data: inviteSubject },
                            Body: {
                                Html: { Data: inviteHtml },
                                Text: { Data: inviteText }
                            }
                        }
                    }));
                });

                await Promise.all([creatorEmailPromise, ...invitePromises]);
                console.log(`Sent emails to creator and ${invitePromises.length} participants.`);
            } catch (sesError) {
                console.error("Non-fatal: failed to send one or more emails", {
                    meetingId,
                    error: sesError
                });
            }
        } else {
            console.log("[SIMULATION] Admin link generated (SES not configured)");
        }

        return createResponse(201, { message: "Meeting created.", meetingId });

    } catch (error) {
        console.error("Error in createMeeting:", error);
        return createResponse(500, { error: "Internal Server Error" });
    }
};
