#!/usr/bin/env node
/**
 * StableExo — Order Delivery System (VL-32)
 *
 * Flow:
 *   1. Stripe webhook (checkout.session.completed) → queueOrder()
 *   2. queueOrder() saves to warden_orders (Supabase) + triggers Telegram alert to operator
 *   3. Operator reviews Telegram message, replies /approve <report_id>
 *   4. Telegram bot handler → runScanAndDeliver(report_id)
 *   5. Scanner runs → memo HTML generated → emailed to customer → status=delivered
 *
 * Env vars required:
 *   SUPABASE_URL            https://pxbjuhtnmvfywbwmdkdr.supabase.co
 *   SUPABASE_SECRET         sb_secret_...
 *   TELEGRAM_BOT_TOKEN      bot token for @realTheWarden_bot
 *   TELEGRAM_OPERATOR_ID    your personal Telegram chat ID (MTProto ID = 19484510)
 *   SMTP_USER               stableexo@gmail.com
 *   SMTP_PASS               app password
 *   RENDER_PROXY_URL        https://thewarden.onrender.com/scan/proxy
 *   RENDER_PROXY_SECRET     warden-proxy-vl31
 *   ETHERSCAN_KEY           ES16B14...
 *   (optional) CHAINBASE_KEY, NANSEN_KEY, GOPLUS_KEY, DUNE_KEY, BICSCAN_KEY, TRM_FREE=1
 */
"use strict";

const https = require("https");
const http = require("http");

// ─── Supabase client (minimal, no sdk needed) ────────────────────────────────
function supabaseHeaders() {
  return {
    apikey: process.env.SUPABASE_SECRET,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function dbInsert(table, row) {
  return fetchJSON(
    `${process.env.SUPABASE_URL}/rest/v1/${table}`,
    { method: "POST", headers: supabaseHeaders(), body: JSON.stringify(row) }
  );
}

async function dbUpdate(table, id, patch) {
  return fetchJSON(
    `${process.env.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`,
    { method: "PATCH", headers: supabaseHeaders(), body: JSON.stringify(patch) }
  );
}

async function dbGet(table, filter) {
  const qs = Object.entries(filter).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");
  return fetchJSON(
    `${process.env.SUPABASE_URL}/rest/v1/${table}?${qs}&limit=1`,
    { method: "GET", headers: supabaseHeaders() }
  );
}

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

// ─── Telegram ─────────────────────────────────────────────────────────────────
async function tgSend(chatId, text, opts = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.warn("TELEGRAM_BOT_TOKEN not set"); return null; }
  const body = JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...opts });
  const res = await fetchJSON(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return res.body;
}

async function tgGetUpdates(offset) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { result: [] };
  const res = await fetchJSON(
    `https://api.telegram.org/bot${token}/getUpdates?offset=${offset || 0}&timeout=5`
  );
  return res.body || { result: [] };
}

