// ═══════════════════════════════════════════════════
// KlasWerk — PDF Certificate Generator
// ───────────────────────────────────────────────────
// Browser-side PDF using jsPDF (no server needed).
// Generates a styled A4 landscape certificate and
// triggers a download. Optionally returns a data URL
// for upload to Supabase Storage / R2.
//
// Usage:
//   import { generateCertPdf } from '@/lib/generateCertPdf'
//   await generateCertPdf({ studentName, courseTitle, certNumber, issuedAt })
//
// Session 8
// ═══════════════════════════════════════════════════

export interface CertPdfOptions {
  studentName:  string
  courseTitle:  string
  certNumber:   string
  issuedAt:     string   // ISO date string
  trainerName?: string
  logoUrl?:     string   // optional — skipped if absent
  download?:    boolean  // default true — trigger file download
}

export interface CertPdfResult {
  dataUrl:  string   // base64 data URL — can be uploaded to storage
  blob:     Blob     // raw Blob
  filename: string
}

// ── Dynamic import of jsPDF to avoid SSR issues ──────────────────────────────
async function getJsPDF() {
  const { jsPDF } = await import('jspdf')
  return jsPDF
}

// ── Colour palette (matches MD Works / KlasWerk brand) ───────────────────────
const C = {
  black:    [10,  9,   6]  as [number,number,number],
  dark:     [17,  14,  9]  as [number,number,number],
  surface:  [26,  22,  16] as [number,number,number],
  border:   [44,  38,  25] as [number,number,number],
  gold:     [201, 148, 60] as [number,number,number],
  goldDk:   [122, 88,  21] as [number,number,number],
  goldLt:   [232, 200, 122] as [number,number,number],
  cream:    [240, 230, 206] as [number,number,number],
  muted:    [122, 109, 88] as [number,number,number],
}

// ── Draw corner ornament ──────────────────────────────────────────────────────
function drawCorner(doc: any, x: number, y: number, flipX: boolean, flipY: boolean) {
  const sx = flipX ? -1 : 1
  const sy = flipY ? -1 : 1

  doc.setDrawColor(...C.goldDk)
  doc.setLineWidth(0.3)

  // Outer L
  doc.line(x, y + sy*5, x, y + sy*22)
  doc.line(x, y, x + sx*22, y)

  // Inner accent
  doc.setDrawColor(...C.gold)
  doc.setLineWidth(0.15)
  doc.line(x + sx*4, y + sy*4, x + sx*4, y + sy*18)
  doc.line(x + sx*4, y + sy*4, x + sx*18, y + sy*4)

  // Gold dot at corner
  doc.setFillColor(...C.gold)
  doc.circle(x + sx*1.5, y + sy*1.5, 0.8, 'F')
}

// ── Draw horizontal gold rule ─────────────────────────────────────────────────
function drawRule(doc: any, y: number, pageW: number, opacity = 1) {
  const margin = 30
  // Left segment
  doc.setDrawColor(...C.goldDk)
  doc.setLineWidth(0.2)
  doc.line(margin, y, pageW/2 - 8, y)
  // Centre ornament
  doc.setFontSize(7)
  doc.setTextColor(...C.gold)
  doc.text('✦', pageW/2, y + 0.8, { align: 'center' })
  // Right segment
  doc.line(pageW/2 + 8, y, pageW - margin, y)
}

