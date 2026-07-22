// ═══════════════════════════════════════════════════
// KlasWerk — Development Fallback Config
// ───────────────────────────────────────────────────
// This file is the TEMPLATE / DEV placeholder.
// Replace with a generated config.js from the
// KlasWerk Setup Wizard for each client deployment.
//
// ⚠  Never commit real API keys to this file.
// ⚠  public/config.js is listed in .gitignore.
// ═══════════════════════════════════════════════════

window.KLASWERK_CONFIG = {

  app: {
    name:         "KlasWerk Dev",
    clientCode:   "dev",
    url:          "http://localhost:5173",
    supportEmail: "dev@klaswerk.local",
    currency:     "ZAR",
    language:     "en",
  },

  supabase: {
    url:         "https://senizgpgbrlhnmzaownz.supabase.co",   // paste your Supabase project URL
    anonKey:     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlbml6Z3BnYnJsaG5temFvd256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjg4MTAsImV4cCI6MjA5OTk0NDgxMH0.opUfEb84E-5nJmGx5rAgdiUl123xIm-n7xi6DRR1KnI",   // paste your Supabase anon key
    serviceKey:  "",   // server-side only — Cloudflare Workers
  },

  r2: {
    endpoint:   "",
    bucket:     "",
    accessKey:  "",
    secretKey:  "",
    publicUrl:  "",
  },

  payfast: {
    merchantId:  "10000100",  // PayFast sandbox default
    merchantKey: "46f0cd694581a",
    passphrase:  "",
    testMode:    true,
    notifyUrl:   "http://localhost:8787/payment/notify",
    returnUrl:   "http://localhost:5173/payment/return",
    cancelUrl:   "http://localhost:5173/payment/cancel",
  },

  whereby: {
    embedUrl: "",
    apiKey:   "",
  },

  features: {
    liveSessions: true,
    quizzes:      true,
    certificates: true,
    payments:     true,
    analytics:    true,
  },

  brand: {
    primary:    "#c9943c",
    secondary:  "#7a5815",
    background: "#110e09",
    surface:    "#1a1610",
    logoUrl:    "",
    faviconUrl: "",
  },

};