// ─── Report ID generator ─────────────────────────────────────────────────────
function makeReportId(stripeSessionId) {
  const suffix = String(stripeSessionId || "").slice(-8).toUpperCase();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TW-${date}-${suffix}`;
}

// ─── Step 1: Queue order on payment ─────────────────────────────────────────
async function queueOrder(stripeSession) {
  const md = stripeSession.metadata || {};
  const reportId = makeReportId(stripeSession.id);
  const product = md.product || "Lookup note";
  const email = (stripeSession.customer_details && stripeSession.customer_details.email)
    || stripeSession.customer_email || "";
  const name = (stripeSession.customer_details && stripeSession.customer_details.name) || "";
  const addresses = md.addresses || "";

  // Save to Supabase
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
    orderId = (Array.isArray(res.body) && res.body[0]) ? res.body[0].id : null;
    console.log("order queued:", reportId, "id:", orderId, "status:", res.status);
  } catch (e) {
    console.error("db insert failed:", e.message);
  }

  // Telegram operator alert
  const operatorId = process.env.TELEGRAM_OPERATOR_ID || "19484510";
  const addrLines = addresses
    ? addresses.split(/\n|,/).filter(Boolean).map(a => `  • <code>${a.trim()}</code>`).join("\n")
    : "  (none submitted)";

  const msg = `🔔 <b>New Order — ${product}</b>

📋 Report ID: <code>${reportId}</code>
👤 ${name || "(no name)"} — ${email}
📦 Product: ${product}

🔍 Addresses:
${addrLines}

To approve and run scan:
/approve ${reportId}

To reject:
/reject ${reportId} &lt;reason&gt;`;

  try {
    const tgRes = await tgSend(operatorId, msg);
    const msgId = tgRes && tgRes.result && tgRes.result.message_id;
    if (orderId && msgId) {
      await dbUpdate("warden_orders", orderId, { telegram_message_id: String(msgId) });
    }
    console.log("telegram alert sent, msg_id:", msgId);
  } catch (e) {
    console.error("telegram notify failed:", e.message);
  }

  return reportId;
}

// ─── Step 2: Run forensic scan (via Render proxy + Etherscan) ────────────────
async function runScan(addresses) {
  const addrs = (addresses || "").split(/\n|,/).map(s => s.trim()).filter(Boolean);
  if (!addrs.length) return { summary: "No addresses submitted.", findings: [] };

  const results = [];

  for (const addr of addrs) {
    let finding = { address: addr, tools: {} };

    // GoPlus — free, no key, always run
    try {
      const gp = await fetchJSON(
        `https://api.gopluslabs.io/api/v1/address_security/${addr}?chain_id=1`
      );
      if (gp.body && gp.body.result) {
        finding.tools.goplus = gp.body.result[addr.toLowerCase()] || gp.body.result;
      }
    } catch (e) { finding.tools.goplus = { error: e.message }; }

    // Etherscan — tx count, balance, labels
    const ethKey = process.env.ETHERSCAN_KEY;
    if (ethKey) {
      try {
        const bal = await fetchJSON(
          `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${addr}&tag=latest&apikey=${ethKey}`
        );
        const txc = await fetchJSON(
          `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${addr}&page=1&offset=5&sort=desc&apikey=${ethKey}`
        );
        finding.tools.etherscan = {
          balance_wei: bal.body && bal.body.result,
          recent_txs: txc.body && txc.body.result && txc.body.result.length,
        };
      } catch (e) { finding.tools.etherscan = { error: e.message }; }
    }

    // Render proxy — QuickNode + Arkham + Zerion (CF-blocked direct)
    const proxyUrl = process.env.RENDER_PROXY_URL;
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

    // TRM Labs — free keyless sanctions screening
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

  // Build a text summary
  const summaryLines = results.map(f => {
    const gp = f.tools.goplus || {};
    const sanctioned = gp.is_blacklisted === "1" || gp.cybercrime === "1" || gp.phishing_activities === "1";
    const eth = f.tools.etherscan || {};
    const balEth = eth.balance_wei ? (parseInt(eth.balance_wei) / 1e18).toFixed(4) : "?";
    const trm = f.tools.trm;
    const trmHit = Array.isArray(trm) && trm.some(r => r.isSanctioned);
    const risk = (sanctioned || trmHit) ? "⚠️ FLAGS FOUND" : "✅ No direct flags";
    return `${f.address.slice(0, 10)}… — ${risk} — Balance: ${balEth} ETH — TXs: ${eth.recent_txs ?? "?"}`;
  });

  return {
    summary: summaryLines.join("\n"),
    findings: results,
    scanned_at: new Date().toISOString(),
  };
}

