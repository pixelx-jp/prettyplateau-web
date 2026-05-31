#!/usr/bin/env bash
# Deploy render-service + web to Cloud Run via Cloud Build (no local docker).
# Idempotent: re-run to redeploy. Requires an authenticated gcloud with access
# to $PROJECT (run `gcloud auth login` first).
#
# Usage: scripts/deploy.sh
set -euo pipefail

PROJECT="${PROJECT:?set PROJECT to your GCP project id}"
REGION="${REGION:-asia-northeast1}"
BUCKET="${BUCKET:-${PROJECT}-prettyplateau-cache}"
SVC_NAME="${SVC_NAME:-prettyplateau-render}"
WEB_NAME="${WEB_NAME:-prettyplateau-web}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> project=${PROJECT} region=${REGION} bucket=${BUCKET}"

echo "==> enabling APIs"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com storage.googleapis.com --project "$PROJECT"

echo "==> ensuring cache bucket"
gcloud storage buckets describe "gs://${BUCKET}" --project "$PROJECT" >/dev/null 2>&1 \
  || gcloud storage buckets create "gs://${BUCKET}" --project "$PROJECT" --location "$REGION" \
       --uniform-bucket-level-access

echo "==> deploying render-service"
gcloud run deploy "$SVC_NAME" \
  --source "${ROOT}/render-service" \
  --project "$PROJECT" --region "$REGION" \
  --memory 8Gi --cpu 4 --cpu-boost --concurrency 1 --timeout 900 \
  --min-instances 0 --max-instances 3 \
  --set-env-vars "GCS_CACHE_BUCKET=${BUCKET},ALLOW_FETCH=1,MAX_INFLIGHT=2" \
  --allow-unauthenticated
SVC_URL="$(gcloud run services describe "$SVC_NAME" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo "    render-service: ${SVC_URL}"

echo "==> building web image (VITE_API_BASE=${SVC_URL})"
# --source can't pass docker build-args, so build explicitly with cloudbuild.yaml.
AR_REPO="${REGION}-docker.pkg.dev/${PROJECT}/cloud-run-source-deploy"
WEB_IMAGE="${AR_REPO}/${WEB_NAME}:$(date +%s)"
gcloud builds submit "${ROOT}/web" --project "$PROJECT" --region "$REGION" \
  --config "${ROOT}/web/cloudbuild.yaml" \
  --substitutions "_API_BASE=${SVC_URL},_IMAGE=${WEB_IMAGE}"

echo "==> deploying web"
gcloud run deploy "$WEB_NAME" \
  --image "$WEB_IMAGE" \
  --project "$PROJECT" --region "$REGION" \
  --memory 256Mi --cpu 1 --min-instances 0 --max-instances 4 \
  --allow-unauthenticated
WEB_URL="$(gcloud run services describe "$WEB_NAME" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo "    web: ${WEB_URL}"

echo "==> wiring CORS: render-service now allows ${WEB_URL}"
gcloud run services update "$SVC_NAME" --project "$PROJECT" --region "$REGION" \
  --update-env-vars "CORS_ORIGINS=${WEB_URL}"

echo
echo "Done."
echo "  web:            ${WEB_URL}"
echo "  render-service: ${SVC_URL}"
