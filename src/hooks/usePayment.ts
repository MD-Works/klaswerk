// ═══════════════════════════════════════════════════
// KlasWerk — usePayment Hook
// ───────────────────────────────────────────────────
// PayFast integration — South Africa.
// initiatePayment  — creates payment record + redirect form
// verifyPayment    — called on /payment/return
// fetchPayments    — student's own or trainer's course payments
// Session 7
// ═══════════════════════════════════════════════════

import { useState, useCallback } from 'react'
import { db } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { payfastConfig, appConfig } from '@/config'
import type { Payment, Course } from '@/types'

// ── MD5 — pure browser implementation (no npm dep needed) ────────────────────
// Based on https://www.myersdaily.org/joseph/javascript/md5-text.html (public domain)
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

// ── PayFast form data shape ───────────────────────────────────────────────────

export interface PayFastParams {
  merchant_id:   string
  merchant_key:  string
  return_url:    string
  cancel_url:    string
  notify_url:    string
  name_first:    string
  name_last:     string
  email_address: string
  m_payment_id:  string
  amount:        string
  item_name:     string
  item_description?: string
  custom_str1:   string   // course_id
  custom_str2:   string   // student_id
  passphrase?:   string
  signature?:    string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build the PayFast signature string */
function buildSignatureString(params: Omit<PayFastParams, 'signature'>, passphrase: string): string {
  const ordered: Record<string, string> = {}
  const keys = Object.keys(params).sort() as (keyof typeof params)[]
  for (const k of keys) {
    if (k === 'passphrase') continue
    if (params[k] !== undefined && params[k] !== '') {
      ordered[k] = params[k]!
    }
  }

  let str = Object.entries(ordered)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v)).replace(/%20/g, '+')}`)
    .join('&')

  if (passphrase) str += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
  return str
}

/** Sandbox vs production PayFast URL */
function getPayFastUrl(testMode: boolean): string {
  return testMode
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process'
}

// ═══════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════
export function usePayment() {
  const { user, profile } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // ── Initiate payment — creates DB record + submits form to PayFast ───────
  const initiatePayment = useCallback(async (course: Course): Promise<boolean> => {
    if (!user || !profile) { setError('Not authenticated'); return false }
    setIsLoading(true)
    setError(null)

    // 1. Create a pending payment record in DB
    const { data: payment, error: payErr } = await db
      .from('payments')
      .insert({
        student_id: user.id,
        course_id:  course.id,
        amount:     course.price,
        currency:   course.currency ?? appConfig.currency ?? 'ZAR',
        status:     'pending',
      })
      .select()
      .single()

    if (payErr || !payment) {
      setError(payErr?.message ?? 'Payment init failed')
      setIsLoading(false)
      return false
    }

    // 2. Build PayFast params
    const [firstName, ...rest] = (profile.full_name ?? profile.email ?? 'Student').split(' ')
    const lastName = rest.join(' ') || '-'

    const params: PayFastParams = {
      merchant_id:   payfastConfig.merchantId,
      merchant_key:  payfastConfig.merchantKey,
      return_url:    `${payfastConfig.returnUrl}?payment_id=${payment.id}`,
      cancel_url:    `${payfastConfig.cancelUrl}?payment_id=${payment.id}`,
      notify_url:    payfastConfig.notifyUrl,
      name_first:    firstName,
      name_last:     lastName,
      email_address: profile.email,
      m_payment_id:  payment.id,
      amount:        course.price.toFixed(2),
      item_name:     course.title.slice(0, 100),
      item_description: course.description?.slice(0, 255) ?? undefined,
      custom_str1:   course.id,
      custom_str2:   user.id,
    }

    // 3. Sign
    const sigString = buildSignatureString(params, payfastConfig.passphrase)
    params.signature = md5(sigString)

    // 4. Submit form programmatically
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = getPayFastUrl(payfastConfig.testMode)

    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue
      const input = document.createElement('input')
      input.type  = 'hidden'
      input.name  = k
      input.value = String(v)
      form.appendChild(input)
    }

    document.body.appendChild(form)
    form.submit()

    setIsLoading(false)
    return true
  }, [user, profile])

  // ── Verify payment on return from PayFast ────────────────────────────────
  // Called on /payment/return — updates status and auto-enrolls if paid
  const verifyPayment = useCallback(async (paymentId: string): Promise<{
    status: 'complete' | 'pending' | 'failed' | 'not_found'
    courseId?: string
  }> => {
    if (!user) return { status: 'not_found' }
    setIsLoading(true)

    const { data: payment } = await db
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('student_id', user.id)
      .maybeSingle()

    setIsLoading(false)

    if (!payment) return { status: 'not_found' }

    // PayFast ITN (Instant Transaction Notification) updates the status via
    // the webhook worker. Here we just return the current DB status.
    if (payment.status === 'complete') {
      // Ensure enrollment exists
      await db.from('enrollments').upsert({
        student_id:         user.id,
        course_id:          payment.course_id,
        status:             'enrolled',
        progress:           0,
        lessons_completed:  0,
        payment_status:     'paid',
        payment_id:         payment.id,
        started_at:         new Date().toISOString(),
        last_accessed:      new Date().toISOString(),
      }, { onConflict: 'student_id,course_id' })
      return { status: 'complete', courseId: payment.course_id }
    }

    return { status: payment.status as 'pending' | 'failed', courseId: payment.course_id }
  }, [user])

  // ── Fetch student's payments ─────────────────────────────────────────────
  const fetchMyPayments = useCallback(async (): Promise<(Payment & { course: { title: string } | null })[]> => {
    if (!user) return []
    const { data, error: err } = await db
      .from('payments')
      .select('*, course:course_id(title)')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); return [] }
    return data ?? []
  }, [user])

  // ── Fetch payments for trainer's courses ─────────────────────────────────
  const fetchCoursePayments = useCallback(async (courseId: string): Promise<(Payment & { student: { full_name: string | null; email: string } | null })[]> => {
    if (!user) return []
    const { data, error: err } = await db
      .from('payments')
      .select('*, student:student_id(full_name, email)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); return [] }
    return data ?? []
  }, [user])

  return {
    isLoading,
    error,
    initiatePayment,
    verifyPayment,
    fetchMyPayments,
    fetchCoursePayments,
  }
}
