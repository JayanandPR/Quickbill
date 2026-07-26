import PDFDocument from 'pdfkit';

export interface LineItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface InvoiceData {
  documentTitle: string; // "SALES INVOICE" or "PURCHASE INVOICE"
  invoiceNumber: string;
  secondaryReference?: { label: string; value: string }; // e.g. vendor's own invoice no.
  date: Date;
  dueDate?: Date;
  partyLabel: string; // "Billed To" or "Purchased From"
  partyName: string;
  items: LineItem[];
  subtotalCents: number;
  taxCents: number;
  discountCents?: number;
  grandTotalCents: number;
  footerNote?: string;
}

function formatCurrency(cents: number): string {
  return `Rs. ${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Builds a simple, clean invoice PDF and streams it into the given writable
 * stream (typically the HTTP response). Kept deliberately plain for now —
 * a company header/logo can be added later inside this one function without
 * touching the two endpoint controllers that call it.
 */
export function generateInvoicePdf(data: InvoiceData, stream: NodeJS.WritableStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text('QuickBill', 50, 50);
  doc.fontSize(10).font('Helvetica').fillColor('#666').text('Retail & Accounting', 50, 72);

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text(data.documentTitle, 50, 110);

  // Invoice meta (right-aligned block)
  const metaTop = 50;
  doc.fontSize(10).font('Helvetica').fillColor('#000');
  doc.text(`Invoice No: ${data.invoiceNumber}`, 350, metaTop, { align: 'right' });
  if (data.secondaryReference) {
    doc.text(`${data.secondaryReference.label}: ${data.secondaryReference.value}`, 350, metaTop + 15, {
      align: 'right',
    });
  }
  doc.text(`Date: ${formatDate(data.date)}`, 350, metaTop + 30, { align: 'right' });
  if (data.dueDate) {
    doc.text(`Due Date: ${formatDate(data.dueDate)}`, 350, metaTop + 45, { align: 'right' });
  }

  // Party info
  doc.moveTo(50, 140).lineTo(545, 140).strokeColor('#ddd').stroke();
  doc.fontSize(10).font('Helvetica-Bold').text(data.partyLabel, 50, 155);
  doc.font('Helvetica').text(data.partyName, 50, 170);

  // Table header
  const tableTop = 210;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Item', 50, tableTop);
  doc.text('Qty', 300, tableTop, { width: 60, align: 'right' });
  doc.text('Unit Price', 360, tableTop, { width: 90, align: 'right' });
  doc.text('Total', 460, tableTop, { width: 85, align: 'right' });
  doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#000').stroke();

  // Table rows
  let y = tableTop + 25;
  doc.font('Helvetica').fontSize(10);
  for (const item of data.items) {
    doc.text(item.name, 50, y, { width: 240 });
    doc.text(String(item.quantity), 300, y, { width: 60, align: 'right' });
    doc.text(formatCurrency(item.unitPriceCents), 360, y, { width: 90, align: 'right' });
    doc.text(formatCurrency(item.lineTotalCents), 460, y, { width: 85, align: 'right' });
    y += 20;
  }

  doc.moveTo(50, y + 5).lineTo(545, y + 5).strokeColor('#ddd').stroke();
  y += 20;

  // Totals block
  const totalsX = 360;
  doc.text('Subtotal', totalsX, y, { width: 90, align: 'right' });
  doc.text(formatCurrency(data.subtotalCents), 460, y, { width: 85, align: 'right' });
  y += 18;

  doc.text('Tax', totalsX, y, { width: 90, align: 'right' });
  doc.text(formatCurrency(data.taxCents), 460, y, { width: 85, align: 'right' });
  y += 18;

  if (data.discountCents && data.discountCents > 0) {
    doc.text('Discount', totalsX, y, { width: 90, align: 'right' });
    doc.text(`-${formatCurrency(data.discountCents)}`, 460, y, { width: 85, align: 'right' });
    y += 18;
  }

  doc.moveTo(360, y + 2).lineTo(545, y + 2).strokeColor('#000').stroke();
  y += 10;
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Total', totalsX, y, { width: 90, align: 'right' });
  doc.text(formatCurrency(data.grandTotalCents), 460, y, { width: 85, align: 'right' });

  // Footer
  if (data.footerNote) {
    doc.font('Helvetica').fontSize(9).fillColor('#888').text(data.footerNote, 50, 750, {
      width: 495,
      align: 'center',
    });
  }

  doc.end();
}