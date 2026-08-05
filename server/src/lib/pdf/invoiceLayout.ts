import PDFDocument from 'pdfkit';

export interface LineItem {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface InvoiceData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  logoBuffer?: Buffer;
  documentLabel: string; // small tag under the shop name, e.g. "Sales Receipt" or "Purchase Invoice"
  invoiceNumber: string;
  date: Date; // full timestamp — time is only displayed if cashierName is present
  secondaryReference?: { label: string; value: string }; // e.g. vendor's own invoice no.
  dueDate?: Date;
  partyLabel: string; // "Customer" or "Vendor"
  partyName: string;
  cashierName?: string; // presence of this signals "this is a POS sale" (shows Time row)
  items: LineItem[];
  subtotalCents: number;
  taxCents: number;
  discountCents?: number;
  grandTotalCents: number;
  paymentMethod?: string;
  amountPaidCents?: number; // only shown if provided — not currently tracked for cash sales
  changeCents?: number;
  footerNote?: string;
}

const PAGE_WIDTH_TOTAL = 280;
const MARGIN = 15;
const PAGE_LEFT = MARGIN;
const PAGE_RIGHT = PAGE_WIDTH_TOTAL - MARGIN;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT;

function formatCurrency(cents: number): string {
  return (cents / 100).toFixed(2);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function dashedLine(doc: PDFKit.PDFDocument, y: number) {
  doc.save();
  doc.dash(1.5, { space: 1.5 }).moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).strokeColor('#000').stroke();
  doc.undash();
  doc.restore();
}

function twoColRow(doc: PDFKit.PDFDocument, y: number, leftText: string, rightText: string) {
  const half = CONTENT_WIDTH / 2;
  doc.text(leftText, PAGE_LEFT, y, { width: half });
  doc.text(rightText, PAGE_LEFT + half, y, { width: half, align: 'right' });
}

/** Deterministic "barcode-style" bars generated from the invoice number's characters. Visual only — not a real, scannable barcode. */
function drawFakeBarcode(doc: PDFKit.PDFDocument, y: number, text: string) {
  const barcodeWidth = 180;
  const barcodeHeight = 32;
  const startX = PAGE_LEFT + (CONTENT_WIDTH - barcodeWidth) / 2;

  let x = startX;
  const chars = text.split('');
  let i = 0;
  while (x < startX + barcodeWidth) {
    const code = chars[i % chars.length].charCodeAt(0);
    const barWidth = (code % 3 === 0 ? 2.5 : code % 2 === 0 ? 1.5 : 1) as number;
    const gap = code % 5 === 0 ? 2 : 1;
    doc.rect(x, y, barWidth, barcodeHeight).fillColor('#000').fill();
    x += barWidth + gap;
    i++;
  }

  doc.fontSize(8).font('Courier').fillColor('#000')
    .text(text, PAGE_LEFT, y + barcodeHeight + 4, { width: CONTENT_WIDTH, align: 'center', characterSpacing: 1.5 });
}

