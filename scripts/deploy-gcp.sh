#!/bin/bash
# Google Cloud Run Deployment Script for Vision Cortex
# Deploys Vision Cortex to Google Cloud Run with full configuration

set -e

# Configuration
PROJECT_ID="infinity-x-one-systems"
REGION="us-central1"
SERVICE_NAME="vision-cortex"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
REDIS_INSTANCE="vision-cortex-redis"

echo "🚀 Starting Vision Cortex deployment to Google Cloud Run..."

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with Google Cloud. Please run 'gcloud auth login'"
    exit 1
fi

# Set the project
echo "📋 Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    redis.googleapis.com \
    firestore.googleapis.com \
    secretmanager.googleapis.com \
    monitoring.googleapis.com \
    logging.googleapis.com

# Create Redis instance if it doesn't exist
echo "🗃️ Setting up Redis instance..."
if ! gcloud redis instances describe ${REDIS_INSTANCE} --region=${REGION} &>/dev/null; then
    echo "Creating Redis instance..."
    gcloud redis instances create ${REDIS_INSTANCE} \
        --size=1 \
        --region=${REGION} \
        --redis-version=redis_7_0 \
        --network=default \
        --redis-config maxmemory-policy=allkeys-lru
    
    echo "⏳ Waiting for Redis instance to be ready..."
    gcloud redis instances describe ${REDIS_INSTANCE} --region=${REGION} --format="value(state)" | \
        xargs -I {} sh -c 'while [ "{}" != "READY" ]; do echo "Waiting..."; sleep 10; done'
fi

# Get Redis host
REDIS_HOST=$(gcloud redis instances describe ${REDIS_INSTANCE} --region=${REGION} --format="value(host)")
echo "📡 Redis host: ${REDIS_HOST}"

# Create secrets in Secret Manager
echo "🔐 Setting up secrets..."

# Create Google Cloud credentials secret (if not exists)
if ! gcloud secrets describe google-cloud-credentials &>/dev/null; then
    echo "Creating google-cloud-credentials secret..."
    # Use existing service account key or create a placeholder
    if [ -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]; then
        gcloud secrets create google-cloud-credentials --data-file="${GOOGLE_APPLICATION_CREDENTIALS}"
    else
        echo "{}" | gcloud secrets create google-cloud-credentials --data-file=-
        echo "⚠️ Please update the google-cloud-credentials secret with your service account key"
    fi
fi

# Create OpenAI API key secret (if not exists)
if ! gcloud secrets describe openai-api-key &>/dev/null; then
    echo "Creating openai-api-key secret..."
    echo "${OPENAI_API_KEY:-placeholder}" | gcloud secrets create openai-api-key --data-file=-
fi

# Create Anthropic API key secret (if not exists)
if ! gcloud secrets describe anthropic-api-key &>/dev/null; then
    echo "Creating anthropic-api-key secret..."
    echo "${ANTHROPIC_API_KEY:-placeholder}" | gcloud secrets create anthropic-api-key --data-file=-
fi

# Build and push Docker image
echo "🐳 Building and pushing Docker image..."
gcloud builds submit --tag ${IMAGE_NAME} .

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --region ${REGION} \
    --platform managed \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --concurrency 80 \
    --max-instances 100 \
    --min-instances 1 \
    --timeout 3600 \
    --set-env-vars "NODE_ENV=production,REDIS_URL=redis://${REDIS_HOST}:6379,PORT=8080" \
    --set-secrets "GOOGLE_APPLICATION_CREDENTIALS_JSON=google-cloud-credentials:latest,OPENAI_API_KEY=openai-api-key:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest" \
    --vpc-connector projects/${PROJECT_ID}/locations/${REGION}/connectors/default-connector \
    --vpc-egress private-ranges-only \
    --execution-environment gen2 \
    --service-account vision-cortex@${PROJECT_ID}.iam.gserviceaccount.com

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format="value(status.url)")

echo "✅ Vision Cortex deployed successfully!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo "📊 Monitoring: https://console.cloud.google.com/run/detail/${REGION}/${SERVICE_NAME}"
echo "📋 Logs: gcloud logs tail --follow --resource-type=cloud_run_revision --resource-labels=service_name=${SERVICE_NAME}"

# Test the deployment
echo "🧪 Testing deployment..."
if curl -s "${SERVICE_URL}/health" | grep -q "healthy"; then
    echo "✅ Health check passed!"
else
    echo "⚠️ Health check failed - check logs for issues"
fi

echo "🎉 Deployment complete! Vision Cortex is running on Google Cloud Run."
echo ""
echo "Next steps:"
echo "1. Update secrets with actual API keys:"
echo "   gcloud secrets versions add openai-api-key --data-file=openai-key.txt"
echo "   gcloud secrets versions add anthropic-api-key --data-file=anthropic-key.txt"
echo "2. Set up custom domain (if needed)"
echo "3. Configure monitoring and alerting"
echo "4. Test integrations with Real Estate Intelligence system"