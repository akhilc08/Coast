import PDFDocument from 'pdfkit'

export interface BillOfSaleData {
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
 * Generates a bill of sale PDF as a Buffer.
 * Uses PDFKit with LETTER size and 50pt margins.
 */
export function generateBillOfSale(data: BillOfSaleData): Promise<Buffer> {
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
      .text('BILL OF SALE', { align: 'center' })
      .moveDown(1)

    // Order info
    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Order Number: ${data.orderNumber}`, { align: 'right' })
      .text(`Date: ${data.date}`, { align: 'right' })
      .moveDown(1)

    // Main body
    doc
      .fontSize(11)
      .font('Helvetica')
      .text(
        `I, ${data.sellerName}, hereby sell to ${data.buyerName} the following vehicle for ` +
        `the consideration amount of ${formattedPrice}:`
      )
      .moveDown(1)

    // Vehicle details
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('VEHICLE DESCRIPTION')
      .moveDown(0.5)

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`VIN: ${data.vin}`)
      .text(`Year / Make / Model: ${data.year} ${data.make} ${data.model}`)
      .text(`Mileage at Time of Sale: ${data.mileage.toLocaleString()} miles`)
      .text(`Exterior Color: ${data.color}`)
      .moveDown(1)

    // Consideration
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('CONSIDERATION')
      .moveDown(0.5)

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(`Purchase Price: ${formattedPrice}`)
      .text('Payment Method: Electronic payment processed through Coast Marketplace')
      .moveDown(1)

    // As-is disclaimer
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('AS-IS DISCLAIMER')
      .moveDown(0.5)

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(
        'The above described vehicle is sold AS-IS and WHERE-IS with no warranty or guarantee, ' +
        'either express or implied, as to condition, fitness for a particular purpose, ' +
        'merchantability, or any other matter. Buyer acknowledges receipt and acceptance of ' +
        `the vehicle in its current condition. Buyer: ${data.buyerName} (${data.buyerEmail}).`
      )
      .moveDown(2)

    // Signature blocks
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('SIGNATURES')
      .moveDown(1)

    doc
      .fontSize(11)
      .font('Helvetica')
      .text('Seller Signature: _______________________________    Date: _______________')
      .moveDown(0.5)
      .text(`Print Name: ${data.sellerName}`)
      .moveDown(1.5)
      // Buyer signature block — anchor strings in white text for DocuSign tab placement
      .text('Buyer Signature: _______________________________', { continued: true })
      .fillColor('white')
      .text('{{BUYER_SIGNATURE}}', { continued: true })
      .fillColor('black')
      .text('    Date: _______________', { continued: true })
      .fillColor('white')
      .text('{{BUYER_DATE}}')
      .fillColor('black')
      .moveDown(0.5)
      .text(`Print Name: ${data.buyerName}`)

    doc.end()
  })
}
