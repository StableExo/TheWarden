#!/bin/sh
# S52: One-time deploy wrapper — compiles + deploys FlashSwapV3 v14, then starts main engine
# Triggered by DEPLOY_MULTI_ROUTER=true in Railway env vars

if [ "$DEPLOY_MULTI_ROUTER" = "true" ]; then
  echo "=== S52: Compiling FlashSwapV3 with Hardhat ==="
  npx hardhat compile --force
  COMPILE_EXIT=$?
  if [ $COMPILE_EXIT -ne 0 ]; then
    echo "=== COMPILE FAILED (exit $COMPILE_EXIT) — skipping deploy ==="
  else
    echo "=== S52: Running Contract #14 deployment ==="
    npx ts-node scripts/deploy-multi-router.ts
    DEPLOY_EXIT=$?
    if [ $DEPLOY_EXIT -eq 0 ]; then
      echo "=== Contract #14 deployed (or already exists) ==="
    else
      echo "=== Deploy script exited with code $DEPLOY_EXIT ==="
    fi
  fi
fi

# Start the main arb engine
exec npm run start
