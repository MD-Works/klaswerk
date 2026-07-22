// ═══════════════════════════════════════════════════
// KlasWerk — Edge Function: send-trainer-invite
// ───────────────────────────────────────────────────
// Called by the owner when inviting a trainer.
// 1. Validates caller is owner role
// 2. Generates a secure token (crypto.randomUUID)
// 3. Inserts row into trainer_invites (7-day expiry)
// 4. Sends invite email via Resend
//
// Secrets required (set via supabase secrets set):
//   RESEND_API_KEY   — Resend API key
//   APP_URL          — platform base URL (no trailing slash)
//   APP_NAME         — platform display name
// ═══════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth: verify caller is owner ─────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the calling user from their JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check role in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Forbidden — owner role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse body ───────────────────────────────────────────────────────
    const { email, invitedBy } = await req.json()

    if (!email || !invitedBy) {
      return new Response(JSON.stringify({ error: 'email and invitedBy are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Check: no active pending invite for this email ───────────────────
    const { data: existing } = await supabase
      .from('trainer_invites')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'A pending invite already exists for this email.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Generate token + expiry ──────────────────────────────────────────
    const token     = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // ── Insert invite record ─────────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('trainer_invites')
      .insert({
        email:      email.toLowerCase(),
        token,
        invited_by: invitedBy,
        status:     'pending',
        expires_at: expiresAt,
      })

    if (insertError) throw insertError

    // ── Send email via Resend ────────────────────────────────────────────
    const appUrl  = Deno.env.get('APP_URL')  ?? 'http://localhost:5173'
    const appName = Deno.env.get('APP_NAME') ?? 'KlasWerk'
    const inviteUrl = `${appUrl}/invite?token=${token}`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${appName} <noreply@${new URL(appUrl).hostname}>`,
        to:      [email],
        subject: `You have been invited to join ${appName} as a Trainer`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Trainer Invite — ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#110e09;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#110e09;min-height:100vh;">
  <tr><td align="center" style="padding:48px 16px;">
    <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;width:100%;">

      <!-- Header -->
      <tr><td style="padding-bottom:32px;text-align:center;">
        <div style="font-family:'Georgia',serif;font-size:22px;font-weight:900;
          color:#e8c87a;letter-spacing:0.12em;text-transform:uppercase;">
          ✦ &nbsp; ${appName} &nbsp; ✦
        </div>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:#1a1610;border:1px solid #2c2619;border-radius:8px;padding:36px 40px;">

        <p style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;
          color:#7a5815;margin:0 0 20px 0;font-family:'Courier New',monospace;">
          Trainer Invitation
        </p>

        <h1 style="font-family:'Georgia',serif;font-size:22px;font-weight:400;
          color:#e8c87a;margin:0 0 16px 0;line-height:1.3;">
          You have been invited to join ${appName} as a Trainer
        </h1>

        <p style="font-size:15px;color:#f0e6ce;line-height:1.7;margin:0 0 28px 0;">
          Click the button below to set up your trainer account.
          This invite expires in <strong style="color:#c9943c;">7 days</strong>.
        </p>

        <!-- CTA -->
        <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
          <tr><td style="background:linear-gradient(135deg,#7a5815,#c9943c);border-radius:4px;">
            <a href="${inviteUrl}"
               style="display:inline-block;padding:14px 32px;font-family:'Georgia',serif;
               font-size:13px;font-weight:700;letter-spacing:0.1em;
               text-transform:uppercase;color:#0a0906;text-decoration:none;">
              Activate Trainer Account
            </a>
          </td></tr>
        </table>

        <p style="font-size:12px;color:#7a6d58;line-height:1.6;margin:0 0 8px 0;">
          If the button does not work, copy and paste this link:
        </p>
        <p style="font-size:11px;color:#7a5815;word-break:break-all;
          font-family:'Courier New',monospace;margin:0;">
          ${inviteUrl}
        </p>

      </td></tr>

      <!-- Footer -->
      <tr><td style="padding-top:28px;text-align:center;">
        <p style="font-family:'Courier New',monospace;font-size:10px;
          letter-spacing:0.18em;color:#3d3526;text-transform:uppercase;margin:0;">
          ✦ &nbsp; MD Works &nbsp; ✦ &nbsp; Morney Deetlefs &nbsp; ✦ &nbsp; South Africa
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
      }),
    })

    if (!emailRes.ok) {
      const errBody = await emailRes.text()
      console.error('[send-trainer-invite] Resend error:', errBody)
      // Don't fail the whole request — invite is already saved, email can be resent
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[send-trainer-invite] Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
