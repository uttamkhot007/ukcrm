#!/bin/bash
set -euo pipefail

# ====================================================
# NexusCRM - Full Stack AWS Deployment
# ====================================================
# Prerequisites:
#   - AWS CLI configured
#   - Docker installed
#   - Environment variables set
# ====================================================

: "${AWS_REGION:=ap-south-1}"
: "${ENV_NAME:=production}"
: "${DB_MASTER_PASSWORD:?Set DB_MASTER_PASSWORD (min 16 chars)}"

STACK_NAME="${ENV_NAME}-nexuscrm"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "============================================"
echo " NexusCRM Full Stack Deployment"
echo " Environment: ${ENV_NAME}"
echo " Region: ${AWS_REGION}"
echo "============================================"

# Step 1: Deploy CloudFormation
echo ""
echo ">>> Step 1: Deploying infrastructure..."
aws cloudformation deploy \
  --template-file infra/cloudformation.yaml \
  --stack-name "${STACK_NAME}" \
  --parameter-overrides \
    EnvironmentName="${ENV_NAME}" \
    DBMasterPassword="${DB_MASTER_PASSWORD}" \
    AIOpenAIKey="${AI_OPENAI_API_KEY:-}" \
    AIGoogleKey="${AI_GOOGLE_API_KEY:-}" \
  --capabilities CAPABILITY_IAM \
  --region "${AWS_REGION}" \
  --no-fail-on-empty-changeset

# Get outputs
FRONTEND_ECR=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='FrontendECRUri'].OutputValue" --output text --region "${AWS_REGION}")
BACKEND_ECR=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='BackendECRUri'].OutputValue" --output text --region "${AWS_REGION}")
ALB_DNS=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='ALBDNS'].OutputValue" --output text --region "${AWS_REGION}")
COGNITO_POOL=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='CognitoUserPoolId'].OutputValue" --output text --region "${AWS_REGION}")
COGNITO_CLIENT=$(aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='CognitoClientId'].OutputValue" --output text --region "${AWS_REGION}")

echo "    Infrastructure deployed."

# Step 2: Login to ECR
echo ""
echo ">>> Step 2: Logging into ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Step 3: Build & push frontend
echo ""
echo ">>> Step 3: Building frontend..."
docker build \
  --build-arg VITE_API_URL="http://${ALB_DNS}" \
  -t "${FRONTEND_ECR}:latest" .
docker push "${FRONTEND_ECR}:latest"

# Step 4: Build & push backend
echo ""
echo ">>> Step 4: Building backend..."
docker build \
  -t "${BACKEND_ECR}:latest" ./backend
docker push "${BACKEND_ECR}:latest"

# Step 5: Force new deployment
echo ""
echo ">>> Step 5: Deploying services..."
CLUSTER="${ENV_NAME}-nexuscrm"
aws ecs update-service --cluster "${CLUSTER}" --service "${ENV_NAME}-frontend" --force-new-deployment --region "${AWS_REGION}" > /dev/null
aws ecs update-service --cluster "${CLUSTER}" --service "${ENV_NAME}-backend" --force-new-deployment --region "${AWS_REGION}" > /dev/null

echo ""
echo "============================================"
echo " Deployment Complete!"
echo " URL: http://${ALB_DNS}"
echo " Cognito Pool: ${COGNITO_POOL}"
echo " Cognito Client: ${COGNITO_CLIENT}"
echo "============================================"
