import PDFDocument from 'pdfkit'
import { ExportReport } from './reportExport.types'
import { toCents } from './reportExport.service'

const C = { ink: '#173B3A', teal: '#006B65', pale: '#EAF4F1', muted: '#687C80', line: '#DFE8E7', red: '#B44848', white: '#FFFFFF' }
const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function rupiah(value: string): string {
  const cents = toCents(value)
  const abs = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}Rp ${(abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${String(abs % 100n).padStart(2, '0')}`
}
function dateLabel(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return `${day} ${months[month - 1]} ${year}`
}
function lastDate(end: string) { return new Date(Date.parse(end + 'T00:00:00Z') - 86_400_000).toISOString().slice(0, 10) }
// Normalize control characters and hyphens without discarding transaction descriptions.
function clean(value: string) { return value.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').replace(/\r/g, '').replace(/[\u2010-\u2015]/g, '-') }

export function createReportPdf(report: ExportReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true, autoFirstPage: false,
      info: { Title: 'Laporan Keuangan - BukuKasKu', Author: report.name, Subject: 'Pemasukan dan pengeluaran', Creator: 'BukuKasKu' } })
    const buffers: Buffer[] = []
    doc.on('data', chunk => buffers.push(chunk))
    doc.on('error', reject)
    doc.on('end', () => resolve(Buffer.concat(buffers)))
    try {
      doc.registerFont('ReportRegular', require.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff'))
      doc.registerFont('ReportBold', require.resolve('@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff'))
      const left = 40, width = 515.28, bottom = 774
      let y = 0
      const mode = report.selection.mode === 'salary' ? 'Periode gajian' : 'Bulan kalender'
      const range = `${dateLabel(report.start)} - ${dateLabel(lastDate(report.end))}`

      function text(value: string, x: number, top: number, w: number, size = 9, color = C.ink, bold = false, align: 'left' | 'right' = 'left') {
        doc.font(bold ? 'ReportBold' : 'ReportRegular').fontSize(size).fillColor(color)
          .text(clean(value), x, top, { width: w, lineBreak: false, align })
      }
      function fit(value: string, x: number, top: number, w: number, size: number, color = C.ink, bold = true) {
        doc.font(bold ? 'ReportBold' : 'ReportRegular')
        while (size > 6 && doc.fontSize(size).widthOfString(clean(value)) > w) size -= 0.5
        text(value, x, top, w, size, color, bold)
      }
      function lines(value: string, w: number, size = 8): string[] {
        doc.font('ReportRegular').fontSize(size)
        const out: string[] = []
        for (const paragraph of clean(value).split('\n')) {
          let line = ''
          for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            if (doc.widthOfString(line ? `${line} ${word}` : word) <= w) { line = line ? `${line} ${word}` : word; continue }
            if (line) out.push(line)
            line = ''
            for (const char of word) {
              if (doc.widthOfString(line + char) > w && line) { out.push(line); line = '' }
              line += char
            }
          }
          out.push(line)
        }
        return out.length ? out : ['-']
      }
      function newPage(first = false) {
        doc.addPage()
        doc.rect(0, 0, doc.page.width, first ? 139 : 76).fill(C.ink)
        text('BukuKasKu', left, 28, 250, first ? 18 : 13, C.white, true)
        text('LAPORAN KEUANGAN', left + 285, 32, width - 285, 8, '#BBD5CF', true, 'right')
        if (first) {
          text('Pemasukan & Pengeluaran', left, 64, width, 24, C.white, true)
          text(range, left, 101, width, 10, '#C9DED9')
          y = 158
        } else { text(`${mode}  |  ${range}`, left, 53, width, 8, '#C9DED9'); y = 97 }
      }
      function section(title: string, detail?: string) {
        if (y + 55 > bottom) newPage()
        text(title, left, y, width, 13, C.ink, true)
        y += 21
        if (detail) { text(detail, left, y, width, 8, C.muted); y += 20 }
      }
      function tableHead() {
        doc.roundedRect(left, y, width, 26, 4).fill(C.ink)
        const labels = ['TANGGAL', 'KETERANGAN', 'KATEGORI', 'REKENING', 'NOMINAL (IDR)']
        const widths = [58, 176, 90, 83, 108.28]
        let x = left
        labels.forEach((label, i) => { text(label, x + 8, y + 9, widths[i] - 16, 6.5, C.white, true, i === 4 ? 'right' : 'left'); x += widths[i] })
        y += 26
      }
      newPage(true)
      const nameLines = lines(report.name, width, 12)
      nameLines.forEach((line, index) => text(line, left, y + index * 17, width, 12))
      y += (nameLines.length - 1) * 17
      text(`${mode} / ${months[report.selection.month - 1]} ${report.selection.year}`, left, y + 21, width, 9, C.muted)
      const note = report.selection.mode === 'salary'
        ? report.payday === null ? 'Tanggal gajian belum diatur; menggunakan tanggal 1.' : `Tanggal gajian: ${report.payday} setiap bulan. Tanggal yang tidak tersedia mengikuti akhir bulan.`
        : 'Rentang laporan mengikuti tanggal pertama sampai terakhir bulan kalender.'
      text(note, left, y + 38, width, 8, C.muted)
      y += 66

      const gap = 10, cardW = (width - gap * 2) / 3
      const cards = [
        { label: 'PEMASUKAN', amount: report.income, detail: `${report.incomeCount} transaksi masuk`, color: C.teal },
        { label: 'PENGELUARAN', amount: report.expense, detail: `${report.expenseCount} transaksi keluar`, color: C.red },
        { label: 'SELISIH', amount: report.net, detail: 'Pemasukan - pengeluaran', color: toCents(report.net) < 0n ? C.red : C.teal },
      ]
      cards.forEach((card, i) => {
        const x = left + i * (cardW + gap)
        doc.roundedRect(x, y, cardW, 87, 7).fill(i === 2 ? C.pale : '#F4F7F7')
        text(card.label, x + 12, y + 14, cardW - 24, 7.5, C.muted, true)
        fit(rupiah(card.amount), x + 12, y + 34, cardW - 24, 14, card.color)
        text(card.detail, x + 12, y + 64, cardW - 24, 7, C.muted)
      })
      y += 105
      text('Selisih adalah arus kas pada rentang laporan, bukan saldo seluruh rekening.', left, y, width, 8, C.muted)
      y += 32

      section('Ringkasan kategori', `${report.transactions.length} transaksi / ${report.categories.length} kategori pemasukan dan pengeluaran`)
      if (!report.categories.length) { text('Belum ada transaksi pada rentang ini.', left, y, width, 10, C.muted); y += 35 }
      for (const category of report.categories) {
        const nameLines = lines(category.name, 236, 9)
        for (let offset = 0; offset < nameLines.length;) {
          if (y + 36 > bottom) { newPage(); section('Ringkasan kategori (lanjutan)') }
          const take = Math.min(nameLines.length - offset, Math.max(1, Math.floor((bottom - y - 18) / 12)))
          const height = Math.max(33, take * 12 + 18)
          doc.moveTo(left, y + height).lineTo(left + width, y + height).strokeColor(C.line).lineWidth(0.5).stroke()
          nameLines.slice(offset, offset + take).forEach((line, i) => text(line, left, y + 8 + i * 12, 236, 9))
          if (offset === 0) {
            text(category.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran', left + 244, y + 9, 80, 8, category.type === 'INCOME' ? C.teal : C.red)
            text(`${category.count} trx`, left + 326, y + 9, 48, 8, C.muted)
            const amount = rupiah(category.amount)
            doc.font('ReportBold').fontSize(9)
            let size = 9
            while (doc.widthOfString(amount) > 132 && size > 6) doc.fontSize(size -= 0.5)
            text(amount, left + 381, y + 9, 134, size, C.ink, true, 'right')
          }
          offset += take; y += height
        }
      }
      y += 27
      if (y + 160 > bottom) newPage()
      section('Rincian transaksi', 'Urutan tanggal terlama ke terbaru. Seluruh rekening dan kategori disertakan.')
      tableHead()
      if (!report.transactions.length) {
        doc.rect(left, y, width, 62).fill('#F4F7F7')
        text('Tidak ada pemasukan atau pengeluaran untuk rentang yang dipilih.', left + 15, y + 25, width - 30, 9, C.muted)
        y += 62
      }
      report.transactions.forEach((row, index) => {
        const widths = [58, 176, 90, 83, 108.28]
        const date = row.date.slice(0, 10).split('-').reverse().join('/')
        const columns = [
          [date], lines(`${row.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}\n${row.description || '-'}`, widths[1] - 16),
          lines(row.category, widths[2] - 16), lines(row.account, widths[3] - 16), [rupiah(row.amount)],
        ]
        const lineCount = Math.max(...columns.map(c => c.length))
        const fullHeight = Math.max(37, lineCount * 11 + 16)
        if (fullHeight <= 630 && y + fullHeight > bottom) {
          newPage(); section('Rincian transaksi (lanjutan)'); tableHead()
        }
        let offset = 0
        while (offset < lineCount) {
          if (y + 38 > bottom) { newPage(); section('Rincian transaksi (lanjutan)'); tableHead() }
          const take = Math.min(lineCount - offset, Math.max(1, Math.floor((bottom - y - 16) / 11)))
          const height = Math.max(37, take * 11 + 16)
          if (index % 2 === 0) doc.rect(left, y, width, height).fill('#F4F7F7')
          let x = left
          columns.forEach((column, c) => {
            column.slice(offset, offset + take).forEach((line, i) => {
              let size = c === 0 ? 7 : 8
              if (c === 4) { doc.font('ReportBold').fontSize(size); while (doc.widthOfString(line) > widths[c] - 16 && size > 5) doc.fontSize(size -= 0.5) }
              text(line, x + 8, y + 8 + i * 11, widths[c] - 16, size, c === 4 ? row.type === 'INCOME' ? C.teal : C.red : C.ink, c === 4, c === 4 ? 'right' : 'left')
            })
            x += widths[c]
          })
          doc.moveTo(left, y + height).lineTo(left + width, y + height).strokeColor(C.line).lineWidth(0.4).stroke()
          y += height; offset += take
        }
      })
      if (y + 43 <= bottom) text(`Akhir laporan / ${report.transactions.length} transaksi`, left, y + 18, width, 8, C.muted)

      const pages = doc.bufferedPageRange()
      const printed = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(report.generatedAt)
      for (let p = pages.start; p < pages.start + pages.count; p++) {
        doc.switchToPage(p)
        // Footer lives outside the content margin; prevent PDFKit adding pages here.
        const bottomMargin = doc.page.margins.bottom
        doc.page.margins.bottom = 0
        doc.moveTo(left, 794).lineTo(left + width, 794).strokeColor(C.line).lineWidth(0.5).stroke()
        text(`BukuKasKu / Dicetak ${printed} WIB`, left, 806, 390, 7, C.muted)
        text(`${p + 1} / ${pages.count}`, left + 420, 806, width - 420, 7, C.muted, false, 'right')
        doc.page.margins.bottom = bottomMargin
      }
      doc.end()
    } catch (err) { doc.destroy(); reject(err) }
  })
}
