import PDFDocument from 'pdfkit';

export interface ReportColumn {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'right';
}

export interface ListReportData {
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  logoBuffer?: Buffer;
  title: string;
  filterSummary?: string;
  columns: ReportColumn[];
  rows: Record<string, string>[];
  totalLabel?: string;
  totalValue?: string;
}

const PAGE_LEFT = 40;
const PAGE_RIGHT = 555;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT;
const PAGE_BOTTOM = 780;
const ROW_HEIGHT = 20;

export function generateListReportPdf(data: ListReportData, stream: NodeJS.WritableStream) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(stream);

  function drawHeader(isFirstPage: boolean): number {
    let y = 40;
    if (isFirstPage) {
      if (data.logoBuffer) {
        doc.image(data.logoBuffer, PAGE_LEFT + CONTENT_WIDTH / 2 - 20, y, { width: 40, height: 40 });
        y += 46;
      }
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a')
        .text(data.businessName || 'QuickBill', PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 20;

      if (data.businessAddress) {
        doc.fontSize(8).font('Helvetica').fillColor('#666')
          .text(data.businessAddress, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
        y += 11;
      }
      if (data.businessPhone) {
        doc.fontSize(8).font('Helvetica').fillColor('#666')
          .text(`Ph: ${data.businessPhone}`, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
        y += 11;
      }
      y += 6;
      doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).strokeColor('#1a1a1a').lineWidth(1).stroke();
      y += 12;

      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a1a')
        .text(data.title, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 16;

      if (data.filterSummary) {
        doc.fontSize(8.5).font('Helvetica').fillColor('#666')
          .text(data.filterSummary, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
        y += 12;
      }

      doc.fontSize(7.5).font('Helvetica').fillColor('#999')
        .text(`Generated on ${new Date().toLocaleString('en-IN')}`, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 16;
    } else {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a')
        .text(`${data.title} (continued)`, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 20;
    }
    return y;
  }

  function drawTableHeader(y: number): number {
    doc.rect(PAGE_LEFT, y, CONTENT_WIDTH, 22).fillColor('#1a1a1a').fill();
    let x = PAGE_LEFT;
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#fff');
    for (const col of data.columns) {
      doc.text(col.label, x + 6, y + 6.5, { width: col.width - 8, align: col.align || 'left' });
      x += col.width;
    }
    return y + 22;
  }

  let y = drawHeader(true);
  y = drawTableHeader(y);
  doc.font('Helvetica').fontSize(8.5);

  data.rows.forEach((row, i) => {
    if (y + ROW_HEIGHT > PAGE_BOTTOM) {
      doc.addPage();
      y = drawHeader(false);
      y = drawTableHeader(y);
      doc.font('Helvetica').fontSize(8.5);
    }
    if (i % 2 === 1) {
      doc.rect(PAGE_LEFT, y, CONTENT_WIDTH, ROW_HEIGHT).fillColor('#f7f7f7').fill();
    }
    let x = PAGE_LEFT;
    doc.fillColor('#1a1a1a');
    for (const col of data.columns) {
      doc.text(row[col.key] ?? '', x + 6, y + 5.5, { width: col.width - 8, align: col.align || 'left' });
      x += col.width;
    }
    y += ROW_HEIGHT;
  });

  doc.moveTo(PAGE_LEFT, y).lineTo(PAGE_RIGHT, y).strokeColor('#1a1a1a').lineWidth(1).stroke();
  y += 10;

  if (data.totalLabel && data.totalValue) {
    if (y + 26 > PAGE_BOTTOM) {
      doc.addPage();
      y = drawHeader(false);
    }
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a1a');
    doc.text(data.totalLabel, PAGE_LEFT, y, { width: CONTENT_WIDTH - 150 });
    doc.text(data.totalValue, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'right' });
    y += 20;
  }

  doc.fontSize(7.5).font('Helvetica').fillColor('#999')
    .text(`Total records: ${data.rows.length}`, PAGE_LEFT, y, { width: CONTENT_WIDTH, align: 'center' });

  doc.end();
}