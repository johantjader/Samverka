export type Language = 'sv' | 'en';

export interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}

export interface LocaleDict {
    createMeeting: {
        subject: string;
        html: string;
        text: string;
    };
    invite: {
        subject: string;
        html: string;
        text: string;
    };
    decide: {
        subject: string;
        htmlHeader: string;
        htmlBody: string;
        htmlFooter: string;
        text: string;
        activityLog: string;
    };
    common: {
        adminLink: string;
        publicLink: string;
        autoDelete: string;
        manageMeeting: string;
        shareLink: string;
        youAreInvited: string;
        invitedBy: string;
        clickToRespond: string;
        goToMeeting: string;
        linkNotWorking: string;
        meetingDecided: string;
        timeSelected: string;
        calendarAttached: string;
    };
}

const SV: LocaleDict = {
    createMeeting: {
        subject: "Ditt möte \"{{title}}\" är skapat!",
        html: "", // Constructed dynamically
        text: ""
    },
    invite: {
        subject: "Inbjudan till {{title}}",
        html: "",
        text: ""
    },
    decide: {
        subject: "BOKAT: {{title}}",
        htmlHeader: "Mötet är bokat!",
        htmlBody: "Tiden <strong>{{date}}</strong> har valts för mötet \"{{title}}\".",
        htmlFooter: "En kalenderbokning bifogas detta mail.",
        text: "Mötet \"{{title}}\" är bokat till {{date}}. En kalenderbokning bifogas.",
        activityLog: "Mötet avgjordes av {{userName}}"
    },
    common: {
        adminLink: "Admin-länk",
        publicLink: "Publik länk",
        autoDelete: "Detta möte raderas automatiskt om 60 dagar.",
        manageMeeting: "Hantera mitt möte (Admin)",
        shareLink: "Dela denna länk med deltagare:",
        youAreInvited: "Du är inbjuden till \"{{title}}\"",
        invitedBy: "{{name}} har bjudit in dig.",
        clickToRespond: "Klicka här för att svara:",
        goToMeeting: "Gå till mötet",
        linkNotWorking: "Om länken inte fungerar:",
        meetingDecided: "Mötet är bokat!",
        timeSelected: "Tiden {{date}} har valts.",
        calendarAttached: "En kalenderbokning bifogas detta mail."
    }
};

const EN: LocaleDict = {
    createMeeting: {
        subject: "Your meeting \"{{title}}\" is created!",
        html: "",
        text: ""
    },
    invite: {
        subject: "Invitation to {{title}}",
        html: "",
        text: ""
    },
    decide: {
        subject: "BOOKED: {{title}}",
        htmlHeader: "Meeting Booked!",
        htmlBody: "The time <strong>{{date}}</strong> has been selected for the meeting \"{{title}}\".",
        htmlFooter: "A calendar invitation is attached to this email.",
        text: "The meeting \"{{title}}\" is booked for {{date}}. A calendar invitation is attached.",
        activityLog: "Meeting decided by {{userName}}"
    },
    common: {
        adminLink: "Admin Link",
        publicLink: "Public Link",
        autoDelete: "This meeting will be automatically deleted in 60 days.",
        manageMeeting: "Manage My Meeting (Admin)",
        shareLink: "Share this link with participants:",
        youAreInvited: "You are invited to \"{{title}}\"",
        invitedBy: "{{name}} has invited you.",
        clickToRespond: "Click here to respond:",
        goToMeeting: "Go to Meeting",
        linkNotWorking: "If the link doesn't work:",
        meetingDecided: "Meeting Booked!",
        timeSelected: "The time {{date}} has been selected.",
        calendarAttached: "A calendar invitation is attached to this email."
    }
};

export const getLocale = (lang: string = 'sv'): LocaleDict => {
    return lang === 'en' ? EN : SV;
};

// Interpolation Helper: "Hello {{name}}" -> "Hello World"
export const t = (str: string, vars: Record<string, string | number>): string => {
    return str.replace(/{{(\w+)}}/g, (_, key) => {
        return vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`;
    });
};

// Date Formatter
export const formatDate = (date: Date | string, lang: string = 'sv'): string => {
    const d = new Date(date);
    // sv-SE: 10 maj 14:00
    // en-US/GB: May 10, 2:00 PM
    return new Intl.DateTimeFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(d);
};
