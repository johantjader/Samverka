export const formatIcalDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const foldLine = (line: string): string => {
    // RFC 5545: Lines shouldn't be longer than 75 octets (bytes).
    // Folding: CRLF + space
    const MAX_LENGTH = 75;
    if (line.length <= MAX_LENGTH) return line;

    let result = '';
    let currentLine = line;

    while (currentLine.length > MAX_LENGTH) {
        // Take first 75 chars
        result += currentLine.substring(0, MAX_LENGTH) + '\r\n ';
        // Remaining
        currentLine = currentLine.substring(MAX_LENGTH);
    }
    result += currentLine;
    return result;
};

export interface IcalEvent {
    uid: string;
    startTime: Date; // UTC
    endTime: Date;   // UTC
    summary: string;
    description: string;
    location?: string;
    organizer: { name: string; email: string };
    attendees: { name: string; email: string }[];
    url?: string;
}

export const generateIcsContent = (event: IcalEvent): string => {
    const now = formatIcalDate(new Date());
    const start = formatIcalDate(event.startTime);
    const end = formatIcalDate(event.endTime);

    // Escape special characters in text fields
    const escapeText = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Samverka//NONSGML v1.0//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST', // Allows "Accept/Decline"
        'BEGIN:VEVENT',
        `UID:${event.uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${escapeText(event.summary)}`,
        `DESCRIPTION:${escapeText(event.description)}`,
        `ORGANIZER;CN=${escapeText(event.organizer.name)}:mailto:${event.organizer.email}`,
        `URL:${event.url || ''}`,
        `STATUS:CONFIRMED`,
        `SEQUENCE:0`,
        `TRANSP:OPAQUE` // Mark as busy
    ];

    if (event.location) {
        lines.push(`LOCATION:${escapeText(event.location)}`);
    }

    // Attendees
    event.attendees.forEach(att => {
        // RSVP=TRUE requests a response from the attendee
        lines.push(`ATTENDEE;RSVP=TRUE;CN=${escapeText(att.name)}:mailto:${att.email}`);
    });

    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');

    // Join with CRLF and fold lines
    return lines.map(foldLine).join('\r\n');
};