export function generateInvoicePdf(data: InvoiceData, stream: NodeJS.WritableStream) {
  const isSale = !!data.cashierName;
  const hasDiscount = !!data.discountCents && data.discountCents > 0;
  const hasPayment = !!data.amountPaidCents;
  const hasSecondary = !!data.secondaryReference;
  const hasDue = !!data.dueDate;

  // Rough but generous height estimate — a little trailing whitespace at the
  // bottom is normal for a receipt, so we don't need pixel-perfect sizing.
  const estimatedHeight =
    260 +
    data.items.length * 16 +
    (hasDiscount ? 16 : 0) +
    (hasPayment ? 32 : 0) +
    (hasSecondary || hasDue ? 16 : 0) +
    (data.logoBuffer ? 56 : 0) +
    (data.businessAddress ? 10 : 0) +
    (data.businessPhone ? 10 : 0) +
    80; // barcode + footer buffer

  const doc = new PDFDocument({
    size: [PAGE_WIDTH_TOTAL, estimatedHeight],
    margins: { top: 20, bottom: 20, left: MARGIN, right: MARGIN },
  });
  doc.pipe(stream);
  doc.font('Courier');

  let y = 20;

  dashedLine(doc, y);
  y += 8;

  if (data.logoBuffer) {
    try {
      const logoSize = 50;
      const logoX = PAGE_LEFT + (CONTENT_WIDTH - logoSize) / 2;
      doc.image(data.logoBuffer, logoX, y, { fit: [logoSize, logoSize], align: 'center' });
      y += logoSize + 6;
    } catch {
      // Malformed/unsupported image — skip it, invoice still generates fine
    }
  }

  doc.fontSize(14).font('Courier-Bold').fillColor('#000')
    .text(data.businessName, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 16;

  if (data.businessAddress) {
    doc.fontSize(7).font('Courier').fillColor('#333')
      .text(data.businessAddress, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 10;
  }
  if (data.businessPhone) {
    doc.fontSize(7).font('Courier').fillColor('#333')
      .text(`Ph: ${data.businessPhone}`, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 10;
  }
  y += 1;

  doc.fontSize(8).font('Courier-Bold').fillColor('#555')
    .text(data.documentLabel.toUpperCase(), PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center', characterSpacing: 1 });
  y += 14;

  dashedLine(doc, y);
  y += 8;

  doc.fontSize(8.5).font('Courier').fillColor('#000');
  twoColRow(doc, y, `Bill No: ${data.invoiceNumber}`, `Date: ${formatDate(data.date)}`);
  y += 13;

  if (isSale) {
    twoColRow(doc, y, `Cashier: ${data.cashierName}`, `Time: ${formatTime(data.date)}`);
    y += 13;
    twoColRow(doc, y, `${data.partyLabel}: ${data.partyName}`, '');
    y += 13;
  } else {
    twoColRow(doc, y, `${data.partyLabel}: ${data.partyName}`, '');
    y += 13;
    if (hasSecondary) {
      twoColRow(doc, y, `${data.secondaryReference!.label}: ${data.secondaryReference!.value}`, hasDue ? `Due: ${formatDate(data.dueDate!)}` : '');
      y += 13;
    } else if (hasDue) {
      twoColRow(doc, y, `Due: ${formatDate(data.dueDate!)}`, '');
      y += 13;
    }
  }

  y += 4;
  dashedLine(doc, y);
  y += 8;

  // Item table columns
  const colItemW = 110;
  const colQtyX = PAGE_LEFT + colItemW;
  const colQtyW = 30;
  const colRateX = colQtyX + colQtyW;
  const colRateW = 45;
  const colAmountX = colRateX + colRateW;
  const colAmountW = CONTENT_WIDTH - colItemW - colQtyW - colRateW;

  doc.font('Courier-Bold').fontSize(8.5);
  doc.text('ITEM', PAGE_LEFT, y, { width: colItemW });
  doc.text('QTY', colQtyX, y, { width: colQtyW, align: 'right' });
  doc.text('RATE', colRateX, y, { width: colRateW, align: 'right' });
  doc.text('AMOUNT', colAmountX, y, { width: colAmountW, align: 'right' });
  y += 12;

  dashedLine(doc, y);
  y += 6;

  doc.font('Courier').fontSize(8.5);
  let totalQty = 0;
  for (const item of data.items) {
    totalQty += item.quantity;
    doc.text(item.name, PAGE_LEFT, y, { width: colItemW });
    doc.text(String(item.quantity), colQtyX, y, { width: colQtyW, align: 'right' });
    doc.text(formatCurrency(item.unitPriceCents), colRateX, y, { width: colRateW, align: 'right' });
    doc.text(formatCurrency(item.lineTotalCents), colAmountX, y, { width: colAmountW, align: 'right' });
    y += 13;
  }

  y += 2;
  dashedLine(doc, y);
  y += 8;

  doc.font('Courier').fontSize(8.5);
  twoColRow(doc, y, `TOTAL ITEMS : ${totalQty}`, '');
  y += 13;
  twoColRow(doc, y, 'SUBTOTAL', formatCurrency(data.subtotalCents));
  y += 13;
  twoColRow(doc, y, 'TAX', formatCurrency(data.taxCents));
  y += 13;

  if (hasDiscount) {
    twoColRow(doc, y, 'DISCOUNT', `-${formatCurrency(data.discountCents!)}`);
    y += 13;
  }

  y += 2;
  dashedLine(doc, y);
  y += 8;

  doc.font('Courier-Bold').fontSize(11);
  twoColRow(doc, y, 'TOTAL', formatCurrency(data.grandTotalCents));
  y += 16;

  dashedLine(doc, y);
  y += 8;

  doc.font('Courier').fontSize(8.5);
  if (data.paymentMethod) {
    twoColRow(doc, y, `PAYMENT MODE: ${data.paymentMethod}`, '');
    y += 13;
  }
  if (hasPayment) {
    twoColRow(doc, y, 'AMOUNT PAID', formatCurrency(data.amountPaidCents!));
    y += 13;
    twoColRow(doc, y, 'CHANGE', formatCurrency(data.changeCents ?? 0));
    y += 13;
  }

  y += 2;
  dashedLine(doc, y);
  y += 14;

  doc.font('Courier-Bold').fontSize(10)
    .text('THANK YOU!', PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 14;
  doc.font('Courier').fontSize(8)
    .text(data.footerNote || 'VISIT AGAIN', PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 22;

  drawFakeBarcode(doc, y, data.invoiceNumber);

  doc.end();
}