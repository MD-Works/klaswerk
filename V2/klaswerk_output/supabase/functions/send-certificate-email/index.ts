// ═══════════════════════════════════════════════════
// KlasWerk — Edge Function: send-certificate-email
// ───────────────────────────────────────────────────
// Triggered via Supabase DB webhook when a new row is
// inserted into public.certificates.
//
// Also callable manually:
//   POST /functions/v1/send-certificate-email
//   { "certificateId": "uuid" }
//
// Uses Resend (free tier: 3000 emails/month)
// Set RESEND_API_KEY in Supabase → Edge Functions → Secrets
// Set APP_URL in secrets too (e.g. https://klaswerk.co.za)
//
// Session 8
// ═══════════════════════════════════════════════════

import { serve }        from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY   = Deno.env.get('RESEND_API_KEY')   ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')     ?? ''
const SUPABASE_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const APP_URL          = Deno.env.get('APP_URL')           ?? 'https://klaswerk.co.za'
const FROM_EMAIL       = Deno.env.get('FROM_EMAIL')        ?? 'noreply@klaswerk.co.za'

// ── Shared CORS headers ───────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Send email via Resend ─────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[send-cert-email] RESEND_API_KEY not set — skipping send')
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[send-cert-email] Resend error:', err)
    return false
  }
  return true
}

// ── Email template ─────────────────────────────────────────────────────────────
function certEmailHtml(opts: {
  studentName: string
  courseTitle: string
  certNumber:  string
  verifyUrl:   string
  certsUrl:    string
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Certificate of Completion — ${opts.courseTitle}</title>
</head>
<body style="margin:0;padding:0;background:#110e09;font-family:'Georgia',serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:32px 24px;background:#0a0906;border:1px solid #2c2619;border-bottom:2px solid #c9943c;border-radius:8px 8px 0 0;">
      <div style="font-family:'Times New Roman',serif;font-size:11px;letter-spacing:0.25em;color:#7a5815;text-transform:uppercase;margin-bottom:12px;">
        K L A S W E R K
      </div>
      <div style="font-size:28px;color:#c9943c;">◎</div>
      <h1 style="font-family:'Times New Roman',serif;font-size:20px;color:#e8c87a;margin:12px 0 4px;">
        Certificate of Completion
      </h1>
      <p style="font-size:13px;color:#7a6d58;margin:0;">Congratulations on your achievement</p>
    </div>

    <!-- Body -->
    <div style="background:#12100b;border:1px solid #2c2619;border-top:none;padding:32px 28px;">
      <p style="font-size:15px;color:#d0c4a8;margin:0 0 8px;">Dear ${opts.studentName},</p>
      <p style="font-size:14px;color:#7a6d58;line-height:1.7;margin:0 0 24px;">
        You have successfully completed <strong style="color:#c9943c;">${opts.courseTitle}</strong>.
        Your certificate has been issued and is ready to view and share.
      </p>

      <!-- Cert number box -->
      <div style="background:#0a0906;border:1px solid #2c2619;border-radius:4px;padding:14px 18px;margin:0 0 24px;text-align:center;">
        <div style="font-size:10px;letter-spacing:0.15em;color:#7a5815;text-transform:uppercase;margin-bottom:6px;">Certificate Number</div>
        <div style="font-family:'Courier New',monospace;font-size:14px;color:#c9943c;letter-spacing:0.08em;">${opts.certNumber}</div>
      </div>

      <!-- CTA buttons -->
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${opts.certsUrl}"
           style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7a5815,#c9943c);color:#0a0906;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;border-radius:4px;margin:0 6px 8px;">
          View My Certificate
        </a>
        <a href="${opts.verifyUrl}"
           style="display:inline-block;padding:12px 28px;background:transparent;border:1px solid #2c2619;color:#c9943c;font-family:Arial,sans-serif;font-size:13px;text-decoration:none;border-radius:4px;margin:0 6px 8px;">
          Share Verify Link
        </a>
      </div>

      <p style="font-size:12px;color:#4a4030;line-height:1.6;margin:0;">
        Anyone can verify the authenticity of your certificate at:<br/>
        <a href="${opts.verifyUrl}" style="color:#7a5815;">${opts.verifyUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;border:1px solid #2c2619;border-top:none;border-radius:0 0 8px 8px;background:#0a0906;">
      <p style="font-size:10px;letter-spacing:0.18em;color:#3a3020;margin:0;">✦  MD WORKS · KLASWERK  ✦</p>
    </div>

  </div>
</body>
</html>`
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const certificateId: string = body?.record?.id ?? body?.certificateId

    if (!certificateId) {
      return new Response(JSON.stringify({ error: 'certificateId required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SVC_KEY)

    // Fetch certificate with joins
    const { data: cert, error: certErr } = await sb
      .from('certificates')
      .select(`
        certificate_number,
        issued_at,
        certificate_data,
        student:student_id ( full_name, email ),
        course:course_id ( title )
      `)
      .eq('id', certificateId)
      .single()

    if (certErr || !cert) {
      return new Response(JSON.stringify({ error: 'Certificate not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const c    = cert as any
    const to   = c.student?.email
    if (!to) {
      return new Response(JSON.stringify({ error: 'Student email not found' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const studentName = c.student?.full_name ?? c.certificate_data?.student_name ?? 'Student'
    const courseTitle = c.course?.title ?? c.certificate_data?.course_title ?? 'Course'
    const certNumber  = c.certificate_number

    const html = certEmailHtml({
      studentName,
      courseTitle,
      certNumber,
      verifyUrl: `${APP_URL}/verify/${certNumber}`,
      certsUrl:  `${APP_URL}/certificates`,
    })

    const ok = await sendEmail(to, `🎓 Your KlasWerk Certificate — ${courseTitle}`, html)

    return new Response(JSON.stringify({ success: ok }), {
      status: ok ? 200 : 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
