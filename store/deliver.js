#!/usr/bin/env node
/**
 * StableExo — Order Delivery System (VL-32)
 *
 * Flow:
 *   1. Stripe webhook (checkout.session.completed) → queueOrder()
 *   2. queueOrder() saves to warden_orders (Supabase) + posts Discord alert to operator
 *   3. Operator replies in Discord or hits /admin/approve?rid=TW-...&secret=...
 *   4. approveAndDeliver() → scanner runs → scan summary posted to Discord
 *   5. Operator hits /admin/deliver?rid=TW-...&secret=... → memo emailed to customer
 *
 * Env vars required:
 *   SUPABASE_URL              https://pxbjuhtnmvfywbwmdkdr.supabase.co
 *   SUPABASE_SECRET           sb_secret_...
 *   DISCORD_WEBHOOK_URL       https://discord.com/api/webhooks/...
 *   ADMIN_SECRET              a secret token to protect /admin/* endpoints
 *   SMTP_USER / SMTP_PASS     Gmail + app password for delivery
 *   RENDER_PROXY_URL          https://thewarden.onrender.com/scan/proxy
 *   RENDER_PROXY_SECRET       warden-proxy-vl31
 *   ETHERSCAN_KEY             ES16B14...
 */
"use strict";

const https = require("https");
const http  = require("http");

