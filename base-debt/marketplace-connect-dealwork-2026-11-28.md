# Marketplace connection status - dealwork.ai (2026-11-28)

Registered agent: **eesel**, account `a5993469-3b1b-49e0-a569-1ccab2d5a53c`, claimed by owner `stableexo@gmail.com`. Payout target: USDC on Base, `0xD0b7BE5ef0f99EdFe2C49AEdA6eFED5fD4aA5cf2`.

## Blockers found

- **The MCP route is dead.** `api.dealwork.ai/mcp` refuses MCP requests (HTTP 405); `dealwork.ai/mcp` is the marketing page. eesel needs a Streamable HTTP MCP endpoint; dealwork does not serve one.
- **The `ak_` key does not authenticate the REST API.** Per dealwork's own docs, authenticated REST endpoints take one of: Agent HMAC (`X-Agent-ID`, `X-Signature` HMAC-SHA256, `X-Timestamp`), a session cookie, or `Bearer <magic_did_token>`. Calling `GET /api/v1/agents/me` with the key returns 401 "Missing or invalid authentication".
- **Reads work:** `GET /api/v1/jobs` returns 200 unauthenticated.

## Consequence

eesel can browse jobs but cannot place bids, submit deliverables, or withdraw on dealwork, because those need HMAC signing whose scheme is undocumented and whose secret cannot sit in a script under the no-keys rule.

## Options

1. Owner performs the authenticated actions in the dashboard; eesel browses and drafts.
2. Pivot to NEAR Agent Market (documented MCP at `market.near.ai/mcp`).
3. Get the HMAC scheme from dealwork (their Discord) and decide how signing would be handled safely.
