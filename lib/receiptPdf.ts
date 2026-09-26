import jsPDF from 'jspdf';

interface ReceiptPDFData {
  gymName: string;
  gymAddress: string;
  gymPhone: string;
  gymEmail: string;
  receiptNo: string;
  receiptDate: string;
  memberName: string;
  memberPhone: string;
  memberEmail?: string;
  memberId: string;
  plan: string;
  startDate: string;
  expiryDate: string;
  trainer: string;
  paymentMode: string;
  amount: string;
  totalAmount?: number;
  paidAmount?: number;
  dueAmount?: number;
}

export function generateReceiptPDF(data: ReceiptPDFData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] }); // Thermal receipt width
  const w = 80;
  const margin = 6;
  const contentW = w - margin * 2;
  let y = 8;

  const addText = (text: string, x: number, yPos: number, options: any = {}) => {
    doc.text(text, x, yPos, options);
  };

  // Helper: strip ₹ symbol and format amount for PDF (Helvetica doesn't support ₹)
  const formatAmount = (amt: string) => {
    const cleaned = amt.replace(/[₹\s]/g, '').trim();
    return `Rs. ${cleaned}`;
  };

  // ─── Header ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  addText(data.gymName.toUpperCase(), w / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  // Word-wrap address
  const addressLines = doc.splitTextToSize(data.gymAddress, contentW - 4);
  addressLines.forEach((line: string) => {
    addText(line, w / 2, y, { align: 'center' });
    y += 3;
  });

  doc.setFontSize(7);
  addText(`Ph: ${data.gymPhone}  |  ${data.gymEmail}`, w / 2, y, { align: 'center' });
  y += 5;

  // ─── Dashed line ───
  doc.setLineDashPattern([1, 1], 0);
  doc.setLineWidth(0.3);
  doc.line(margin, y, w - margin, y);
  y += 4;

  // ─── RECEIPT title ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  addText('MEMBERSHIP RECEIPT', w / 2, y, { align: 'center' });
  y += 5;

  // ─── Receipt meta ───
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  addText(`Receipt No:`, margin, y);
  doc.setFont('helvetica', 'bold');
  addText(`#${data.receiptNo}`, w - margin, y, { align: 'right' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  addText(`Date:`, margin, y);
  addText(data.receiptDate, w - margin, y, { align: 'right' });
  y += 4;

  addText(`Member ID:`, margin, y);
  doc.setFont('helvetica', 'bold');
  addText(data.memberId, w - margin, y, { align: 'right' });
  y += 4;

  // ─── Dashed line ───
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, w - margin, y);
  y += 4;

  // ─── Member Details ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  addText('MEMBER DETAILS', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const memberRows = [
    ['Name', data.memberName],
    ['Phone', data.memberPhone],
  ];
  if (data.memberEmail) {
    memberRows.push(['Email', data.memberEmail]);
  }
  memberRows.forEach(([label, value]) => {
    addText(label + ':', margin, y);
    addText(value, w - margin, y, { align: 'right' });
    y += 4;
  });

  // ─── Dashed line ───
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, w - margin, y);
  y += 4;

  // ─── Plan Details ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  addText('PLAN DETAILS', margin, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  const planRows = [
    ['Plan', data.plan],
    ['Start Date', data.startDate],
    ['Expiry Date', data.expiryDate],
    ['Trainer', data.trainer],
    ['Payment', data.paymentMode],
  ];
  planRows.forEach(([label, value]) => {
    addText(label + ':', margin, y);
    addText(value, w - margin, y, { align: 'right' });
    y += 4;
  });

  // ─── Dashed line ───
  doc.setLineDashPattern([1, 1], 0);
  doc.line(margin, y, w - margin, y);
  y += 5;

  // ─── Total Box ───
  doc.setFillColor(13, 13, 13);
  doc.roundedRect(margin, y - 2, contentW, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  addText('TOTAL PAID', margin + 3, y + 5);
  doc.setFontSize(12);
  addText(formatAmount(data.amount), w - margin - 3, y + 5.5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 14;

  // ─── Due Amount (if any) ───
  if (data.dueAmount && data.dueAmount > 0) {
    doc.setFillColor(255, 243, 224);
    doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(200, 100, 0);
    addText('BALANCE DUE', margin + 3, y + 5);
    doc.setFontSize(9);
    addText(`Rs. ${data.dueAmount}`, w - margin - 3, y + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 11;
  }

  // ─── Footer ───
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6);
  doc.setTextColor(130, 130, 130);
  addText(`Thank you for choosing ${data.gymName}!`, w / 2, y, { align: 'center' });
  y += 3;
  addText('Stay fit, stay healthy. This is your official receipt.', w / 2, y, { align: 'center' });
  y += 3;
  doc.setFont('helvetica', 'bold');
  addText('No refunds applicable.', w / 2, y, { align: 'center' });
  y += 6;

  // ─── Trim page height ───
  // jsPDF doesn't natively support resizing after creation,
  // but our initial height of 200mm is generous enough.

  doc.setTextColor(0, 0, 0);
  return doc;
}

export function downloadReceiptPDF(data: ReceiptPDFData, filename?: string) {
  const doc = generateReceiptPDF(data);
  const fname = filename || `Receipt_${data.receiptNo}_${data.memberName.replace(/\s/g, '_')}.pdf`;
  doc.save(fname);
}

export function getReceiptPDFBlob(data: ReceiptPDFData): Blob {
  const doc = generateReceiptPDF(data);
  return doc.output('blob');
}
