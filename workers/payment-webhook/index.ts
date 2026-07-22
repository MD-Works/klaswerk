// ═══════════════════════════════════════════════════
// KlasWerk — PayFast ITN Webhook Worker
// ───────────────────────────────────────────────────
// Route: POST /payfast-webhook   (Cloudflare Worker)
//
// Flow:
//   1. Receive PayFast ITN POST
//   2. KV dedup — reject replayed pf_payment_id (S10)
//   3. Validate signature (MD5)
//   4. Verify payment with PayFast API (production)
//   5. Update payments.status in Supabase
//   6. Return 200 OK (PayFast requires this to stop retrying)
//
// Session 10: KV-based pf_payment_id dedup to prevent
//   replay attacks. Requires a KV namespace bound as SEEN_PAYMENTS.
//   Add to wrangler.toml:
//     [[kv_namespaces]]
//     binding = "SEEN_PAYMENTS"
//     id      = "<your-kv-namespace-id>"
// ═══════════════════════════════════════════════════

export interface Env {
  SUPABASE_URL:         string
  SUPABASE_SERVICE_KEY: string
  PAYFAST_PASSPHRASE:   string
  PAYFAST_MERCHANT_ID:  string
  TEST_MODE:            string
  // KV namespace for replay protection — Session 10
  SEEN_PAYMENTS:        KVNamespace
}

