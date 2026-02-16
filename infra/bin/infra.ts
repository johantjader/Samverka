import * as cdk from 'aws-cdk-lib/core';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { InfraStack } from '../lib/infra-stack';

// Explicitly load .env from the project root (one level up from bin/)
// This is mainly for local development. In CI, we expect JWT_SECRET to be passed as an env var.
const envPath = path.join(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  // Safe to ignore in CI if secrets are passed via env vars
  console.log(`[INFO] No .env file found at ${envPath} or failed to load. Using process.env.`);
} else {
  console.log(`[INFO] Loaded .env from ${envPath}`);
}

const secretSource = process.env.JWT_SECRET ? "Present" : "Missing";
console.log(`Checking JWT_SECRET... ${secretSource}`);
if (process.env.JWT_SECRET) {
  console.log(`JWT_SECRET length: ${process.env.JWT_SECRET.length}`);
}

const app = new cdk.App();

const fallbackDomain = "samverka.nononsenseconsulting.org";
const rawFrontendUrl = process.env.FRONTEND_URL || process.env.SITE_URL || `https://${fallbackDomain}`;
const normalizeDomain = (value: string): string | undefined => {
  try {
    const url = value.startsWith('http') ? new URL(value) : new URL(`https://${value}`);
    return url.hostname;
  } catch {
    return undefined;
  }
};
const frontendDomain = normalizeDomain(rawFrontendUrl) || fallbackDomain;

new InfraStack(app, 'InfraStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  frontendDomain,
  frontendCertArn: "arn:aws:acm:us-east-1:977592246113:certificate/c80d73b7-4ebd-4fed-b9dc-7622e77b2626"

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
