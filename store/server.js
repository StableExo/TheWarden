#!/usr/bin/env node
/**
 * StableExo store — static landing page + Stripe Checkout + order delivery.
 *
 * Env:
 *   STRIPE_SECRET_KEY        (required)
 *   STRIPE_WEBHOOK_SECRET    (required)
 *   PORT                     (default 10000)
 *   BASE_URL                 public origin (Render URL)
 *   STRIPE_PRICE_LOOKUP      price id for $99 lookup
 *   STRIPE_PRICE_MEMO        price id for $1,500 memo
 *   SUPABASE_URL             https://pxbjuhtnmvfywbwmdkdr.supabase.co
 *   SUPABASE_SECRET          sb_secret_...
 *   DISCORD_WEBHOOK_URL      https://discord.com/api/webhooks/...
 *   ADMIN_SECRET             secret token for /admin/* endpoints
 *   SMTP_USER / SMTP_PASS    Gmail + app password for delivery
 *   RENDER_PROXY_URL         https://thewarden.onrender.com/scan/proxy
 *   RENDER_PROXY_SECRET      warden-proxy-vl31
 *   ETHERSCAN_KEY            for on-chain data
 */
"use strict";
const path = require("path");
const express = require("express");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) { console.error("STRIPE_SECRET_KEY is not set."); process.exit(1); }

const Stripe = require("stripe");
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const PORT         = process.env.PORT || 10000;
const BASE_URL     = (process.env.BASE_URL || "").replace(/\/+$/, "");
const PRICE_LOOKUP = process.env.STRIPE_PRICE_LOOKUP || "price_1U9c2oFATow5sRkPhWsv46v6";
const PRICE_MEMO   = process.env.STRIPE_PRICE_MEMO   || "price_1U9c2sFATow5sRkPqsyL20lu";
const IS_TEST_MODE = (STRIPE_SECRET_KEY || "").startsWith("sk_test_");
const ADMIN_SECRET = process.env.ADMIN_SECRET || "change-me";

const embeddedAssets = require("./assets.js");
const { queueOrder, approveAndDeliver, deliverMemo, rejectOrder } = require("./deliver.js");

const crypto    = require("crypto");
let nodemailer  = null;
try { nodemailer = require("nodemailer"); } catch (_) {}

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

async function sendOrderConfirmation(session) {
  if (!nodemailer || !SMTP_USER || !SMTP_PASS) return;
  const email = (session.customer_details && session.customer_details.email) || session.customer_email;
  if (!email) return;
  const name    = (session.customer_details && session.customer_details.name) || "there";
  const md      = session.metadata || {};
  const product = md.product || "Lookup note";
  const reportId = "R-" + String(session.id).slice(-8).toUpperCase();
  const t = nodemailer.createTransport({ host:"smtp.gmail.com",port:465,secure:true,auth:{user:SMTP_USER,pass:SMTP_PASS}});
  await t.sendMail({
    from: `StableExo <${SMTP_USER}>`,
    to: email,
    subject: `StableExo order received · ${reportId}`,
    text: `Hi ${name},\n\nYour order is confirmed.\n\nOrder reference: ${reportId}\nScope: ${product}\n\nWe'll deliver within 3 business days to this email. Reply quoting your Report ID with any questions.\n\nPrivacy: your submission stays between us.\n\n— StableExo, a sole proprietorship owned by Taylor Marlow, South Carolina`,
  });
  console.log("confirmation sent:", email, reportId);
}

const app = express();
app.disable("x-powered-by");

// ── Stripe webhook (raw body required) ────────────────────────────────────────
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!STRIPE_WEBHOOK_SECRET)
    return res.status(200).json({ received: true, note: "webhook secret not configured" });
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("webhook verify error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      try { await sendOrderConfirmation(session); } catch (e) { console.error("confirm email:", e.message); }
      try { await queueOrder(session); }           catch (e) { console.error("queueOrder:", e.message); }
    }
  }
  return res.json({ received: true });
});

app.use(express.json({ limit: "64kb" }));

// ── Static assets ─────────────────────────────────────────────────────────────
app.get("/memo-first-page.png", (req, res) => {
  res.set("Content-Type", "image/png");
  res.send(Buffer.from(embeddedAssets.memoFirstPagePng, "base64"));
});
app.get("/stableexo-appendix-A-engagement-terms.pdf", (req, res) => {
  res.set("Content-Type", "application/pdf");
  res.send(Buffer.from(embeddedAssets.appendixAPdf, "base64"));
});
app.use(express.static(path.join(__dirname, "public"), { index: "index.html" }));