// ── MD5 — zero-dependency implementation ─────────────────────────────────────
function md5(input: string): string {
  function safeAdd(x: number, y: number) { const lsw = (x & 0xffff) + (y & 0xffff); const msw = (x >> 16) + (y >> 16) + (lsw >> 16); return (msw << 16) | (lsw & 0xffff) }
  function bitRotateLeft(num: number, cnt: number) { return (num << cnt) | (num >>> (32 - cnt)) }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b) }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & c) | (~b & d), a, b, x, s, t) }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t) }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(b ^ c ^ d, a, b, x, s, t) }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(c ^ (b | ~d), a, b, x, s, t) }
  function md5cycle(x: number[], k: number[]) {
    let [a, b, c, d] = x
    a = md5ff(a,b,c,d,k[0],7,-680876936); d = md5ff(d,a,b,c,k[1],12,-389564586); c = md5ff(c,d,a,b,k[2],17,606105819); b = md5ff(b,c,d,a,k[3],22,-1044525330)
    a = md5ff(a,b,c,d,k[4],7,-176418897); d = md5ff(d,a,b,c,k[5],12,1200080426); c = md5ff(c,d,a,b,k[6],17,-1473231341); b = md5ff(b,c,d,a,k[7],22,-45705983)
    a = md5ff(a,b,c,d,k[8],7,1770035416); d = md5ff(d,a,b,c,k[9],12,-1958414417); c = md5ff(c,d,a,b,k[10],17,-42063); b = md5ff(b,c,d,a,k[11],22,-1990404162)
    a = md5ff(a,b,c,d,k[12],7,1804603682); d = md5ff(d,a,b,c,k[13],12,-40341101); c = md5ff(c,d,a,b,k[14],17,-1502002290); b = md5ff(b,c,d,a,k[15],22,1236535329)
    a = md5gg(a,b,c,d,k[1],5,-165796510); d = md5gg(d,a,b,c,k[6],9,-1069501632); c = md5gg(c,d,a,b,k[11],14,643717713); b = md5gg(b,c,d,a,k[0],20,-373897302)
    a = md5gg(a,b,c,d,k[5],5,-701558691); d = md5gg(d,a,b,c,k[10],9,38016083); c = md5gg(c,d,a,b,k[15],14,-660478335); b = md5gg(b,c,d,a,k[4],20,-405537848)
    a = md5gg(a,b,c,d,k[9],5,568446438); d = md5gg(d,a,b,c,k[14],9,-1019803690); c = md5gg(c,d,a,b,k[3],14,-187363961); b = md5gg(b,c,d,a,k[8],20,1163531501)
    a = md5gg(a,b,c,d,k[13],5,-1444681467); d = md5gg(d,a,b,c,k[2],9,-51403784); c = md5gg(c,d,a,b,k[7],14,1735328473); b = md5gg(b,c,d,a,k[12],20,-1926607734)
    a = md5hh(a,b,c,d,k[5],4,-378558); d = md5hh(d,a,b,c,k[8],11,-2022574463); c = md5hh(c,d,a,b,k[11],16,1839030562); b = md5hh(b,c,d,a,k[14],23,-35309556)
    a = md5hh(a,b,c,d,k[1],4,-1530992060); d = md5hh(d,a,b,c,k[4],11,1272893353); c = md5hh(c,d,a,b,k[7],16,-155497632); b = md5hh(b,c,d,a,k[10],23,-1094730640)
    a = md5hh(a,b,c,d,k[13],4,681279174); d = md5hh(d,a,b,c,k[0],11,-358537222); c = md5hh(c,d,a,b,k[3],16,-722521979); b = md5hh(b,c,d,a,k[6],23,76029189)
    a = md5hh(a,b,c,d,k[9],4,-640364487); d = md5hh(d,a,b,c,k[12],11,-421815835); c = md5hh(c,d,a,b,k[15],16,530742520); b = md5hh(b,c,d,a,k[2],23,-995338651)
    a = md5ii(a,b,c,d,k[0],6,-198630844); d = md5ii(d,a,b,c,k[7],10,1126891415); c = md5ii(c,d,a,b,k[14],15,-1416354905); b = md5ii(b,c,d,a,k[5],21,-57434055)
    a = md5ii(a,b,c,d,k[12],6,1700485571); d = md5ii(d,a,b,c,k[3],10,-1894986606); c = md5ii(c,d,a,b,k[10],15,-1051523); b = md5ii(b,c,d,a,k[1],21,-2054922799)
    a = md5ii(a,b,c,d,k[8],6,1873313359); d = md5ii(d,a,b,c,k[15],10,-30611744); c = md5ii(c,d,a,b,k[6],15,-1560198380); b = md5ii(b,c,d,a,k[13],21,1309151649)
    a = md5ii(a,b,c,d,k[4],6,-145523070); d = md5ii(d,a,b,c,k[11],10,-1120210379); c = md5ii(c,d,a,b,k[2],15,718787259); b = md5ii(b,c,d,a,k[9],21,-343485551)
    x[0] = safeAdd(a,x[0]); x[1] = safeAdd(b,x[1]); x[2] = safeAdd(c,x[2]); x[3] = safeAdd(d,x[3])
  }
  function md5blks(s: string) {
    const md5blks: number[] = []; let i
    for (i = 0; i < 64; i += 4) md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i+1) << 8) + (s.charCodeAt(i+2) << 16) + (s.charCodeAt(i+3) << 24)
    return md5blks
  }
  function rhex(n: number) { let s = '', j = 0; for (; j < 4; j++) s += ('0' + ((n >>> (j*8+4)) & 0x0f).toString(16)).slice(-1) + ('0' + ((n >>> (j*8)) & 0x0f).toString(16)).slice(-1); return s }
  function hex(x: number[]) { return x.map(rhex).join('') }
  function str2rstrUTF8(input: string) { return unescape(encodeURIComponent(input)) }
  function rstr_md5(s: string) {
    const n = s.length; const state = [1732584193, -271733879, -1732584194, 271733878]
    let i; for (i = 64; i <= n; i += 64) md5cycle(state, md5blks(s.slice(i-64, i)))
    s = s.slice(i-64); const tail = new Array(16).fill(0); for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3)
    tail[i >> 2] |= 0x80 << ((i % 4) << 3)
    if (i > 55) { md5cycle(state, tail); tail.fill(0) }
    tail[14] = n * 8; md5cycle(state, tail); return state
  }
  return hex(rstr_md5(str2rstrUTF8(input)))
}

// ── Signature validation ──────────────────────────────────────────────────────