// ─── Tiny fetch wrapper ───────────────────────────────────────────────────────
function fetchJSON(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;
    const reqOpts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: opts.method || "GET",
      headers: opts.headers || {},
    };
    const req = mod.request(reqOpts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    req.setTimeout(30000, () => { req.destroy(new Error("timeout")); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

// ─── Supabase ─────────────────────────────────────────────────────────────────
function sbHeaders() {
  return {
    apikey: process.env.SUPABASE_SECRET,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}
const SBURL = () => process.env.SUPABASE_URL || "https://pxbjuhtnmvfywbwmdkdr.supabase.co";

async function dbInsert(table, row) {
  return fetchJSON(`${SBURL()}/rest/v1/${table}`, {
    method: "POST", headers: sbHeaders(), body: JSON.stringify(row),
  });
}
async function dbUpdate(table, id, patch) {
  return fetchJSON(`${SBURL()}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH", headers: sbHeaders(), body: JSON.stringify(patch),
  });
}
async function dbGet(table, filter) {
  const qs = Object.entries(filter)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
  return fetchJSON(`${SBURL()}/rest/v1/${table}?${qs}&limit=1`, {
    method: "GET", headers: sbHeaders(),
  });
}

// ─── Discord ──────────────────────────────────────────────────────────────────
async function discordSend(content) {
  const wh = process.env.DISCORD_WEBHOOK_URL;
  if (!wh) { console.warn("DISCORD_WEBHOOK_URL not set"); return; }
  // Discord has a 2000-char limit per message
  const chunks = [];
  for (let i = 0; i < content.length; i += 1900) chunks.push(content.slice(i, i + 1900));
  for (const chunk of chunks) {
    await fetchJSON(wh, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: chunk }),
    });
  }
}

// ─── Report ID ────────────────────────────────────────────────────────────────
function makeReportId(stripeSessionId) {
  const suffix = String(stripeSessionId || "").slice(-8).toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TW-${date}-${suffix}`;
}

// ─── Step 1: Queue order on payment ──────────────────────────────────────────
async function queueOrder(stripeSession) {
  const md = stripeSession.metadata || {};
  const reportId = makeReportId(stripeSession.id);
  const product  = md.product || "Lookup note";
  const email    = (stripeSession.customer_details && stripeSession.customer_details.email)
                    || stripeSession.customer_email || "";
  const name     = (stripeSession.customer_details && stripeSession.customer_details.name) || "";
  const addresses = md.addresses || "";

  const row = {
    stripe_session_id: stripeSession.id,
    report_id: reportId,
    status: "pending",
    product,
    purchaser_name: name,
    purchaser_email: email,
    addresses,
  };

  let orderId;
  try {
    const res = await dbInsert("warden_orders", row);
    orderId = Array.isArray(res.body) && res.body[0] ? res.body[0].id : null;
    console.log("order queued:", reportId, "id:", orderId);
  } catch (e) {
    console.error("db insert failed:", e.message);
  }

  // Build the base URL for admin links
  const base = (process.env.BASE_URL || "https://thewarden.onrender.com").replace(/\/+$/, "");
  const secret = process.env.ADMIN_SECRET || "change-me";
  const approveUrl = `${base}/admin/approve?rid=${reportId}&secret=${secret}`;
  const rejectUrl  = `${base}/admin/reject?rid=${reportId}&secret=${secret}`;

  const addrLines = addresses
    ? addresses.split(/\n|,/).filter(Boolean).map(a => `• \`${a.trim()}\``).join("\n")
    : "*(none submitted)*";

  const msg =
`🔔 **New Order — ${product}**

📋 Report ID: \`${reportId}\`
👤 ${name || "*(no name)*"} — ${email}
📦 Product: ${product}

🔍 Addresses:
${addrLines}

**Actions:**
✅ Approve + run scan: ${approveUrl}
❌ Reject: ${rejectUrl}`;

  await discordSend(msg);
  return reportId;
}

// ─── Step 2: Run forensic scan ────────────────────────────────────────────────
async function runScan(addresses) {
  const addrs = (addresses || "").split(/\n|,/).map(s => s.trim()).filter(Boolean);
  if (!addrs.length) return { summary: "No addresses submitted.", findings: [] };

  const results = [];

  for (const addr of addrs) {
    const finding = { address: addr, tools: {} };

    // GoPlus — free, no key
    try {
      const gp = await fetchJSON(`https://api.gopluslabs.io/api/v1/address_security/${addr}?chain_id=1`);
      if (gp.body && gp.body.result) {
        finding.tools.goplus = gp.body.result[addr.toLowerCase()] || gp.body.result;
      }
    } catch (e) { finding.tools.goplus = { error: e.message }; }

    // Etherscan V2
    const ethKey = process.env.ETHERSCAN_KEY;
    if (ethKey) {
      try {
        const bal = await fetchJSON(`https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${addr}&tag=latest&apikey=${ethKey}`);
        const txc = await fetchJSON(`https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${addr}&page=1&offset=5&sort=desc&apikey=${ethKey}`);
        finding.tools.etherscan = {
          balance_wei: bal.body && bal.body.result,
          recent_txs: txc.body && txc.body.result && txc.body.result.length,
        };
      } catch (e) { finding.tools.etherscan = { error: e.message }; }
    }

    // Render proxy — QuickNode + Arkham + Zerion
    const proxyUrl    = process.env.RENDER_PROXY_URL;
    const proxySecret = process.env.RENDER_PROXY_SECRET;
    if (proxyUrl && proxySecret) {
      try {
        const px = await fetchJSON(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Proxy-Secret": proxySecret },
          body: JSON.stringify({ address: addr, tools: ["quicknode", "arkham", "zerion"] }),
        });
        if (px.body && px.body.results) finding.tools.proxy = px.body.results;
      } catch (e) { finding.tools.proxy = { error: e.message }; }
    }

    // TRM Labs — free keyless sanctions
    try {
      const trm = await fetchJSON("https://api.trmlabs.com/public/v1/sanctions/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ address: addr, coin: "ETH" }]),
      });
      finding.tools.trm = trm.body;
    } catch (e) { finding.tools.trm = { error: e.message }; }

    results.push(finding);
  }

  const summaryLines = results.map(f => {
    const gp  = f.tools.goplus || {};
    const eth = f.tools.etherscan || {};
    const trm = f.tools.trm;
    const sanctioned = gp.is_blacklisted === "1" || gp.cybercrime === "1" || gp.phishing_activities === "1";
    const trmHit = Array.isArray(trm) && trm.some(r => r.isSanctioned);
    const risk = (sanctioned || trmHit) ? "⚠️ FLAGS" : "✅ Clean";
    const balEth = eth.balance_wei ? (parseInt(eth.balance_wei) / 1e18).toFixed(4) : "?";
    return `${f.address.slice(0, 10)}… — ${risk} — ${balEth} ETH — ${eth.recent_txs ?? "?"} txs`;
  });

  return {
    summary: summaryLines.join("\n"),
    findings: results,
    scanned_at: new Date().toISOString(),
  };
}

// ─── Step 3: Generate memo HTML ───────────────────────────────────────────────
function generateMemoHtml(order, scanResult) {
  const dateStr  = new Date().toISOString().slice(0, 10);
  const isMemo   = order.product && order.product.toLowerCase().includes("memo");
  const tier     = isMemo ? "ATTACHABLE SCREENING MEMO" : "LOOKUP NOTE";
  const issuerLine = isMemo
    ? `<div class="issuer">Issued by: <b>StableExo, a sole proprietorship owned by Taylor Marlow, South Carolina</b></div>`
    : "";

  const addrRows = (scanResult.findings || []).map(f => {
    const gp  = f.tools.goplus || {};
    const eth = f.tools.etherscan || {};
    const trm = f.tools.trm;
    const trmHit = Array.isArray(trm) && trm.some(r => r.isSanctioned);
    const flags = [];
    if (gp.is_blacklisted === "1")      flags.push("Blacklisted");
    if (gp.phishing_activities === "1") flags.push("Phishing");
    if (gp.cybercrime === "1")          flags.push("Cybercrime");
    if (trmHit)                         flags.push("TRM Sanctions");
    const verdict = flags.length
      ? `<span style="color:#b91c1c;font-weight:700">⚠ ${flags.join(", ")}</span>`
      : `<span style="color:#065f46;font-weight:700">✓ No direct flags</span>`;
    const balEth = eth.balance_wei ? (parseInt(eth.balance_wei) / 1e18).toFixed(4) : "UNKNOWN";
    const arkham = f.tools.proxy && f.tools.proxy.arkham && f.tools.proxy.arkham.entity
      ? f.tools.proxy.arkham.entity : "UNKNOWN";
    return `<tr>
      <td style="font-family:monospace;font-size:12px">${f.address}</td>
      <td>${verdict}</td><td>${balEth} ETH</td><td>${arkham}</td><td>${eth.recent_txs ?? "UNKNOWN"}</td>
    </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${tier} — ${order.report_id}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f4f5f7;color:#1a2233;font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55}
.doc{max-width:820px;margin:0 auto;background:#fff}
.hd{background:#0a0e14;color:#fff;padding:24px 38px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}
.hd .tier{color:#38bdf8;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.hd h1{font-size:22px;margin:6px 0 2px}.hd .id{font-size:13px;color:#9ca3af}
.hd .sig{font-size:13px;color:#e5e7eb;text-align:right}
.meta{display:flex;flex-wrap:wrap;gap:8px 24px;padding:16px 38px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#4b5563}
.meta b{color:#111827}.body{padding:26px 38px 20px}
h2{font-size:17px;margin:22px 0 10px;padding-bottom:6px;border-bottom:2px solid #111827}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
th{background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
.exec{background:#f8fafc;border:1px solid #e5e7eb;border-left:4px solid #38bdf8;border-radius:8px;padding:16px 18px;font-size:14px;color:#334155;margin-bottom:6px}
.lim{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;font-size:13px;color:#475467;margin:12px 0}
.lim li{margin:5px 0 5px 18px}.ft{padding:16px 38px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}
.issuer{font-size:12px;color:#9ca3af;margin-top:6px}
</style></head><body><div class="doc">
  <div class="hd">
    <div class="l">
      <div class="tier">${tier}</div>
      <h1>Address Screening Report</h1>
      <div class="id">Report ID: ${order.report_id}</div>
      ${issuerLine}
    </div>
    <div class="sig"><b>StableExo</b><br>Issued: ${dateStr}<br>For: ${order.purchaser_name || order.purchaser_email}</div>
  </div>
  <div class="meta">
    <span><b>Screened:</b> ${dateStr}</span>
    <span><b>Product:</b> ${order.product}</span>
    <span><b>Addresses:</b> ${(scanResult.findings || []).length}</span>
    <span><b>Tools:</b> GoPlus, Etherscan V2, TRM Labs, QuickNode/Arkham/Zerion</span>
  </div>
  <div class="body">
    <h2>Executive Summary</h2>
    <div class="exec"><pre style="font-family:inherit;white-space:pre-wrap">${scanResult.summary || "No findings."}</pre></div>
    <h2>Address-Level Findings</h2>
    <table><thead><tr>
      <th>Address</th><th>Verdict</th><th>Balance</th><th>Entity (Arkham)</th><th>Tx Count</th>
    </tr></thead><tbody>${addrRows || "<tr><td colspan=5>No addresses scanned.</td></tr>"}</tbody></table>
    <h2>Methodology &amp; Limitations</h2>
    <div class="lim"><ul>
      <li>Screening reflects lists and on-chain state as of the issue timestamp; subsequent list updates may supersede.</li>
      <li>UNKNOWN is a finding, not an omission — tool returned no attribution data.</li>
      <li>This is a screening output, not a legal opinion or regulatory determination.</li>
    </ul></div>
  </div>
  <div class="ft">
    <b>Issuer:</b> StableExo, a sole proprietorship owned by Taylor Marlow, South Carolina. &nbsp;·&nbsp;
    <b>Report ID:</b> ${order.report_id} &nbsp;·&nbsp;
    <b>Questions:</b> reply to your delivery email quoting the Report ID.
  </div>
</div></body></html>`;
}

// ─── Step 4: Email memo to customer ──────────────────────────────────────────
async function emailMemo(order, memoHtml) {
  let nodemailer;
  try { nodemailer = require("nodemailer"); } catch { throw new Error("nodemailer not installed"); }
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) throw new Error("SMTP_USER/SMTP_PASS not set");

  const t = nodemailer.createTransport({ host:"smtp.gmail.com",port:465,secure:true,auth:{user:SMTP_USER,pass:SMTP_PASS}});
  await t.sendMail({
    from: `StableExo <${SMTP_USER}>`,
    to: order.purchaser_email,
    subject: `Your StableExo report · ${order.report_id}`,
    text: `Hi ${order.purchaser_name || "there"},\n\nYour screening report is attached as ${order.report_id}.html — open in any browser to read and print.\n\nQuestions? Reply quoting your Report ID.\n\n— StableExo`,
    attachments: [{ filename: `${order.report_id}.html`, content: memoHtml, contentType: "text/html" }],
  });
  console.log("memo delivered to", order.purchaser_email, order.report_id);
}

// ─── Approve: run scan, post summary to Discord ───────────────────────────────
async function approveAndDeliver(reportId) {
  const res   = await dbGet("warden_orders", { report_id: reportId });
  const order = Array.isArray(res.body) ? res.body[0] : null;
  if (!order) throw new Error(`Order not found: ${reportId}`);

  await dbUpdate("warden_orders", order.id, { status: "scanning" });
  await discordSend(`🔍 Running scan for \`${reportId}\`…`);

  let scanResult;
  try {
    scanResult = await runScan(order.addresses);
  } catch (e) {
    await dbUpdate("warden_orders", order.id, { status: "failed", notes: e.message });
    await discordSend(`❌ Scan failed for \`${reportId}\`: ${e.message}`);
    throw e;
  }

  await dbUpdate("warden_orders", order.id, {
    status: "awaiting_approval",
    scan_result: JSON.stringify(scanResult),
  });

  const base   = (process.env.BASE_URL || "https://thewarden.onrender.com").replace(/\/+$/, "");
  const secret = process.env.ADMIN_SECRET || "change-me";
  const deliverUrl = `${base}/admin/deliver?rid=${reportId}&secret=${secret}`;
  const rejectUrl  = `${base}/admin/reject?rid=${reportId}&secret=${secret}`;

  await discordSend(
`📊 **Scan complete — ${reportId}**

${scanResult.summary}

📬 Send memo to ${order.purchaser_email}: ${deliverUrl}
❌ Reject: ${rejectUrl}`
  );
}

// ─── Deliver: generate memo, email to customer ────────────────────────────────
async function deliverMemo(reportId) {
  const res   = await dbGet("warden_orders", { report_id: reportId });
  const order = Array.isArray(res.body) ? res.body[0] : null;
  if (!order) throw new Error(`Order not found: ${reportId}`);

  const scanResult = typeof order.scan_result === "string"
    ? JSON.parse(order.scan_result) : order.scan_result || {};
  const memoHtml = generateMemoHtml(order, scanResult);

  await dbUpdate("warden_orders", order.id, {
    status: "approved", approved_at: new Date().toISOString(), memo_html: memoHtml,
  });

  try {
    await emailMemo(order, memoHtml);
    await dbUpdate("warden_orders", order.id, { status: "delivered", delivered_at: new Date().toISOString() });
    await discordSend(`✅ Memo delivered to ${order.purchaser_email} — \`${order.report_id}\``);
  } catch (e) {
    await dbUpdate("warden_orders", order.id, { status: "failed", notes: "email: " + e.message });
    await discordSend(`❌ Email failed for \`${order.report_id}\`: ${e.message}`);
    throw e;
  }
}

// ─── Reject order ─────────────────────────────────────────────────────────────
async function rejectOrder(reportId, reason) {
  const res   = await dbGet("warden_orders", { report_id: reportId });
  const order = Array.isArray(res.body) ? res.body[0] : null;
  if (!order) throw new Error(`Order not found: ${reportId}`);

  await dbUpdate("warden_orders", order.id, { status: "failed", notes: reason || "Rejected by operator" });

  // Notify customer
  let nodemailer;
  try { nodemailer = require("nodemailer"); } catch { /* skip */ }
  if (nodemailer && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const t = nodemailer.createTransport({host:"smtp.gmail.com",port:465,secure:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
    await t.sendMail({
      from: `StableExo <${process.env.SMTP_USER}>`,
      to: order.purchaser_email,
      subject: `StableExo — order update · ${reportId}`,
      text: `Hi,\n\nWe're unable to complete your order (${reportId}) at this time.\n\nReason: ${reason || "See operator notes"}\n\nA full refund will be issued. Reply with questions.\n\n— StableExo`,
    });
  }
  await discordSend(`🚫 Order \`${reportId}\` rejected. Customer notified.`);
}

module.exports = { queueOrder, approveAndDeliver, deliverMemo, rejectOrder };
