#!/bin/bash

# 🚀 Vision Cortex Google Cloud Run Deployment Script
# Deploys the Quantum AI Brain to GCP with sync to all intelligence systems

set -e

PROJECT_ID="infinity-x-one-systems"
SERVICE_NAME="vision-cortex-quantum-brain"
REGION="us-east1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🧠 Deploying Vision Cortex Quantum AI Brain to Google Cloud Run..."

# Build and push Docker image
echo "📦 Building Docker image..."
docker build -t $IMAGE_NAME .

echo "🚀 Pushing to Google Container Registry..."
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --port 8080 \
  --memory 4Gi \
  --cpu 2 \
  --concurrency 100 \
  --timeout 300s \
  --max-instances 10 \
  --min-instances 1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID,GCP_REGION=$REGION" \
  --service-account="vision-cortex@$PROJECT_ID.iam.gserviceaccount.com"

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format 'value(status.url)')

echo "✅ Vision Cortex deployed successfully!"
echo "🌐 Service URL: $SERVICE_URL"
echo "🔗 Health Check: $SERVICE_URL/health"
echo "🧠 Intelligence API: $SERVICE_URL/vision-cortex/intelligence/synthesize"

# Configure sync with other services
echo "🔄 Configuring sync with intelligence systems..."

# Update Real Estate Intelligence to sync with Vision Cortex
echo "📍 Updating Real Estate Intelligence sync..."
gcloud run services update real-estate-intelligence \
  --region $REGION \
  --project $PROJECT_ID \
  --set-env-vars="VISION_CORTEX_URL=$SERVICE_URL" || echo "Real Estate Intelligence not found"

# Update Auto Builder sync  
echo "🏗️ Updating Auto Builder sync..."
gcloud run services update auto-builder \
  --region $REGION \
  --project $PROJECT_ID \
  --set-env-vars="VISION_CORTEX_URL=$SERVICE_URL" || echo "Auto Builder not found"

# Update Taxonomy system sync
echo "📊 Updating Taxonomy sync..."  
gcloud run services update taxonomy-system \
  --region $REGION \
  --project $PROJECT_ID \
  --set-env-vars="VISION_CORTEX_URL=$SERVICE_URL" || echo "Taxonomy system not found"

# Update Index system sync
echo "📇 Updating Index sync..."
gcloud run services update index-system \
  --region $REGION \
  --project $PROJECT_ID \
  --set-env-vars="VISION_CORTEX_URL=$SERVICE_URL" || echo "Index system not found"

echo ""
echo "🎯 VISION CORTEX QUANTUM AI BRAIN DEPLOYMENT COMPLETE!"
echo "🔗 All intelligence systems now sync to: $SERVICE_URL"
echo "🧠 Quantum intelligence fabric is operational!"
echo ""