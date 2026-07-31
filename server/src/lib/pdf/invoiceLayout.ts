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
  secondaryReference?: { label: string; value: string };
  date: Date;
  dueDate?: Date;
  partyLabel: string;
  partyName: string;
  items: LineItem[];
  subtotalCents: number;
  taxCents: number;
  discountCents?: number;
  grandTotalCents: number;
  footerNote?: string;
}

const PAGE_LEFT = 50;
const PAGE_RIGHT = 545;
const PAGE_WIDTH = PAGE_RIGHT - PAGE_LEFT;

function formatCurrency(cents: number): string {
  return `Rs. ${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function generateInvoicePdf(data: InvoiceData, stream: NodeJS.WritableStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  // ── Shop header (centered) ──────────────────────────
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a1a')
    .text('QuickBill', PAGE_LEFT, 50, { width: PAGE_WIDTH, align: 'center' });
  doc.fontSize(9).font('Helvetica').fillColor('#777')
    .text('Retail & Accounting', PAGE_LEFT, 76, { width: PAGE_WIDTH, align: 'center' });

  // Thick rule under the header
  doc.moveTo(PAGE_LEFT, 100).lineTo(PAGE_RIGHT, 100).lineWidth(1.5).strokeColor('#1a1a1a').stroke();

  // Document title banner
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a1a')
    .text(data.documentTitle, PAGE_LEFT, 112, { width: PAGE_WIDTH, align: 'center', characterSpacing: 1 });

  // ── Info box: invoice meta (left) + party info (right) ──────────────────────────
  const infoTop = 145;
  const infoBoxHeight = 80;
  doc.rect(PAGE_LEFT, infoTop, PAGE_WIDTH, infoBoxHeight).strokeColor('#ccc').lineWidth(0.75).stroke();
  // vertical divider
  const dividerX = PAGE_LEFT + PAGE_WIDTH / 2;
  doc.moveTo(dividerX, infoTop).lineTo(dividerX, infoTop + infoBoxHeight).strokeColor('#ccc').stroke();

  // Left: party info
  const leftPad = PAGE_LEFT + 12;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#888')
    .text(data.partyLabel.toUpperCase(), leftPad, infoTop + 12);
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a')
    .text(data.partyName, leftPad, infoTop + 26);

  // Right: invoice meta
  const rightPad = dividerX + 12;
  let metaY = infoTop + 12;
  doc.fontSize(9).font('Helvetica').fillColor('#555');
  doc.font('Helvetica-Bold').text('Invoice No: ', rightPad, metaY, { continued: true });
  doc.font('Helvetica').text(data.invoiceNumber);
  metaY += 15;

  if (data.secondaryReference) {
    doc.font('Helvetica-Bold').text(`${data.secondaryReference.label}: `, rightPad, metaY, { continued: true });
    doc.font('Helvetica').text(data.secondaryReference.value);
    metaY += 15;
  }

  doc.font('Helvetica-Bold').text('Date: ', rightPad, metaY, { continued: true });
  doc.font('Helvetica').text(formatDate(data.date));
  metaY += 15;

  if (data.dueDate) {
    doc.font('Helvetica-Bold').text('Due Date: ', rightPad, metaY, { continued: true });
    doc.font('Helvetica').text(formatDate(data.dueDate));
  }

  // ── Line items table ──────────────────────────
  const tableTop = infoTop + infoBoxHeight + 25;
  const colSl = PAGE_LEFT;
  const colItem = PAGE_LEFT + 30;
  const colQty = 340;
  const colRate = 400;
  const colAmount = 465;

  // Header row (dark background)
  doc.rect(PAGE_LEFT, tableTop, PAGE_WIDTH, 22).fillColor('#1a1a1a').fill();
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
  doc.text('#', colSl + 8, tableTop + 6.5);
  doc.text('Item', colItem, tableTop + 6.5);
  doc.text('Qty', colQty, tableTop + 6.5, { width: 50, align: 'right' });
  doc.text('Rate', colRate, tableTop + 6.5, { width: 55, align: 'right' });
  doc.text('Amount', colAmount, tableTop + 6.5, { width: 80, align: 'right' });

  // Rows (alternating shade)
  let y = tableTop + 22;
  doc.font('Helvetica').fontSize(9).fillColor('#1a1a1a');
  data.items.forEach((item, i) => {
    const rowHeight = 20;
    if (i % 2 === 1) {
      doc.rect(PAGE_LEFT, y, PAGE_WIDTH, rowHeight).fillColor('#f7f7f7').fill();
    }
    doc.fillColor('#1a1a1a');
    doc.text(String(i + 1), colSl + 8, y + 5.5);
    doc.text(item.name, colItem, y + 5.5, { width: colQty - colItem - 10 });
    doc.text(String(item.quantity), colQty, y + 5.5, { width: 50, align: 'right' });
    doc.text(formatCurrency(item.unitPriceCents), colRate, y + 5.5, { width: 55, align: 'right' });
    doc.text(formatCurrency(item.lineTotalCents), colAmount, y + 5.5, { width: 80, align: 'right' });
    y += rowHeight;
  });

  // Bottom border of table
  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).strokeColor('#1a1a1a').lineWidth(1).stroke();
  y += 15;

  // ── Totals box (right-aligned) ──────────────────────────
  const totalsBoxWidth = 220;
  const totalsBoxX = PAGE_RIGHT - totalsBoxWidth;
  const totalsLabelWidth = 110;
  const totalsValueWidth = totalsBoxWidth - totalsLabelWidth;

  doc.fontSize(9).font('Helvetica').fillColor('#555');
  doc.text('Subtotal', totalsBoxX, y, { width: totalsLabelWidth, align: 'left' });
  doc.text(formatCurrency(data.subtotalCents), totalsBoxX + totalsLabelWidth, y, {
    width: totalsValueWidth,
    align: 'right',
  });
  y += 16;

  doc.text('Tax', totalsBoxX, y, { width: totalsLabelWidth, align: 'left' });
  doc.text(formatCurrency(data.taxCents), totalsBoxX + totalsLabelWidth, y, {
    width: totalsValueWidth,
    align: 'right',
  });
  y += 16;

  if (data.discountCents && data.discountCents > 0) {
    doc.text('Discount', totalsBoxX, y, { width: totalsLabelWidth, align: 'left' });
    doc.text(`-${formatCurrency(data.discountCents)}`, totalsBoxX + totalsLabelWidth, y, {
      width: totalsValueWidth,
      align: 'right',
    });
    y += 16;
  }

  // Grand total — boxed, filled
  y += 4;
  doc.rect(totalsBoxX, y, totalsBoxWidth, 26).fillColor('#1a1a1a').fill();
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#fff');
  doc.text('TOTAL', totalsBoxX + 12, y + 7);
  doc.text(formatCurrency(data.grandTotalCents), totalsBoxX, y + 7, {
    width: totalsBoxWidth - 12,
    align: 'right',
  });

  // ── Footer ──────────────────────────
  const footerY = 750;
  doc.moveTo(PAGE_LEFT, footerY - 15).lineTo(PAGE_RIGHT, footerY - 15).strokeColor('#ddd').stroke();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a')
    .text('Thank you for your business!', PAGE_LEFT, footerY, { width: PAGE_WIDTH, align: 'center' });

  if (data.footerNote) {
    doc.fontSize(8).font('Helvetica').fillColor('#888')
      .text(data.footerNote, PAGE_LEFT, footerY + 15, { width: PAGE_WIDTH, align: 'center' });
  }

  doc.end();
}