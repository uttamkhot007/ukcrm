#!/bin/bash
set -euo pipefail

# ====================================================
# NexusCRM - AWS Deployment Script
# ====================================================
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Docker installed and running
#   - Environment variables set (see below)
# ====================================================

# Required environment variables
: "${AWS_REGION:=ap-south-1}"
: "${ENV_NAME:=production}"
: "${VITE_SUPABASE_URL:?Set VITE_SUPABASE_URL}"
: "${VITE_SUPABASE_PUBLISHABLE_KEY:?Set VITE_SUPABASE_PUBLISHABLE_KEY}"
: "${VITE_SUPABASE_PROJECT_ID:?Set VITE_SUPABASE_PROJECT_ID}"

STACK_NAME="${ENV_NAME}-nexuscrm"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ENV_NAME}-nexuscrm"

echo "============================================"
echo " NexusCRM AWS Deployment"
echo " Environment: ${ENV_NAME}"
echo " Region: ${AWS_REGION}"
echo " Account: ${ACCOUNT_ID}"
echo "============================================"

# Step 1: Deploy CloudFormation stack
echo ""
echo ">>> Step 1: Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file infra/cloudformation.yaml \
  --stack-name "${STACK_NAME}" \
  --parameter-overrides \
    EnvironmentName="${ENV_NAME}" \
    ViteSupabaseUrl="${VITE_SUPABASE_URL}" \
    ViteSupabasePublishableKey="${VITE_SUPABASE_PUBLISHABLE_KEY}" \
    ViteSupabaseProjectId="${VITE_SUPABASE_PROJECT_ID}" \
  --capabilities CAPABILITY_IAM \
  --region "${AWS_REGION}" \
  --no-fail-on-empty-changeset

echo "    Stack deployed successfully."

# Step 2: Build Docker image
echo ""
echo ">>> Step 2: Building Docker image..."
docker build \
  --build-arg VITE_SUPABASE_URL="${VITE_SUPABASE_URL}" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY}" \
  --build-arg VITE_SUPABASE_PROJECT_ID="${VITE_SUPABASE_PROJECT_ID}" \
  -t nexuscrm:latest .

echo "    Image built successfully."

# Step 3: Push to ECR
echo ""
echo ">>> Step 3: Pushing image to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker tag nexuscrm:latest "${ECR_REPO}:latest"
docker tag nexuscrm:latest "${ECR_REPO}:$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"
docker push "${ECR_REPO}:latest"
docker push "${ECR_REPO}:$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')"

echo "    Image pushed to ECR."

# Step 4: Update ECS service
echo ""
echo ">>> Step 4: Updating ECS service..."
CLUSTER_NAME=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='ECSClusterName'].OutputValue" \
  --output text --region "${AWS_REGION}")

SERVICE_NAME=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='ECSServiceName'].OutputValue" \
  --output text --region "${AWS_REGION}")

aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${SERVICE_NAME}" \
  --force-new-deployment \
  --region "${AWS_REGION}" > /dev/null

echo "    ECS service updated. Deployment in progress..."

# Step 5: Get ALB URL
echo ""
ALB_DNS=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --query "Stacks[0].Outputs[?OutputKey=='ALBDnsName'].OutputValue" \
  --output text --region "${AWS_REGION}")

echo "============================================"
echo " Deployment Complete!"
echo " URL: http://${ALB_DNS}"
echo "============================================"