// ── Main generator ────────────────────────────────────────────────────────────
export async function generateCertPdf(opts: CertPdfOptions): Promise<CertPdfResult> {
  const {
    studentName,
    courseTitle,
    certNumber,
    issuedAt,
    trainerName,
    download = true,
  } = opts

  const JsPDF = await getJsPDF()

  // A4 landscape, mm units
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = 297
  const pageH = 210

  // ── Background ─────────────────────────────────────────────────────────
  doc.setFillColor(...C.dark)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Subtle vignette — darker edges
  // jsPDF doesn't support radial gradients, so we approximate with layered rects
  doc.setFillColor(...C.black)
  for (let i = 0; i < 8; i++) {
    const alpha = (8 - i) * 0.012
    doc.setGState(doc.GState({ opacity: alpha }))
    doc.rect(i * 3, i * 2, pageW - i*6, pageH - i*4, 'F')
  }
  doc.setGState(doc.GState({ opacity: 1 }))

  // ── Outer border frame ─────────────────────────────────────────────────
  doc.setDrawColor(...C.goldDk)
  doc.setLineWidth(0.5)
  doc.rect(12, 8, pageW - 24, pageH - 16)

  doc.setDrawColor(...C.gold)
  doc.setLineWidth(0.15)
  doc.rect(14, 10, pageW - 28, pageH - 20)

  // ── Corner ornaments ───────────────────────────────────────────────────
  drawCorner(doc, 14, 10, false, false)            // top-left
  drawCorner(doc, pageW - 14, 10, true, false)     // top-right
  drawCorner(doc, 14, pageH - 10, false, true)     // bottom-left
  drawCorner(doc, pageW - 14, pageH - 10, true, true) // bottom-right

  // ── Eyebrow label ──────────────────────────────────────────────────────
  doc.setFontSize(6.5)
  doc.setTextColor(...C.goldDk)
  doc.setFont('helvetica', 'normal')
  const eyebrow = 'K  L  A  S  W  E  R  K   ·   C E R T I F I C A T E   O F   C O M P L E T I O N'
  doc.text(eyebrow, pageW / 2, 24, { align: 'center' })

  // Rule below eyebrow
  drawRule(doc, 29, pageW)

  // ── "This certifies that" ───────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  doc.setFont('times', 'italic')
  doc.text('This is to certify that', pageW / 2, 46, { align: 'center' })

  // ── Student name ────────────────────────────────────────────────────────
  doc.setFontSize(32)
  doc.setTextColor(...C.goldLt)
  doc.setFont('times', 'bolditalic')
  doc.text(studentName, pageW / 2, 68, { align: 'center' })

  // Underline the name in gold
  const nameWidth = doc.getTextWidth(studentName)
  const nameX     = pageW/2 - nameWidth/2
  doc.setDrawColor(...C.goldDk)
  doc.setLineWidth(0.3)
  doc.line(nameX, 70, nameX + nameWidth, 70)

  // ── "has successfully completed" ──────────────────────────────────────
  doc.setFontSize(9)
  doc.setTextColor(...C.muted)
  doc.setFont('times', 'italic')
  doc.text('has successfully completed', pageW / 2, 82, { align: 'center' })

  // ── Course title ────────────────────────────────────────────────────────
  // Wrap long titles
  doc.setFontSize(18)
  doc.setTextColor(...C.cream)
  doc.setFont('helvetica', 'bold')
  const maxTitleW = 200
  const titleLines = doc.splitTextToSize(courseTitle, maxTitleW)
  const titleY = titleLines.length > 1 ? 97 : 102
  doc.text(titleLines, pageW / 2, titleY, { align: 'center' })

  // ── Rule below course title ─────────────────────────────────────────────
  const ruleY = titleLines.length > 1 ? 115 : 112
  drawRule(doc, ruleY, pageW)

  // ── Date + trainer ──────────────────────────────────────────────────────
  const issueDate = new Date(issuedAt).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const signatureY = ruleY + 24

  // Date block (left)
  doc.setFontSize(7)
  doc.setTextColor(...C.muted)
  doc.setFont('helvetica', 'normal')
  doc.text('DATE OF ISSUE', pageW/2 - 50, signatureY - 4, { align: 'center' })
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.2)
  doc.line(pageW/2 - 80, signatureY, pageW/2 - 20, signatureY)
  doc.setFontSize(9)
  doc.setTextColor(...C.cream)
  doc.text(issueDate, pageW/2 - 50, signatureY + 5, { align: 'center' })

  // Trainer block (right) — only if provided
  if (trainerName) {
    doc.setFontSize(7)
    doc.setTextColor(...C.muted)
    doc.setFont('helvetica', 'normal')
    doc.text('AUTHORISED BY', pageW/2 + 50, signatureY - 4, { align: 'center' })
    doc.line(pageW/2 + 20, signatureY, pageW/2 + 80, signatureY)
    doc.setFontSize(9)
    doc.setTextColor(...C.cream)
    doc.text(trainerName, pageW/2 + 50, signatureY + 5, { align: 'center' })
  }

  // ── Certificate number ──────────────────────────────────────────────────
  doc.setFontSize(6.5)
  doc.setTextColor(...C.goldDk)
  doc.setFont('courier', 'normal')
  doc.text(`Certificate No: ${certNumber}`, pageW/2, pageH - 18, { align: 'center' })

  // ── Verify URL ──────────────────────────────────────────────────────────
  doc.setFontSize(6)
  doc.setTextColor(...C.muted)
  doc.text(`Verify at: ${window.location.origin}/verify/${certNumber}`, pageW/2, pageH - 14, { align: 'center' })

  // ── MD Works footer mark ────────────────────────────────────────────────
  doc.setFontSize(5.5)
  doc.setTextColor(...C.goldDk)
  doc.text('✦  MD Works  ✦', pageW/2, pageH - 9, { align: 'center' })

  // ── Gold seal circle (decorative) ──────────────────────────────────────
  const sealX = pageW - 42
  const sealY = pageH/2 + 10
  doc.setFillColor(...C.surface)
  doc.setDrawColor(...C.gold)
  doc.setLineWidth(0.4)
  doc.circle(sealX, sealY, 18, 'FD')
  doc.setDrawColor(...C.goldDk)
  doc.setLineWidth(0.2)
  doc.circle(sealX, sealY, 15.5, 'D')
  doc.setFontSize(18)
  doc.setTextColor(...C.gold)
  doc.text('✦', sealX, sealY + 1, { align: 'center' })
  doc.setFontSize(5.5)
  doc.setTextColor(...C.goldDk)
  doc.text('CERTIFIED', sealX, sealY + 8, { align: 'center' })

  // ── Export ──────────────────────────────────────────────────────────────
  const safeName  = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const safeCourse = courseTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30)
  const filename  = `klaswerk_cert_${safeCourse}_${safeName}.pdf`

  if (download) {
    doc.save(filename)
  }

  const dataUrl = doc.output('datauristring')
  const blob    = doc.output('blob')

  return { dataUrl, blob, filename }
}
