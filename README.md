# Samverka

A meeting scheduling tool I'm building to learn serverless on AWS. Think Doodle, but simpler and with no accounts.

**How it works:** You create a meeting, propose times, and get a magic link via email. Invite others — they get their own links. Everyone votes on times, you pick one, and calendar invites go out automatically.

No accounts. No passwords. All data auto-deletes after 60 days.

## Tech Stack

- **Frontend:** React, Vite, TailwindCSS (S3 + CloudFront)
- **Backend:** TypeScript, AWS Lambda, API Gateway
- **Database:** DynamoDB (single-table design with TTL)
- **Infrastructure:** AWS CDK
- **Email:** Amazon SES (magic links + iCal attachments)

## Project Structure

```
/
├── backend/          # Lambda functions
│   └── src/
│       ├── auth/     # Magic link auth (request, verify, resend)
│       ├── scheduler/# Meetings, voting, decide
│       └── shared/   # Utilities, iCal generation, i18n
├── frontend/         # React app (Vite)
│   └── src/
│       ├── pages/    # CreateMeeting, MeetingDetails, Verify
│       └── components/
├── infra/            # AWS CDK (Infrastructure as Code)
└── shared/           # TypeScript types shared between FE/BE
```

## Running Locally

```bash
npm install
cd frontend && npm run dev
```

You'll need AWS credentials and a verified SES domain/email to actually send emails. Without SES configured, the backend runs in simulation mode (no emails sent).

## License

Apache 2.0 — see [LICENSE](LICENSE).