// ─── Step 3: Generate memo HTML from scan results ────────────────────────────
function generateMemoHtml(order, scanResult) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const isMemо = order.product && order.product.toLowerCase().includes("memo");
  const tier = isMemо ? "ATTACHABLE SCREENING MEMO" : "LOOKUP NOTE";
  const issuerLine = isMemо
    ? `<div class="issuer">Issued by: <b>StableExo, a sole proprietorship owned by Taylor Marlow, South Carolina</b></div>`
    : "";

  const addrRows = (scanResult.findings || []).map(f => {
    const gp = f.tools.goplus || {};
    const eth = f.tools.etherscan || {};
    const trm = f.tools.trm;
    const trmHit = Array.isArray(trm) && trm.some(r => r.isSanctioned);
    const flags = [];
    if (gp.is_blacklisted === "1") flags.push("Blacklisted");
    if (gp.phishing_activities === "1") flags.push("Phishing");
    if (gp.cybercrime === "1") flags.push("Cybercrime");
    if (trmHit) flags.push("TRM Sanctions");
    const verdict = flags.length ? `<span style="color:#b91c1c;font-weight:700">⚠ ${flags.join(", ")}</span>` : `<span style="color:#065f46;font-weight:700">✓ No direct flags</span>`;
    const balEth = eth.balance_wei ? (parseInt(eth.balance_wei) / 1e18).toFixed(4) : "UNKNOWN";
    const arkham = (f.tools.proxy && f.tools.proxy.arkham && f.tools.proxy.arkham.entity) ? f.tools.proxy.arkham.entity : "UNKNOWN";
    return `<tr>
      <td style="font-family:monospace;font-size:12px">${f.address}</td>
      <td>${verdict}</td>
      <td>${balEth} ETH</td>
      <td>${arkham}</td>
      <td>${eth.recent_txs ?? "UNKNOWN"}</td>
    </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${tier} — ${order.report_id}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#f4f5f7;color:#1a2233;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;padding:0}
.doc{max-width:820px;margin:0 auto;background:#fff}
.hd{background:#0a0e14;color:#fff;padding:24px 38px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}
.hd .tier{color:#38bdf8;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.hd h1{font-size:22px;margin:6px 0 2px}
.hd .id{font-size:13px;color:#9ca3af}
.hd .sig{font-size:13px;color:#e5e7eb;text-align:right}
.meta{display:flex;flex-wrap:wrap;gap:8px 24px;padding:16px 38px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#4b5563}
.meta b{color:#111827}
.body{padding:26px 38px 20px}
h2{font-size:17px;margin:22px 0 10px;padding-bottom:6px;border-bottom:2px solid #111827}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}
th{background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
.exec{background:#f8fafc;border:1px solid #e5e7eb;border-left:4px solid #38bdf8;border-radius:8px;padding:16px 18px;font-size:14px;color:#334155;margin-bottom:6px}
.lim{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;font-size:13px;color:#475467;margin:12px 0}
.lim li{margin:5px 0 5px 18px}
.ft{padding:16px 38px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}
.issuer{font-size:12px;color:#6b7280;margin-top:6px}
</style>
</head>
<body>
<div class="doc">
  <div class="hd">
    <div class="l">
      <div class="tier">${tier}</div>
      <h1>Address Screening Report</h1>
      <div class="id">Report ID: ${order.report_id}</div>
      ${issuerLine}
    </div>
    <div class="sig">
      <b>StableExo</b><br>
      Issued: ${dateStr}<br>
      Prepared for: ${order.purchaser_name || order.purchaser_email}
    </div>
  </div>

  <div class="meta">
    <span><b>Screened:</b> ${dateStr}</span>
    <span><b>Product:</b> ${order.product}</span>
    <span><b>Addresses:</b> ${(scanResult.findings || []).length}</span>
    <span><b>Tools run:</b> GoPlus, Etherscan V2, TRM Labs, QuickNode/Arkham/Zerion via proxy</span>
  </div>

  <div class="body">
    <h2>Executive Summary</h2>
    <div class="exec">
      <pre style="font-family:inherit;white-space:pre-wrap">${scanResult.summary || "No findings."}</pre>
    </div>

    <h2>Address-Level Findings</h2>
    <table>
      <thead><tr>
        <th>Address</th><th>Verdict</th><th>Balance</th><th>Entity (Arkham)</th><th>Tx Count (recent)</th>
      </tr></thead>
      <tbody>${addrRows || "<tr><td colspan=5>No addresses scanned.</td></tr>"}</tbody>
    </table>

    <h2>Methodology &amp; Limitations</h2>
    <div class="lim">
      <ul>
        <li>Screening reflects lists and on-chain state as of the issue timestamp above; subsequent list updates may supersede.</li>
        <li>Proximate-risk (indirect exposure) is noted where tool coverage supports it; it is not a primary conclusion.</li>
        <li>UNKNOWN is a finding, not an omission — it means the tool returned no attribution data, not that the address is clean.</li>
        <li>This is a screening output, not a legal opinion or regulatory determination.</li>
      </ul>
    </div>
  </div>

  <div class="ft">
    <b>Issuer:</b> StableExo, a sole proprietorship owned by Taylor Marlow, based in South Carolina, United States. &nbsp;·&nbsp;
    <b>Report ID:</b> ${order.report_id} &nbsp;·&nbsp;
    <b>Questions:</b> reply to your delivery email quoting the Report ID; a named human responds. &nbsp;·&nbsp;
    Engagement governed by Appendix A as accepted at checkout.
  </div>
</div>
</body>
</html>`;
}

// ─── Step 4: Email memo to customer ─────────────────────────────────────────
async function emailMemo(order, memoHtml, reportId) {
  let nodemailer;
  try { nodemailer = require("nodemailer"); } catch { throw new Error("nodemailer not installed"); }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) throw new Error("SMTP_USER/SMTP_PASS not set");

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const text = `Hi ${order.purchaser_name || "there"},

Your StableExo screening report is attached.

Report ID: ${reportId}
Product: ${order.product}

The memo is attached as an HTML file. Open it in any browser to read and print.

What's in it: address-level findings against live sanction lists and on-chain data, with named sources, as-of dates, and any UNKNOWN shown as a finding (never guessed).

Questions? Reply to this email quoting your Report ID — a named human responds.

Privacy: your submission and our findings stay between us. Nothing is shared, sold, or published.

— StableExo, a sole proprietorship owned by Taylor Marlow, South Carolina`;

  await transporter.sendMail({
    from: `StableExo <${smtpUser}>`,
    to: order.purchaser_email,
    subject: `Your StableExo report · ${reportId}`,
    text,
    attachments: [{
      filename: `${reportId}.html`,
      content: memoHtml,
      contentType: "text/html",
    }],
  });

  console.log("memo delivered to", order.purchaser_email, reportId);
}