function validateSignature(params: Record<string, string>, passphrase: string): boolean {
  const received = params['signature'] ?? ''
  const ordered: Record<string, string> = {}
  const keys = Object.keys(params).filter(k => k !== 'signature').sort()
  for (const k of keys) {
    if (params[k] !== '') ordered[k] = params[k]
  }
  const qs = Object.entries(ordered).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  const toHash = passphrase ? `${qs}&passphrase=${encodeURIComponent(passphrase)}` : qs
  const expected = md5(toHash)
  return received === expected
}

// ── PayFast server-side verification ─────────────────────────────────────────

async function verifyWithPayFast(params: Record<string, string>, testMode: boolean): Promise<boolean> {
  const url = testMode
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate'
  const body = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const text = await res.text()
    return text.trim() === 'VALID'
  } catch {
    return false
  }
}

// ── Supabase update ───────────────────────────────────────────────────────────

async function updatePaymentStatus(
  supabaseUrl: string,
  serviceKey: string,
  paymentId: string,
  status: string,
  pfPaymentId: string,
  raw: Record<string, string>,
): Promise<void> {
  const url = `${supabaseUrl}/rest/v1/payments?id=eq.${paymentId}`
  await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      status,
      pf_payment_id:  pfPaymentId,
      paid_at:        status === 'complete' ? new Date().toISOString() : null,
      raw_itn:        raw,
    }),
  })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

// ── KV dedup helper ───────────────────────────────────────────────────────────
// Stores pf_payment_id in KV with a 30-day TTL.
// Returns true if this is a NEW payment (should be processed).
// Returns false if we've seen it before (replay — skip silently).

async function isNewPayment(kv: KVNamespace, pfPaymentId: string): Promise<boolean> {
  if (!pfPaymentId) return true   // no ID to check — allow through

  const kvKey    = `pf:${pfPaymentId}`
  const existing = await kv.get(kvKey)

  if (existing !== null) {
    // Already processed — this is a replay
    console.warn(`[KW PayFast Worker] Replay detected — pf_payment_id=${pfPaymentId} already seen`)
    return false
  }

  // Mark as seen — expire after 30 days (PayFast retries won't go beyond a few hours)
  await kv.put(kvKey, new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 30 })
  return true
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }

    const testMode = env.TEST_MODE === 'true'

    // 1. Parse form body
    const text = await request.text()
    const params: Record<string, string> = {}
    for (const pair of text.split('&')) {
      const [k, ...rest] = pair.split('=')
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(rest.join('=').replace(/\+/g, ' '))
    }

    const pfPaymentId = params['pf_payment_id'] ?? ''
    const mPaymentId  = params['m_payment_id']  ?? ''

    if (!mPaymentId) {
      return new Response('Missing m_payment_id', { status: 200 })
    }

    // 2. KV replay check — Session 10
    //    Must return 200 to stop PayFast retrying even on a replay
    const fresh = await isNewPayment(env.SEEN_PAYMENTS, pfPaymentId)
    if (!fresh) {
      console.log(`[KW PayFast Worker] Skipping replay for m_payment_id=${mPaymentId}`)
      return new Response('OK', { status: 200 })
    }

    // 3. Validate signature
    const sigValid = validateSignature(params, env.PAYFAST_PASSPHRASE)
    if (!sigValid) {
      console.error('[KW PayFast Worker] Invalid signature', { params })
      return new Response('Signature invalid', { status: 200 })
    }

    // 4. Check payment_status from ITN
    const pfStatus = params['payment_status'] ?? ''

    // 5. Verify with PayFast (production only)
    if (!testMode) {
      const valid = await verifyWithPayFast(params, testMode)
      if (!valid) {
        console.error('[KW PayFast Worker] PayFast validation failed')
        return new Response('Validation failed', { status: 200 })
      }
    }

    // 6. Map PayFast status → our status
    const ourStatus = pfStatus === 'COMPLETE' ? 'complete' : 'failed'

    // 7. Update database
    await updatePaymentStatus(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY,
      mPaymentId,
      ourStatus,
      pfPaymentId,
      params,
    )

    console.log(`[KW PayFast Worker] Payment ${mPaymentId} → ${ourStatus} (pf_id: ${pfPaymentId})`)

    // 8. Return 200 — PayFast MUST receive this or it retries
    return new Response('OK', { status: 200 })
  },
}
