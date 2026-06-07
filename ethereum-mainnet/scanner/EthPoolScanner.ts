          // GL-L55: Dynamic borrow sizing — ternary search for optimal borrow amount.
          // Fixes hardcoded 100K: finds whatever borrow gives back > borrow.
          // Dead pools (back=14K at 100K) return negative at all sizes → filtered naturally.
          try {
            const loFeeN = lo.pool.fee ?? 500;
            const hiFeeN = hi.pool.fee ?? 3000;
            // Surface pre-filter: skip pairs where spread can't cover fees (no RPC)
            const approxSprd = hi.price > 0 && lo.price > 0 ? (hi.price - lo.price) / lo.price : 0;
            if (approxSprd < (loFeeN + hiFeeN) / 1_000_000 * 0.5) continue;

            // Profit function — chains 2 Q2 quotes for a given borrow size
            const profit2H = async (amt: bigint): Promise<bigint> => {
              try {
                const o1 = await this.q2Quote(lo.pool.token0, lo.pool.token1, amt,  loFeeN);
                if (!o1 || o1 === 0n) return -amt;
                const o2 = await this.q2Quote(hi.pool.token1, hi.pool.token0, o1,   hiFeeN);
                if (!o2 || o2 === 0n) return -amt;
                return o2 - amt;
              } catch { return -amt; }
            };

            // Fast-path: try 100K first. If profitable, use it immediately.
            let optAmt = BORROW; let optProfit = await profit2H(BORROW);
            if (optProfit <= 0n) {
              // Search for a borrow size that IS profitable
              const res = await this.ternarySearchBorrow(profit2H);
              optAmt = res.amount; optProfit = res.profit;
            }
            if (optProfit <= 0n) {
              console.log(`[Q2 ❌] ${pair.label} no profitable size (best=${(Number(optAmt+optProfit)/1e6).toFixed(2)} USDC)`);
              continue;
            }
            const cbps = Math.round(Number(optProfit) / Number(optAmt) * 10_000);
            console.log(`[Q2 ✅] ${pair.label} | borrow=${(Number(optAmt)/1e6).toFixed(0)} USDC | profit=${(Number(optProfit)/1e6).toFixed(4)} USDC | ${cbps}bps`);
            opps.push({
              label: `${pair.label} [${lo.pool.protocol}→${hi.pool.protocol}] Q2:${cbps}bps`,
              buyPool: lo.pool, sellPool: hi.pool,
              buyPrice: lo.price, sellPrice: hi.price, spread,
              profitable: true, estimatedProfitBps: cbps, hopCount: 2, optimalBorrow: optAmt,
            });
          } catch (e: any) { console.error('[Q2 ERR]', e?.message || e); continue; }