// ─── Main approve handler ─────────────────────────────────────────────────────
async function approveAndDeliver(reportId) {
  console.log("approveAndDeliver:", reportId);

  // Fetch order
  const res = await dbGet("warden_orders", { report_id: reportId });
  const order = Array.isArray(res.body) ? res.body[0] : null;
  if (!order) throw new Error(`Order not found: ${reportId}`);

  const operatorId = process.env.TELEGRAM_OPERATOR_ID || "19484510";

  await dbUpdate("warden_orders", order.id, { status: "scanning" });
  await tgSend(operatorId, `🔍 Running scan for <code>${reportId}</code>…`);

  let scanResult;
  try {
    scanResult = await runScan(order.addresses);
  } catch (e) {
    await dbUpdate("warden_orders", order.id, { status: "failed", notes: e.message });
    await tgSend(operatorId, `❌ Scan failed for <code>${reportId}</code>: ${e.message}`);
    throw e;
  }

  await dbUpdate("warden_orders", order.id, {
    status: "awaiting_approval",
    scan_result: JSON.stringify(scanResult),
  });

  // Send scan summary to operator for final review
  const scanMsg = `📊 <b>Scan complete — ${reportId}</b>

${scanResult.summary}

Reply /deliver ${reportId} to send memo to customer (${order.purchaser_email})
Reply /reject ${reportId} &lt;reason&gt; to cancel`;

  await tgSend(operatorId, scanMsg);
}

