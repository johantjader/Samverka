# CI/CD Setup Guide

This document describes how to set up the automated CI/CD pipeline for **Samverka** using GitHub Actions and AWS.

## 1. Prerequisites

### AWS IAM User (for CI/CD)
To allow GitHub Actions to deploy resources, you need a dedicated IAM User with sufficient permissions.

1.  **Create User:**
    -   Go to AWS Console > IAM > Users > Create user.
    -   Name: `github-actions-deployer`.
    -   Select "AdministratorAccess" policy (for MVP simplicity; tighten this for production).
    -   Create the user.

2.  **Create Access Keys:**
    -   Click on the newly created user.
    -   Go to "Security credentials" > "Create access key".
    -   Select "Command Line Interface (CLI)".
    -   **IMPORTANT:** Copy the `Access key ID` and `Secret access key`. You will not see the secret key again.

### GitHub Repository Secrets
To securely pass these credentials to the workflow, use GitHub Secrets.

1.  Go to your GitHub repository > **Settings**.
2.  In the left sidebar, click **Secrets and variables** > **Actions**.
3.  Click **New repository secret** and add the following:

| Secret Name             | Value Example                                  | Description                                      |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `AWS_ACCESS_KEY_ID`     | `AKIAIOSFODNN7EXAMPLE`                         | The Access Key ID from the IAM user.             |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`     | The Secret Access Key from the IAM user.         |
| `AWS_REGION`            | `eu-north-1`                                   | The AWS Region where resources are deployed.     |

## 2. Workflow Overview (`.github/workflows/deploy.yml`)

The workflow is triggered automatically on every push to the `main` branch.

**Steps:**
1.  **Checkout:** Downloads the code.
2.  **Install dependencies:** Installs NPM packages for the entire monorepo.
3.  **Build Shared & Backend:** Compiles TypeScript for shared logic and backend helpers.
4.  **Deploy Infrastructure (CDK):**
    -   Uses `cdk deploy` to update DynamoDB, Lambda, API Gateway, S3, and CloudFront.
    -   Critically, it exports outputs (API URL, S3 Bucket) to a file `cdk-outputs.json`.
5.  **Build Frontend:**
    -   Reads API URL from the CDK outputs.
    -   Creates a `.env.production` file.
    -   Compiles the React application to `dist/`.
6.  **Deploy Frontend:**
    -   Syncs the `dist/` folder to the S3 bucket.
    -   Invalidates CloudFront cache to serve the new version immediately.
