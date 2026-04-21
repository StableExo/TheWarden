#!/bin/sh
# S58: One-time deploy wrapper — compiles + deploys FlashSwapV3 Contract #15, then starts main engine
# Triggered by DEPLOY_MULTI_ROUTER=true in Railway env vars

if [ "$DEPLOY_MULTI_ROUTER" = "true" ]; then
  echo "=== S58: Compiling FlashSwapV3 Contract #15 with Hardhat ==="
  npx hardhat compile --force
  COMPILE_EXIT=$?
  if [ $COMPILE_EXIT -ne 0 ]; then
    echo "=== COMPILE FAILED (exit $COMPILE_EXIT) — skipping deploy ==="
  else
    echo "=== S58: Running Contract #15 deployment ==="
    npx ts-node scripts/deploy-multi-router.ts
    DEPLOY_EXIT=$?
    if [ $DEPLOY_EXIT -eq 0 ]; then
      echo "=== Contract #15 deployed (or already exists) ==="
    else
      echo "=== Deploy script exited with code $DEPLOY_EXIT ==="
    fi
  fi
fi

# Start the main arb engine
exec npm run start
