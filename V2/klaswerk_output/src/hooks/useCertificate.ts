// ═══════════════════════════════════════════════════
// KlasWerk — useCertificate Hook
// ───────────────────────────────────────────────────
// Session 9: uploadCertificatePdf() — generates PDF,
//   uploads to Supabase Storage (certificates bucket),
//   updates certificates.pdf_url, returns public URL.
// All other methods unchanged from Session 7.
// ═══════════════════════════════════════════════════

import { useState, useCallback } from 'react'
import { db, supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { generateCertPdf } from '@/lib/generateCertPdf'
import type { Certificate } from '@/types'

// ── Extended types ────────────────────────────────────────────────────────────

export interface CertificateWithCourse extends Certificate {
  course: { id: string; title: string; category: string | null } | null
  student: { id: string; full_name: string | null; email: string } | null
}

// ── Generate certificate number ───────────────────────────────────────────────

function generateCertNumber(courseId: string, studentId: string): string {
  const prefix   = 'KW'
  const stamp    = Date.now().toString(36).toUpperCase()
  const fragment = (courseId + studentId).replace(/-/g, '').slice(0, 6).toUpperCase()
  return `${prefix}-${fragment}-${stamp}`
}

// ═══════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════
export function useCertificate() {
  const { user } = useAuthStore()
  const [isLoading,    setIsLoading]    = useState(false)
  const [isUploading,  setIsUploading]  = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // ── Generate certificate for an enrollment ───────────────────────────────
  const generateCertificate = useCallback(async (
    enrollmentId: string,
  ): Promise<CertificateWithCourse | null> => {
    if (!user) return null
    setIsLoading(true)
    setError(null)

    const { data: enrollment, error: enrErr } = await db
      .from('enrollments')
      .select('*, course:course_id(id, title, category)')
      .eq('id', enrollmentId)
      .eq('student_id', user.id)
      .single()

    if (enrErr || !enrollment) {
      setError('Enrollment not found')
      setIsLoading(false)
      return null
    }

    if (enrollment.status !== 'completed' && enrollment.progress < 100) {
      setError('Course not yet completed')
      setIsLoading(false)
      return null
    }

    const { data: existing } = await db
      .from('certificates')
      .select('*, course:course_id(id, title, category), student:student_id(id, full_name, email)')
      .eq('student_id', user.id)
      .eq('course_id', enrollment.course_id)
      .maybeSingle()

    if (existing) {
      setIsLoading(false)
      return existing as CertificateWithCourse
    }

    const { data: profile } = await db
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const { data: attempts } = await db
      .from('quiz_attempts')
      .select('percentage, quiz_id')
      .eq('student_id', user.id)
      .order('percentage', { ascending: false })

    const avgScore = attempts && attempts.length > 0
      ? Math.round(attempts.reduce((sum: number, a: { percentage: number }) => sum + a.percentage, 0) / attempts.length)
      : 100

    const certNumber = generateCertNumber(enrollment.course_id, user.id)
    const now = new Date().toISOString()

    const { data: cert, error: certErr } = await db
      .from('certificates')
      .insert({
        student_id:         user.id,
        course_id:          enrollment.course_id,
        certificate_number: certNumber,
        issued_at:          now,
        certificate_data: {
          student_name: profile?.full_name ?? profile?.email ?? 'Student',
          course_title: enrollment.course?.title ?? 'Course',
          score:        avgScore,
          date:         now,
        },
        is_verified:      true,
        verification_url: null,
        pdf_url:          null,
        expires_at:       null,
      })
      .select('*, course:course_id(id, title, category), student:student_id(id, full_name, email)')
      .single()

    setIsLoading(false)
    if (certErr) { setError(certErr.message); return null }
    return cert as CertificateWithCourse
  }, [user])

  // ── NEW Session 9: Upload PDF to Supabase Storage ────────────────────────
  // Generates the PDF, uploads to storage/certificates/{userId}/{certNumber}.pdf,
  // updates certificates.pdf_url, and returns the public URL.
  const uploadCertificatePdf = useCallback(async (
    cert: CertificateWithCourse,
    trainerName?: string,
  ): Promise<string | null> => {
    if (!user) return null
    setIsUploading(true)
    setError(null)

    try {
      // 1. Generate PDF (no download trigger)
      const { blob, filename } = await generateCertPdf({
        studentName: cert.certificate_data?.student_name ?? cert.student?.full_name ?? 'Student',
        courseTitle: cert.certificate_data?.course_title ?? cert.course?.title ?? 'Course',
        certNumber:  cert.certificate_number,
        issuedAt:    cert.issued_at,
        trainerName,
        download:    false,
      })

      // 2. Upload to Supabase Storage
      // Path: {userId}/{certNumber}.pdf  (userId as folder for policy scope)
      const storagePath = `${user.id}/${cert.certificate_number}.pdf`

      const { error: uploadErr } = await supabase.storage
        .from('certificates')
        .upload(storagePath, blob, {
          contentType: 'application/pdf',
          upsert: true,       // overwrite if re-generating
        })

      if (uploadErr) throw new Error(uploadErr.message)

      // 3. Get public URL
      const { data: urlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(storagePath)

      const publicUrl = urlData.publicUrl

      // 4. Persist pdf_url on the certificate row
      const { error: updateErr } = await db
        .from('certificates')
        .update({ pdf_url: publicUrl })
        .eq('id', cert.id)

      if (updateErr) throw new Error(updateErr.message)

      setIsUploading(false)
      return publicUrl
    } catch (err) {
      setError(String(err))
      setIsUploading(false)
      return null
    }
  }, [user])

  // ── Fetch certificates — student's own ──────────────────────────────────
  const fetchMyCertificates = useCallback(async (): Promise<CertificateWithCourse[]> => {
    if (!user) return []
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await db
      .from('certificates')
      .select('*, course:course_id(id, title, category), student:student_id(id, full_name, email)')
      .eq('student_id', user.id)
      .order('issued_at', { ascending: false })

    setIsLoading(false)
    if (err) { setError(err.message); return [] }
    return (data ?? []) as CertificateWithCourse[]
  }, [user])

  // ── Fetch certificates issued for trainer's courses ──────────────────────
  const fetchTrainerCertificates = useCallback(async (): Promise<CertificateWithCourse[]> => {
    if (!user) return []
    setIsLoading(true)
    setError(null)

    const { data: courses } = await db
      .from('courses')
      .select('id')
      .eq('trainer_id', user.id)

    if (!courses || courses.length === 0) { setIsLoading(false); return [] }

    const courseIds = courses.map((c: { id: string }) => c.id)

    const { data, error: err } = await db
      .from('certificates')
      .select('*, course:course_id(id, title, category), student:student_id(id, full_name, email)')
      .in('course_id', courseIds)
      .order('issued_at', { ascending: false })

    setIsLoading(false)
    if (err) { setError(err.message); return [] }
    return (data ?? []) as CertificateWithCourse[]
  }, [user])

  // ── Public verify — no auth required ────────────────────────────────────
  const verifyCertificate = useCallback(async (
    certNumber: string,
  ): Promise<CertificateWithCourse | null> => {
    setIsLoading(true)
    setError(null)

    const { data, error: err } = await db
      .from('certificates')
      .select('*, course:course_id(id, title, category), student:student_id(id, full_name, email)')
      .eq('certificate_number', certNumber)
      .eq('is_verified', true)
      .maybeSingle()

    setIsLoading(false)
    if (err) { setError(err.message); return null }
    return data as CertificateWithCourse | null
  }, [])

  // ── Check if student already has cert for a course ──────────────────────
  const hasCertificate = useCallback(async (courseId: string): Promise<boolean> => {
    if (!user) return false
    const { data } = await db
      .from('certificates')
      .select('id')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()
    return !!data
  }, [user])

  // ── Auto-issue: check enrollment completion + issue if eligible ──────────
  const autoIssueCertificate = useCallback(async (courseId: string): Promise<CertificateWithCourse | null> => {
    if (!user) return null

    const { data: enrollment } = await db
      .from('enrollments')
      .select('id, status, progress')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle()

    if (!enrollment) return null
    if (enrollment.status !== 'completed' && enrollment.progress < 100) return null

    return generateCertificate(enrollment.id)
  }, [user, generateCertificate])

  return {
    isLoading,
    isUploading,
    error,
    generateCertificate,
    uploadCertificatePdf,
    fetchMyCertificates,
    fetchTrainerCertificates,
    verifyCertificate,
    hasCertificate,
    autoIssueCertificate,
  }
}
