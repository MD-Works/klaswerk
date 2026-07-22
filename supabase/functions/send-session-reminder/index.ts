// ═══════════════════════════════════════════════════
// KlasWerk — Edge Function: send-session-reminder
// ───────────────────────────────────────────────────
// Call via Supabase pg_cron or a scheduled job.
// Sends "your live session starts in 30 minutes" email
// to all enrolled students for sessions starting soon.
//
// Schedule suggestion (pg_cron):
//   SELECT cron.schedule(
//     'session-reminders',
//     '*/15 * * * *',   -- every 15 minutes
//     $$SELECT net.http_post(
//       url := 'https://<project>.supabase.co/functions/v1/send-session-reminder',
//       headers := '{"Authorization":"Bearer <anon_key>"}'::jsonb
//     )$$
//   );
//
// Or call it manually:
//   POST /functions/v1/send-session-reminder
//   {} (no body needed)
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

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) { console.warn('RESEND_API_KEY not set'); return false }
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  return res.ok
}

function reminderHtml(opts: {
  studentName: string
  sessionTitle: string
  courseTitle:  string
  scheduledFor: string
  sessionUrl:   string
}): string {
  const time = new Date(opts.scheduledFor).toLocaleString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#110e09;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#0a0906;border:1px solid #2c2619;border-top:2px solid #c9943c;border-radius:8px;padding:28px;">
      <div style="font-size:11px;letter-spacing:0.2em;color:#7a5815;text-transform:uppercase;margin-bottom:16px;">KlasWerk · Live Session</div>
      <div style="font-size:22px;color:#c9943c;margin-bottom:4px;">◉</div>
      <h1 style="font-size:18px;color:#e8c87a;margin:8px 0 4px;font-family:'Times New Roman',serif;">${opts.sessionTitle}</h1>
      <p style="font-size:12px;color:#7a6d58;margin:0 0 20px;">${opts.courseTitle}</p>
      <p style="font-size:14px;color:#d0c4a8;margin:0 0 6px;">Dear ${opts.studentName},</p>
      <p style="font-size:14px;color:#7a6d58;line-height:1.7;margin:0 0 20px;">
        Your live session starts in approximately <strong style="color:#c9943c;">30 minutes</strong>.
      </p>
      <div style="background:#12100b;border:1px solid #2c2619;border-radius:4px;padding:12px 16px;margin:0 0 20px;">
        <div style="font-size:11px;color:#7a5815;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px;">Session Time</div>
        <div style="font-size:14px;color:#c9943c;">${time}</div>
      </div>
      <div style="text-align:center;">
        <a href="${opts.sessionUrl}"
           style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7a5815,#c9943c);color:#0a0906;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;border-radius:4px;">
          Join Live Session →
        </a>
      </div>
    </div>
    <p style="text-align:center;font-size:10px;letter-spacing:0.15em;color:#3a3020;margin-top:16px;">✦  MD WORKS · KLASWERK  ✦</p>
  </div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SVC_KEY)

    // Find sessions starting in 25–35 minutes (reminder window)
    const windowStart = new Date(Date.now() + 25 * 60 * 1000).toISOString()
    const windowEnd   = new Date(Date.now() + 35 * 60 * 1000).toISOString()

    const { data: sessions } = await sb
      .from('sessions')
      .select('id, title, course_id, scheduled_for, course:course_id(title)')
      .eq('status', 'scheduled')
      .gte('scheduled_for', windowStart)
      .lte('scheduled_for', windowEnd)

    if (!sessions?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No sessions in window' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    for (const session of sessions as any[]) {
      // Get enrolled students for this course
      const { data: enrollments } = await sb
        .from('enrollments')
        .select('student:student_id(full_name, email)')
        .eq('course_id', session.course_id)
        .eq('status', 'active')

      for (const enrol of (enrollments ?? []) as any[]) {
        const email = enrol.student?.email
        if (!email) continue
        const html = reminderHtml({
          studentName:  enrol.student?.full_name ?? 'Student',
          sessionTitle: session.title,
          courseTitle:  session.course?.title ?? '',
          scheduledFor: session.scheduled_for,
          sessionUrl:   `${APP_URL}/live/${session.id}`,
        })
        const ok = await sendEmail(email, `◉ Starting soon: ${session.title}`, html)
        if (ok) sent++
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
