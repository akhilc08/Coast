import PDFDocument from 'pdfkit'

export interface PurchaseAgreementData {
  vin: string
  year: number
  make: string
  model: string
  mileage: number
  color: string
  priceCents: number
  buyerName: string
  buyerEmail: string
  sellerName: string
  date: string
  orderNumber: string
}

/**
 * Generates a purchase agreement PDF as a Buffer.
 * Uses PDFKit with LETTER size and 50pt margins.
 */
export function generatePurchaseAgreement(data: PurchaseAgreementData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 50, bottom: 50, left: 50, right: 50 } })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(data.priceCents / 100)

    // Header — Coast branding
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('COAST', { align: 'center' })
      .moveDown(0.5)

    // Title
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('PURCHASE AGREEMENT', { align: 'center' })
      .moveDown(1)

    // Order info
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Order Number: ${data.orderNumber}`, { align: 'right' })
      .text(`Date: ${data.date}`, { align: 'right' })
      .moveDown(1)

    // Vehicle Details Section
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('VEHICLE DETAILS')
      .moveDown(0.5)

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`VIN: ${data.vin}`)
      .text(`Year: ${data.year}`)
      .text(`Make: ${data.make}`)
      .text(`Model: ${data.model}`)
      .text(`Mileage: ${data.mileage.toLocaleString()} miles`)
      .text(`Exterior Color: ${data.color}`)
      .text(`Purchase Price: ${formattedPrice}`)
      .moveDown(1)

    // Buyer / Seller Section
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PARTIES')
      .moveDown(0.5)

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Buyer: ${data.buyerName} (${data.buyerEmail})`)
      .text(`Seller: ${data.sellerName}`)
      .moveDown(1)

    // Terms
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TERMS AND CONDITIONS')
      .moveDown(0.5)

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        'The vehicle described above is sold AS-IS with no warranties, express or implied. ' +
        'Buyer acknowledges they have had the opportunity to inspect the vehicle and accepts ' +
        'it in its current condition. Seller makes no representation regarding the condition ' +
        'of the vehicle. This agreement constitutes the entire agreement between the parties ' +
        'with respect to the sale of the vehicle.'
      )
      .moveDown(2)

    // Signature blocks
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('SIGNATURES')
      .moveDown(1)

    // Buyer signature block — Dropbox Sign text tags in white text (invisible to reader,
    // detected by Dropbox Sign to auto-place signature and date tabs)
    doc
      .fontSize(11)
      .font('Helvetica')
      .text('Buyer Signature: _______________________________', { continued: true })
      .fillColor('white')
      .text('[sig|req|signer1]', { continued: true })
      .fillColor('black')
      .text('    Date: _______________', { continued: true })
      .fillColor('white')
      .text('[date|req|signer1]')
      .fillColor('black')
      .moveDown(0.5)
      .text(`Print Name: ${data.buyerName}`)
      .moveDown(1.5)
      .text('Seller Signature: _______________________________    Date: _______________')
      .moveDown(0.5)
      .text(`Print Name: ${data.sellerName}`)

    doc.end()
  })
}