function originOf(req) {
  if (BASE_URL) return BASE_URL;
  return `${req.headers["x-forwarded-proto"] || "http"}://${req.get("host")}`;
}

// ── Checkout ──────────────────────────────────────────────────────────────────
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { product = "lookup", name = "", email = "", addresses = "" } = req.body || {};
    if (product === "engagement") {
      return res.json({ ok: true, url: "mailto:stableexo@gmail.com?subject=" + encodeURIComponent("StableExo engagement scope request") });
    }
    const priceId = product === "memo" ? PRICE_MEMO : PRICE_LOOKUP;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      metadata: {
        product: product === "memo" ? "Attachable memo" : "Lookup note",
        purchaser_name:  String(name      || "").slice(0, 200),
        purchaser_email: String(email     || "").slice(0, 200),
        addresses:       String(addresses || "").slice(0, 2000),
      },
      success_url: `${originOf(req)}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${originOf(req)}/checkout/cancel`,
    });
    return res.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("checkout error:", err && err.message);
    const hint = err && err.type === "StripeInvalidRequestError"
      ? "A payment method isn't enabled for this account."
      : "Could not start checkout. Please try again.";
    return res.status(400).json({ ok: false, message: hint });
  }
});

// ── Admin endpoints (operator clicks links from Discord) ──────────────────────
function adminAuth(req, res) {
  if ((req.query.secret || req.body && req.body.secret) !== ADMIN_SECRET) {
    res.status(403).send("Forbidden");
    return false;
  }
  return true;
}

app.get("/admin/approve", async (req, res) => {
  if (!adminAuth(req, res)) return;
  const rid = String(req.query.rid || "");
  if (!rid) return res.status(400).send("Missing rid");
  res.send(`<p>Scan started for ${rid}. Check Discord for results.</p>`);
  approveAndDeliver(rid).catch(e => console.error("approve error:", e.message));
});

app.get("/admin/deliver", async (req, res) => {
  if (!adminAuth(req, res)) return;
  const rid = String(req.query.rid || "");
  if (!rid) return res.status(400).send("Missing rid");
  res.send(`<p>Delivering memo for ${rid}…</p>`);
  deliverMemo(rid).catch(e => console.error("deliver error:", e.message));
});

app.get("/admin/reject", async (req, res) => {
  if (!adminAuth(req, res)) return;
  const rid    = String(req.query.rid    || "");
  const reason = String(req.query.reason || "Rejected by operator");
  if (!rid) return res.status(400).send("Missing rid");
  res.send(`<p>Order ${rid} rejected. Customer will be notified.</p>`);
  rejectOrder(rid, reason).catch(e => console.error("reject error:", e.message));
});

// ── Success / cancel pages ────────────────────────────────────────────────────
app.get("/checkout/success", (req, res) => {
  const sid = String(req.query.session_id || "").slice(0, 64);
  res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order received - StableExo</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#1a2233;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}.c{max-width:560px;padding:40px 24px}.ok{color:#0e9f6e;font-weight:700}.code{background:#f3f4f6;padding:2px 8px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:12px}</style></head>
<body><div class="c"><p class="ok">&#10003; Payment received</p><h1>Order confirmed.</h1>
<p>We'll email your deliverables within 3 business days. A named human answers any questions — just reply to your confirmation email.</p>
<p style="font-size:13px;color:#6b7280">Order reference: <span class="code">${sid || "—"}</span></p>
<p style="font-size:12px;color:#9ca3af">StableExo, a sole proprietorship owned by Taylor Marlow, South Carolina.</p>
</div></body></html>`);
});

app.get("/checkout/cancel", (req, res) => {
  res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Order not completed - StableExo</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#1a2233;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}div{max-width:560px;padding:40px 24px}</style></head>
<body><div><h1>Order not completed</h1><p>No payment was made. Return whenever you're ready.</p><p><a href="/">&#8592; Back to StableExo</a></p></div></body></html>`);
});

app.get("/health", (req, res) => res.send("ok"));

app.listen(PORT, () => console.log(`stableexo-store :${PORT} test=${IS_TEST_MODE}`));
