#!/bin/bash
set -e

# Configuration (from arguments or hardcoded for MVP)
# Usage: ./deploy.sh <BUCKET_NAME> <DISTRIBUTION_ID>

BUCKET_NAME=$1
DISTRIBUTION_ID=$2

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
  echo "Usage: ./deploy.sh <BUCKET_NAME> <DISTRIBUTION_ID>"
  exit 1
fi

echo "Deploying to Bucket: $BUCKET_NAME and Distribution: $DISTRIBUTION_ID"

# 1. Build
echo "Building..."
npm run build

# 2. Sync to S3
echo "Syncing to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# 3. Invalidate CloudFront
echo "Invalidating CloudFront..."
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "Deployment Complete!"
