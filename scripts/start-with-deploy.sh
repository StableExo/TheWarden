#!/bin/sh
# S44: One-time deploy wrapper — deploys multi-router FlashSwapV3 then starts main engine
# This runs once, deploys if needed, then starts the normal arb engine

# Check if we should deploy (env var flag)
if [ "$DEPLOY_MULTI_ROUTER" = "true" ]; then
  echo "=== S44: Running multi-router FlashSwapV3 deployment ==="
  npx ts-node scripts/deploy-multi-router.ts
  DEPLOY_EXIT=$?
  if [ $DEPLOY_EXIT -eq 0 ]; then
    echo "=== Deployment complete (or already deployed) ==="
  else
    echo "=== Deployment script exited with code $DEPLOY_EXIT ==="
  fi
fi

# Start the main arb engine
exec npm run start
