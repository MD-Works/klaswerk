// ═══════════════════════════════════════════════════
// KlasWerk — Edge Function: send-payment-receipt
// ───────────────────────────────────────────────────
// Triggered by DB webhook on payments UPDATE
// where status transitions to 'complete'.
//
// Also callable manually:
//   POST /functions/v1/send-payment-receipt
//   { "paymentId": "uuid" }
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

function receiptHtml(opts: {
  studentName:   string
  courseTitle:   string
  amount:        number
  currency:      string
  transactionId: string
  purchasedAt:   string
  courseUrl:     string
}): string {
  const date = new Date(opts.purchasedAt).toLocaleDateString('en-ZA', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const amountStr = new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: opts.currency || 'ZAR',
  }).format(opts.amount)

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#110e09;font-family:'Georgia',serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#0a0906;border:1px solid #2c2619;border-top:2px solid #c9943c;border-radius:8px;padding:28px;">
      <div style="font-size:11px;letter-spacing:0.2em;color:#7a5815;text-transform:uppercase;margin-bottom:12px;">KlasWerk · Payment Receipt</div>
      <h1 style="font-size:18px;color:#e8c87a;margin:0 0 4px;font-family:'Times New Roman',serif;">Payment Confirmed</h1>
      <p style="font-size:12px;color:#7a6d58;margin:0 0 24px;">Thank you for your purchase</p>

      <p style="font-size:14px;color:#d0c4a8;margin:0 0 20px;">Dear ${opts.studentName},</p>

      <!-- Receipt table -->
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2c2619;font-size:12px;color:#7a6d58;">Course</td>
          <td style="padding:10px 0;border-bottom:1px solid #2c2619;font-size:13px;color:#d0c4a8;text-align:right;">${opts.courseTitle}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2c2619;font-size:12px;color:#7a6d58;">Date</td>
          <td style="padding:10px 0;border-bottom:1px solid #2c2619;font-size:13px;color:#d0c4a8;text-align:right;">${date}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2c2619;font-size:12px;color:#7a6d58;">Transaction ID</td>
          <td style="padding:10px 0;border-bottom:1px solid #2c2619;font-family:'Courier New',monospace;font-size:11px;color:#7a6d58;text-align:right;">${opts.transactionId}</td>
        </tr>
        <tr>
          <td style="padding:12px 0;font-size:13px;font-weight:bold;color:#c9943c;">Amount Paid</td>
          <td style="padding:12px 0;font-size:16px;font-weight:bold;color:#c9943c;text-align:right;">${amountStr}</td>
        </tr>
      </table>

      <div style="text-align:center;">
        <a href="${opts.courseUrl}"
           style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7a5815,#c9943c);color:#0a0906;font-family:Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;border-radius:4px;">
          Start Learning →
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
    const body = await req.json().catch(() => ({}))

    // Support both DB webhook payload and manual call
    const paymentId: string = body?.record?.id ?? body?.paymentId
    const newStatus: string = body?.record?.status ?? 'complete'

    // Only send receipt on 'complete' status
    if (newStatus !== 'complete') {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not a complete status' }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'paymentId required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SVC_KEY)

    const { data: payment, error: payErr } = await sb
      .from('payments')
      .select(`
        amount, currency, transaction_id, created_at,
        student:student_id ( full_name, email ),
        course:course_id ( id, title )
      `)
      .eq('id', paymentId)
      .single()

    if (payErr || !payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const p   = payment as any
    const to  = p.student?.email
    if (!to) {
      return new Response(JSON.stringify({ error: 'Student email missing' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const html = receiptHtml({
      studentName:   p.student?.full_name ?? 'Student',
      courseTitle:   p.course?.title ?? 'Course',
      amount:        p.amount ?? 0,
      currency:      p.currency ?? 'ZAR',
      transactionId: p.transaction_id ?? paymentId,
      purchasedAt:   p.created_at,
      courseUrl:     `${APP_URL}/courses/${p.course?.id}`,
    })

    const ok = await sendEmail(to, `KlasWerk Receipt — ${p.course?.title ?? 'Course'}`, html)

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
