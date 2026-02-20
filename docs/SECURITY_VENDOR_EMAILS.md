# Email Templates for Categorization Requests

When submitting your site (`samverka.nononsenseconsulting.org`) to security vendors (Palo Alto, Fortinet, Symantec, McAfee, etc.), use the following information and email templates to help them understand the purpose of your application and update its categorization from "Insufficient-Content" or "Uncategorized" to a legitimate business category.

---

### Key Information to Provide in Forms:

*   **URL:** `https://samverka.nononsenseconsulting.org`
*   **Suggested Category:** `Business`, `Collaboration`, or `Technology`
*   **Description/Comments:** (See templates below)

---

### Template 1: Standard Re-categorization Request (Short)

**Subject:** Categorization Request for samverka.nononsenseconsulting.org

**Message/Comments:**
> Hello,
> 
> I am requesting a re-categorization for our domain: **samverka.nononsenseconsulting.org**. 
> 
> It is currently categorized as "Insufficient-Content" or "Uncategorized". We have recently launched this application to production.
> 
> **Samverka** (Swedish for "Collaboration") is a legitimate, GDPR-compliant scheduling and collaboration tool, similar to Doodle. It allows users across different organizations to propose meeting times and vote on availability. 
> 
> The application uses a stateless architecture (Magic Links) and is built with security in mind (HTTPS enforced, strict Content-Security-Policies, and ephemerality of data). Furthermore, the project is completely Open Source.
> 
> Please categorize this domain as **"Business"** or **"Collaboration"**.
> 
> Thank you,
> [Your Name/Title]
> Nononsense Consulting

---

### Template 2: Re-categorization Request (Detailed - Use if additional context is needed)

**Subject:** Request for Website Categorization: samverka.nononsenseconsulting.org

**Message/Comments:**
> To the URL Filtering / Threat Intelligence Team,
> 
> I would like to submit the following domain for review and categorization:
> **URL:** https://samverka.nononsenseconsulting.org
> 
> **Current Status:** Often flagged as "Uncategorized" or "Insufficient-Content" due to it being a newly deployed Single Page Application (SPA).
> 
> **Requested Category:** "Collaboration", "Business", or "Web Meetings".
> 
> **About the Site:**
> Samverka is an open-source, privacy-first meeting coordination tool designed to facilitate cross-organizational scheduling without requiring user accounts or passwords. It is a secure alternative to tools like Doodle.
> 
> **Security Posture:**
> To alleviate any security concerns regarding the "Insufficient-Content" flag (which is common for modern SPAs that load content dynamically):
> 
> 1.  **Architecture:** Hosted entirely on AWS (S3, CloudFront, API Gateway, Lambda).
> 2.  **Encryption:** Strict HTTPS (TLS 1.2/1.3) enforcement.
> 3.  **Authentication:** Uses secure, stateless "Magic Links" via email (Amazon SES) instead of traditional passwords.
> 4.  **Headers:** Implements strict security headers including HSTS and CSP.
> 5.  **Transparency:** The entire codebase is Open Source and verifiable.
> 
> Many of our partners use your web filtering services, and the current lack of categorization is blocking legitimate business collaboration. We kindly request that you review the site and update its category accordingly.
> 
> Best regards,
> 
> [Your Name]
> Nononsense Consulting
> [Link to GitHub Repository]
