#!/bin/bash
# GalaxyEx Vercel Setup Script
# Run this once to create the Vercel project and get the deployment URL.
#
# Usage:
#   VERCEL_TOKEN=your_token bash scripts/setup-vercel.sh
#
# Or interactively:
#   bash scripts/setup-vercel.sh
#
# After running, add these GitHub Secrets:
#   - VERCEL_TOKEN
#   - VERCEL_ORG_ID  (printed by this script)
#   - VERCEL_PROJECT_ID (printed by this script)
#   - NEXT_PUBLIC_SUPABASE_URL
#   - NEXT_PUBLIC_SUPABASE_ANON_KEY
#   - SUPABASE_SERVICE_ROLE_KEY (if needed)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$SCRIPT_DIR/../web"

# Supabase settings
SUPABASE_URL="https://jxsgzzqunzywrbbxhfjv.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4c2d6enF1bnp5d3JiYnhoZmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjcyODcsImV4cCI6MjA5MDEwMzI4N30.gTdjdyrA-FIJjMRWvqWv65O_v-Q08fakRlq72O2YGXo"

echo "================================================="
echo "  GalaxyEx Vercel Deployment Setup"
echo "================================================="

# Check if vercel is installed
if ! command -v vercel &>/dev/null; then
  echo "Installing Vercel CLI..."
  npm install -g vercel@latest
fi

cd "$WEB_DIR"

# Handle token
if [ -z "$VERCEL_TOKEN" ]; then
  echo ""
  echo "No VERCEL_TOKEN found. Starting interactive login..."
  echo "(You can also pass it via: VERCEL_TOKEN=xxx bash scripts/setup-vercel.sh)"
  vercel login
  TOKEN_FLAG=""
else
  TOKEN_FLAG="--token=$VERCEL_TOKEN"
fi

echo ""
echo "Linking project to Vercel..."
vercel link --yes $TOKEN_FLAG

echo ""
echo "Setting environment variables..."
echo "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production $TOKEN_FLAG --yes 2>/dev/null || true
echo "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production $TOKEN_FLAG --yes 2>/dev/null || true

echo ""
echo "Deploying to production..."
DEPLOY_URL=$(vercel deploy --prod $TOKEN_FLAG)
echo ""
echo "================================================="
echo "✅ Deployment successful!"
echo "   URL: $DEPLOY_URL"
echo "================================================="

# Show project config for GitHub Actions
echo ""
echo "📋 GitHub Secrets to add for CI/CD:"
echo "   Go to: https://github.com/GalaxySciTech/galaxyex/settings/secrets/actions"
echo ""
if [ -f ".vercel/project.json" ]; then
  ORG_ID=$(cat .vercel/project.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('orgId',''))" 2>/dev/null || echo "")
  PROJECT_ID=$(cat .vercel/project.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('projectId',''))" 2>/dev/null || echo "")
  echo "   VERCEL_TOKEN = <your_vercel_token>"
  echo "   VERCEL_ORG_ID = $ORG_ID"
  echo "   VERCEL_PROJECT_ID = $PROJECT_ID"
  echo "   NEXT_PUBLIC_SUPABASE_URL = $SUPABASE_URL"
  echo "   NEXT_PUBLIC_SUPABASE_ANON_KEY = $SUPABASE_ANON_KEY"
fi
