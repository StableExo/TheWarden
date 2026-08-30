#!/usr/bin/env node
/**
 * StableExo store — static landing page + Stripe Checkout.
 * Serves the quiet landing page and creates Stripe Checkout Sessions for the
 * two one-time offers ($99 lookup note, $1,500 Attachable screening memo).
 * Cash App Pay is offered alongside cards.
 *
 * Env:
 *   STRIPE_SECRET_KEY     (required)  live sk_live key, set in Render, never committed
 *   PORT                  (default)  10000
 *   BASE_URL              (optional)  public origin for success/cancel URLs (Render URL)
 *   STRIPE_PRICE_LOOKUP   (optional)  price id for the $99 lookup
 *   STRIPE_PRICE_MEMO     (optional)  price id for the $1,500 memo
 */
"use strict";
const path = require("path");
const express = require("express");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is not set.");
  process.exit(1);
}
const Stripe = require("stripe");
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const PORT = process.env.PORT || 10000;
const BASE_URL = (process.env.BASE_URL || "").replace(/\/+$/, "");
const PRICE_LOOKUP = process.env.STRIPE_PRICE_LOOKUP || "price_1U9c2oFATow5sRkPhWsv46v6";
const PRICE_MEMO = process.env.STRIPE_PRICE_MEMO || "price_1U9c2sFATow5sRkPqsyL20lu";
const IS_TEST_MODE = (STRIPE_SECRET_KEY || "").startsWith("sk_test_");

// Binary assets are embedded as base64 in assets.js (the GitHub text-only push
// cannot carry raw binaries). Decode and serve them here BEFORE the static
// middleware so these routes always take precedence.
const embeddedAssets = require("./assets.js");

// --- Auto order-confirmation email (webhook-driven) -------------------------
const crypto = require("crypto");
let nodemailer = null;
try { nodemailer = require("nodemailer"); } catch (_) { /* optional dep */ }

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";

async function sendOrderConfirmation(session) {
  if (!nodemailer || !SMTP_USER || !SMTP_PASS) {
    console.warn("Order email not configured (SMTP_USER/SMTP_PASS) — skipped.");
    return;
  }
  const email =
    (session.customer_details && session.customer_details.email) ||
    session.customer_email;
  if (!email) { console.warn("No buyer email on session; skipped."); return; }
  const name =
    (session.customer_details && session.customer_details.name) || "there";
  const md = session.metadata || {};
  const product = md.product || "Lookup note";
  const addresses = md.addresses || "";
  const reportId = "R-" + String(session.id).slice(-8).toUpperCase();
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  const text =
`Hi ${name},

Your order is confirmed. Here's what happens next.

Order reference: ${reportId}
Scope: ${product}
Addresses submitted: ${addresses || "(none provided)"}

What we'll deliver:
- Named sources with as-of dates, evidence edges, and any UNKNOWN shown as a finding (never guessed).
- A dated report carrying your Report ID so it's clear what each output represents.
- Issued within 3 business days of cleared payment, to this email.

Questions? Reply to this email and quote your Report ID — a named human responds.

Privacy note: what you submit and what we find stays between us. Nothing is shared, sold, or published. This engagement is governed by the terms you accepted at checkout (Appendix A).

— StableExo, a sole proprietorship owned by Taylor Marlow, South Carolina`;
  await transporter.sendMail({
    from: `StableExo <${SMTP_USER}>`,
    to: email,
    subject: `StableExo order received · ${reportId}`,
    text,
  });
  console.log("order confirmation sent to", email, reportId);
}

const app = express();
app.disable("x-powered-by");

// Stripe webhook: raw body is required for signature verification, so this
// route is registered BEFORE any body-parsing middleware.
app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    return res.status(200).json({ received: true, note: "webhook secret not configured" });
  }
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("webhook verify error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status === "paid") {
      try { await sendOrderConfirmation(session); }
      catch (e) { console.error("webhook email error:", e.message); }
    }
  }
  return res.json({ received: true });
});

app.use(express.json({ limit: "64kb" }));

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
  const proto = req.headers["x-forwarded-proto"] || "http";
  return `${proto}://${req.get("host")}`;
}

// Order form -> Stripe Checkout Session.
// Body: { product: "lookup"|"memo"|"engagement", name, email, addresses }
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { product = "lookup", name = "", email = "", addresses = "" } = req.body || {};
    if (product === "engagement") {
      // Custom engagement is quote-by-email; no auto-checkout.
      return res.json({
        ok: true,
        url: "mailto:stableexo@gmail.com?subject=" + encodeURIComponent("StableExo engagement scope request"),
      });
    }
    const priceId = product === "memo" ? PRICE_MEMO : PRICE_LOOKUP;
    const metadata = {
      product: product === "memo" ? "Attachable memo" : "Lookup note",
      purchaser_name: String(name || "").slice(0, 200),
      purchaser_email: String(email || "").slice(0, 200),
      addresses: String(addresses || "").slice(0, 2000),
    };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      metadata,
      payment_method_types: ["card", "cashapp"],
      success_url: `${originOf(req)}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${originOf(req)}/checkout/cancel`,
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

app.get("/checkout/success", (req, res) => {
  const sid = String(req.query.session_id || "").slice(0, 64);
  res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Order received - StableExo</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#1a2233;margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}.c{max-width:560px;padding:40px 24px}.ok{color:#0e9f6e;font-weight:700}.code{background:#f3f4f6;padding:2px 8px;border-radius:6px;font-family:ui-monospace,Menlo,monospace;font-size:12px}</style></head>
<body><div class="c"><p class="ok">&#10003; Payment received</p>
<h1>Order confirmed.</h1>
<p>We'll email your deliverables to the address you provided. If we need any details for the report, we'll reply quoting your order — a named human answers.</p>
<p style="font-size:13px;color:#6b7280">Order reference: <span class="code">${sid || "—"}</span></p>
<p style="font-size:12px;color:#9ca3af">StableExo, a sole proprietorship owned by Taylor Marlow, South Carolina.</p>
</div></body></html>`);
});

app.get("/checkout/cancel", (req, res) => {
  res.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Order not completed - StableExo</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#1a2233;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}div{max-width:560px;padding:40px 24px}</style></head>
<body><div><h1>Order not completed</h1><p>No payment was made. You can return to the page and order again whenever you're ready.</p><p><a href="/">&#8592; Back to StableExo</a></p></div></body></html>`);
});

app.get("/health", (req, res) => res.send("ok"));

app.listen(PORT, () => console.log(`stableexo-store listening on :${PORT} (test=${IS_TEST_MODE})`));