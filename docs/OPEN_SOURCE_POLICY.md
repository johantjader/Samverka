# Open Source Policy & Security Guidelines - Samverka

This project is Open Source (Apache 2.0). All code written must be generic, reusable, and free of sensitive data.
**AI Instruction:** You must strictly adhere to these guidelines when generating code.

## 1. The "Zero Secrets" Rule
* **Absolute Ban:** Never hardcode passwords, API keys, tokens, or private keys in the source code.
* **Implementation:**
    * Use Environment Variables (`process.env.VARIABLE`) for all runtime secrets.
    * Use AWS Systems Manager (SSM) Parameter Store or Secrets Manager for infrastructure secrets.
    * **Local Development:** Use `.env` files (which are git-ignored).
    * **Example:** Create `.env.example` with dummy values for reference.

## 2. Configuration vs. Code (12-Factor App)
The codebase must be deployable by *anyone* to *any* AWS account without changing the TypeScript code.

* **No Hardcoded Identifiers:**
    * ❌ BAD: `const bucketName = 'samverka-prod-bucket-8321';`
    * ✅ GOOD: `const bucketName = \`\${props.appName}-\${props.stage}-bucket\`;`
* **AWS Account IDs:** Never hardcode AWS Account IDs or Region constraints inside the stack code. Pass them as props from the entry point (`bin/infra.ts`).
* **Domain Names:** Do not hardcode `samverka.se`. Use configuration variables for domain names.

## 3. Generic Infrastructure (CDK)
* **Reusable Stacks:** CDK Stacks should accept a `props` object defining environment-specifics (stage, instance size, removal policies).
* **Removal Policies:**
    * Default to `DESTROY` for ephemeral/dev environments (to save costs for others trying the project).
    * Use logic to enforce `RETAIN` only when `stage === 'prod'`.

## 4. Comments and Documentation
* **No PII:** Do not include real names, emails, or phone numbers in comments or test data. Use `user@example.com`.
* **No Internal URLs:** Do not link to internal tickets (Jira) or private wikis.
* **English First:** Keep code comments in English for broader open source adoption, even if the UI is in Swedish.

## 5. Mock Data & Tests
* **Sanitized Data:** If generating mock data for UI or tests, ensure it looks realistic but is completely fabricated.
* **Snapshots:** Be careful with Jest snapshots; ensure they don't capture environment variables or local paths.

---

## AI Check-List
Before outputting code, verify:
1.  [ ] Are there any hardcoded secrets?
2.  [ ] Is this code specific to the original author's AWS account?
3.  [ ] Did I create an `.env.example` if I introduced new variables?
4.  [ ] Is the License header present (if creating a major new file)?