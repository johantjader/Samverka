export type Locale = 'sv' | 'en';

export const locales = {
    sv: {
        auth: {
            verifying: "Verifierar...",
            verified: "Verifierad!",
            linkUsed: "Länken har redan använts",
            linkExpired: "Länken har gått ut",
            resendLink: "Skicka mig en ny inloggningslänk",
            linkSent: "En ny länk har skickats till din e-post",
            sending: "Skickar...",
            invalidLink: "Länken är ogiltig eller har gått ut"
        },
        common: {
            loading: "Laddar...",
            error: "Ett fel uppstod",
            save: "Spara",
            cancel: "Avbryt",
            delete: "Ta bort",
            edit: "Redigera",
            back: "Tillbaka",
            next: "Nästa"
        },
        create: {
            step1Title: "Vad handlar mötet om?",
            step1Desc: "Ge mötet en tydlig titel.",
            titleLabel: "Mötestitel",
            descLabel: "Beskrivning (valfritt)",
            step2Title: "Vem är du?",
            step2Desc: "Vi behöver din e-post för att skicka admin-länken.",
            nameLabel: "Ditt Namn",
            emailLabel: "Din E-post",
            step3Title: "Föreslå tider",
            step3Desc: "Klicka och dra i kalendern för att föreslå tider.",
            addSlot: "Lägg till tid",
            removeSlot: "Ta bort",
            createButton: "Skapa Möte",
            creating: "Skapar...",
            successTitle: "Mötet är skapat!"
        },
        meeting: {
            host: "Arrangör",
            guests: "Gäster",
            votes: "Röster",
            bestTime: "Bästa tiden",
            decide: "Boka denna tid",
            decided: "Bokat!",
            share: "Dela",
            copyLink: "Kopiera länk",
            linkCopied: "Kopierad!",
            chat: "Chatt",
            participants: "Deltagare"
        },
        privacy: {
            header: "Integritet",
            terms: "Villkor",
            autoDelete: "Raderas automatiskt (60 dagar)",
            language: "Språk"
        },
        validation: {
            titleRequired: "Titel är obligatorisk",
            nameRequired: "Namn är obligatoriskt",
            emailRequired: "E-post är obligatorisk",
            emailInvalid: "Ogiltig e-postadress",
            slotRequired: "Datum och tider är obligatoriska",
            pastDate: "Du kan inte välja ett datum i det förflutna"
        }
    },
    en: {
        auth: {
            verifying: "Verifying...",
            verified: "Verified!",
            linkUsed: "This link has already been used",
            linkExpired: "This link has expired",
            resendLink: "Send me a new login link",
            linkSent: "A new link has been sent to your email",
            sending: "Sending...",
            invalidLink: "The link is invalid or has expired"
        },
        common: {
            loading: "Loading...",
            error: "An error occurred",
            save: "Save",
            cancel: "Cancel",
            delete: "Delete",
            edit: "Edit",
            back: "Back",
            next: "Next"
        },
        create: {
            step1Title: "What is the meeting about?",
            step1Desc: "Give the meeting a clear title.",
            titleLabel: "Meeting Title",
            descLabel: "Description (optional)",
            step2Title: "Who are you?",
            step2Desc: "We need your email to send the admin link.",
            nameLabel: "Your Name",
            emailLabel: "Your Email",
            step3Title: "Propose times",
            step3Desc: "Click and drag in the calendar to propose times.",
            addSlot: "Add Time",
            removeSlot: "Remove",
            createButton: "Create Meeting",
            creating: "Creating...",
            successTitle: "Meeting Created!"
        },
        meeting: {
            host: "Host",
            guests: "Guests",
            votes: "Votes",
            bestTime: "Best Time",
            decide: "Book this time",
            decided: "Booked!",
            share: "Share",
            copyLink: "Copy Link",
            linkCopied: "Copied!",
            chat: "Chat",
            participants: "Participants"
        },
        privacy: {
            header: "Privacy",
            terms: "Terms",
            autoDelete: "Auto-deleted (60 days)",
            language: "Language"
        },
        validation: {
            titleRequired: "Title is required",
            nameRequired: "Name is required",
            emailRequired: "Email is required",
            emailInvalid: "Invalid email address",
            slotRequired: "Date and time are required",
            pastDate: "Cannot select dates in the past"
        }
    }
};



