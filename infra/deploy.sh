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
RELEASE_ID="${RELEASE_ID:-$(git rev-parse --short=12 HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)}"

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
  --build-arg GIT_COMMIT_SHA="${RELEASE_ID}" \
  --build-arg APP_RELEASE_ID="${RELEASE_ID}" \
  --build-arg APP_ENVIRONMENT="production" \
  -t "${FRONTEND_ECR}:${RELEASE_ID}" \
  -t "${FRONTEND_ECR}:latest" .
docker push "${FRONTEND_ECR}:${RELEASE_ID}"
docker push "${FRONTEND_ECR}:latest"

# Step 4: Build & push backend
echo ""
echo ">>> Step 4: Building backend..."
docker build \
  -t "${BACKEND_ECR}:${RELEASE_ID}" \
  -t "${BACKEND_ECR}:latest" ./backend
docker push "${BACKEND_ECR}:${RELEASE_ID}"
docker push "${BACKEND_ECR}:latest"

# Register a new task-definition revision for an immutable image. A forced
# deployment of an unchanged :latest definition can reuse different image
# digests across tasks and is the root cause of old/new UI intermittency.
register_task_revision() {
  local family="$1"
  local container="$2"
  local image="$3"
  local current_file next_file
  current_file=$(mktemp)
  next_file=$(mktemp)

  aws ecs describe-task-definition --task-definition "$family" \
    --query taskDefinition --region "${AWS_REGION}" > "$current_file"
  jq --arg image "$image" --arg container "$container" \
    '.containerDefinitions |= map(if .name == $container then .image = $image else . end)
     | del(.taskDefinitionArn, .revision, .status, .requiresAttributes,
           .compatibilities, .registeredAt, .registeredBy)' \
    "$current_file" > "$next_file"
  aws ecs register-task-definition --cli-input-json "file://${next_file}" \
    --query 'taskDefinition.taskDefinitionArn' --output text --region "${AWS_REGION}"
  rm -f "$current_file" "$next_file"
}

# Step 5: Deploy immutable revisions
echo ""
echo ">>> Step 5: Deploying services..."
CLUSTER="${ENV_NAME}-nexuscrm"
FRONTEND_TASK=$(register_task_revision "${ENV_NAME}-nexuscrm-frontend" frontend "${FRONTEND_ECR}:${RELEASE_ID}")
BACKEND_TASK=$(register_task_revision "${ENV_NAME}-nexuscrm-backend" backend "${BACKEND_ECR}:${RELEASE_ID}")
aws ecs update-service --cluster "${CLUSTER}" --service "${ENV_NAME}-frontend" --task-definition "${FRONTEND_TASK}" --region "${AWS_REGION}" > /dev/null
aws ecs update-service --cluster "${CLUSTER}" --service "${ENV_NAME}-backend" --task-definition "${BACKEND_TASK}" --region "${AWS_REGION}" > /dev/null
aws ecs wait services-stable --cluster "${CLUSTER}" --services "${ENV_NAME}-frontend" "${ENV_NAME}-backend" --region "${AWS_REGION}"

verify_service_image() {
  local service="$1"
  local container="$2"
  local expected_image="$3"
  local task_arns actual_images image
  task_arns=$(aws ecs list-tasks --cluster "${CLUSTER}" --service-name "$service" \
    --desired-status RUNNING --query 'taskArns' --output text --region "${AWS_REGION}")
  if [[ -z "$task_arns" || "$task_arns" == "None" ]]; then
    echo "ERROR: No running tasks found for ${service}." >&2
    exit 1
  fi
  actual_images=$(aws ecs describe-tasks --cluster "${CLUSTER}" --tasks $task_arns \
    --query "tasks[].containers[?name=='${container}'].image" --output text --region "${AWS_REGION}")
  for image in $actual_images; do
    if [[ "$image" != "$expected_image" ]]; then
      echo "ERROR: ${service} rolled back or is mixed; expected ${expected_image}, found ${image}." >&2
      exit 1
    fi
  done
}

verify_service_image "${ENV_NAME}-frontend" frontend "${FRONTEND_ECR}:${RELEASE_ID}"
verify_service_image "${ENV_NAME}-backend" backend "${BACKEND_ECR}:${RELEASE_ID}"

echo ""
echo "============================================"
echo " Deployment Complete!"
echo " URL: http://${ALB_DNS}"
echo " Cognito Pool: ${COGNITO_POOL}"
echo " Cognito Client: ${COGNITO_CLIENT}"
echo "============================================"