async function deliverMemo(reportId) {
  const res = await dbGet("warden_orders", { report_id: reportId });
  const order = Array.isArray(res.body) ? res.body[0] : null;
  if (!order) throw new Error(`Order not found: ${reportId}`);

  const operatorId = process.env.TELEGRAM_OPERATOR_ID || "19484510";
  const scanResult = typeof order.scan_result === "string"
    ? JSON.parse(order.scan_result) : order.scan_result || {};

  const memoHtml = generateMemoHtml(order, scanResult);

  await dbUpdate("warden_orders", order.id, {
    status: "approved",
    approved_at: new Date().toISOString(),
    memo_html: memoHtml,
  });

  try {
    await emailMemo(order, memoHtml, order.report_id);
    await dbUpdate("warden_orders", order.id, {
      status: "delivered",
      delivered_at: new Date().toISOString(),
    });
    await tgSend(operatorId, `✅ Memo delivered to ${order.purchaser_email} — <code>${order.report_id}</code>`);
  } catch (e) {
    await dbUpdate("warden_orders", order.id, { status: "failed", notes: "email: " + e.message });
    await tgSend(operatorId, `❌ Email failed for <code>${order.report_id}</code>: ${e.message}`);
    throw e;
  }
}

// ─── Telegram bot command poller ─────────────────────────────────────────────
// Called on a short interval from the main server to process operator commands.
let _tgOffset = 0;
async function pollTelegramCommands() {
  try {
    const upd = await tgGetUpdates(_tgOffset);
    const updates = (upd && upd.result) || [];
    for (const u of updates) {
      _tgOffset = Math.max(_tgOffset, u.update_id + 1);
      const msg = u.message || u.channel_post;
      if (!msg || !msg.text) continue;
      const text = msg.text.trim();
      const operatorId = process.env.TELEGRAM_OPERATOR_ID || "19484510";
      // Only accept commands from operator chat
      if (String(msg.chat && msg.chat.id) !== String(operatorId)) continue;

      const approveMatch = text.match(/^\/approve\s+(TW-[\w-]+)/i);
      const deliverMatch = text.match(/^\/deliver\s+(TW-[\w-]+)/i);
      const rejectMatch  = text.match(/^\/reject\s+(TW-[\w-]+)(?:\s+(.+))?/i);

      if (approveMatch) {
        const rid = approveMatch[1];
        await tgSend(operatorId, `⚡ Starting scan for <code>${rid}</code>…`);
        approveAndDeliver(rid).catch(e =>
          tgSend(operatorId, `❌ Error: ${e.message}`)
        );
      } else if (deliverMatch) {
        const rid = deliverMatch[1];
        await tgSend(operatorId, `📬 Delivering memo for <code>${rid}</code>…`);
        deliverMemo(rid).catch(e =>
          tgSend(operatorId, `❌ Delivery error: ${e.message}`)
        );
      } else if (rejectMatch) {
        const rid = rejectMatch[1];
        const reason = rejectMatch[2] || "Rejected by operator";
        const res2 = await dbGet("warden_orders", { report_id: rid });
        const ord = Array.isArray(res2.body) ? res2.body[0] : null;
        if (ord) {
          await dbUpdate("warden_orders", ord.id, { status: "failed", notes: reason });
          // Notify customer
          let nodemailer;
          try { nodemailer = require("nodemailer"); } catch { /* skip */ }
          if (nodemailer && process.env.SMTP_USER && process.env.SMTP_PASS) {
            const t = nodemailer.createTransport({ host:"smtp.gmail.com",port:465,secure:true,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
            await t.sendMail({
              from:`StableExo <${process.env.SMTP_USER}>`,
              to: ord.purchaser_email,
              subject:`StableExo — order update · ${rid}`,
              text:`Hi,\n\nWe're unable to complete your order (${rid}) at this time.\n\nReason: ${reason}\n\nPlease reply to this email if you have questions. A full refund will be issued.\n\n— StableExo`
            });
          }
          await tgSend(operatorId, `🚫 Order <code>${rid}</code> rejected. Customer notified.`);
        } else {
          await tgSend(operatorId, `⚠ Order <code>${rid}</code> not found.`);
        }
      }
    }
  } catch (e) {
    // Don't crash the server on poll errors
    console.error("telegram poll error:", e.message);
  }
}

module.exports = { queueOrder, approveAndDeliver, deliverMemo, pollTelegramCommands };
