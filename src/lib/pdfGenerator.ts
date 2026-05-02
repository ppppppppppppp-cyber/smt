import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BillItem } from "@/components/BillTable";

interface BillData {
  customerName: string;
  billDate: string;
  showShopName: boolean;
  packingCharge: number | null;
  oldbalance: number | null;
  advPay: number | null;
  items: BillItem[];
  total: number;
}
const formatINR = (num: number) => {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(num);
};
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const generateBillPDF = (data: BillData): jsPDF => {
  const topY = 8;
  const defaultPageWidth = 100;
  const bottomMargin = 5;

  // Prepare rows
  const itemsForPdf = data.items.map((item, i) => ({
    no: i + 1,
    particulars: item.particulars,
    rate: item.rate,
    qty: item.qty,
    amount: item.amount,
    isSpecial: false,
  }));

  if (data.packingCharge && data.packingCharge > 0) {
    itemsForPdf.push({ no: 0, particulars: 'PACKING CHARGES', rate: '', qty: '', amount: data.packingCharge, isSpecial: true });
  }

  if (data.oldbalance && data.oldbalance > 0) {
    itemsForPdf.push({ no: 0, particulars: 'OLD BALANCE', rate: '', qty: '', amount: data.oldbalance, isSpecial: true });
  }
  if (data.advPay && data.advPay > 0) {
    itemsForPdf.push({ no: 0, particulars: 'ADVANCE PAID', rate: '', qty: '', amount: -data.advPay, isSpecial: true });
  }

  const grandTotal = itemsForPdf.reduce((s, it) => s + (it.amount || 0), 0);

  // Use a dynamic page height so the whole bill fits on one page.
  const fontSize = 8;
  const cellPadding = 1.5;
  const ptToMm = (pt: number) => pt * 0.3527777778;
  const rowHeight = ptToMm(fontSize) + cellPadding * 2 + 0.5;
  const headerRows = 2;
  const footerRows = 2;
  const estimatedHeight =
    topY +
    (headerRows + itemsForPdf.length + footerRows) * rowHeight +
    bottomMargin +
    4; // padding for table header spacing

  const doc = new jsPDF({
    unit: "mm",
    format: [defaultPageWidth, Math.max(150, estimatedHeight)],
  });

  let y = topY;

  // Shop name
  if (data.showShopName) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SRI MEENAKSHI TRADERS", 50, y, { align: "center" });
    y += 6;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATE", 50, y, { align: "center" });
  y += 4;

  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 3; // mm
  const rightMargin = 3; // mm
  const renderSafetyGap = 0.8; // mm
  const availableWidth = pageWidth - leftMargin - rightMargin - renderSafetyGap;

  // Base column widths (rough values in mm). We'll scale them to fill available width.
  const baseWidths = { 0: 8, 1: 46, 2: 14, 3: 10, 4: 20 };
  const sumBase = Object.values(baseWidths).reduce((s, v) => s + v, 0);
  const scale = availableWidth / sumBase;
  const colWidths = {
    0: Math.max(6, Math.floor(baseWidths[0] * scale)),
    1: Math.max(10, Math.floor(baseWidths[1] * scale)),
    2: Math.max(8, Math.floor(baseWidths[2] * scale)),
    3: Math.max(6, Math.floor(baseWidths[3] * scale)),
    4: Math.max(8, Math.floor(baseWidths[4] * scale)),
  };
  const totalCols = Object.values(colWidths).reduce((s, v) => s + v, 0);
  const roundingGap = Math.round(availableWidth) - totalCols;
  if (roundingGap > 0) colWidths[1] += roundingGap;

  const bodyRows: any[] = itemsForPdf.map((it: any) => {
    const noDisplay = it.no === 0 ? '' : it.no;
    const amountDisplay = it.particulars === '' ? '' : (it.amount || 0).toFixed(0);

    if (it.isSpecial) {
      return [
        { content: '', styles: { halign: 'center' } },
        { content: it.particulars, styles: { halign: 'center' } },
        { content: it.rate, styles: { halign: 'center' } },
        { content: it.qty, styles: { halign: 'center' } },
        { content: amountDisplay, styles: { halign: 'center' } },
      ];
    }

    return [noDisplay, it.particulars, it.rate, it.qty, amountDisplay];
  });

  const subtotalRow = [
    { content: 'SUBTOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
    { content: formatINR(grandTotal), styles: { fontStyle: 'bold' } },
  ];

  const body = [...bodyRows, subtotalRow];

  autoTable(doc, {
    startY: y,
    margin: { left: leftMargin, right: rightMargin },
    theme: 'grid',
    tableWidth: availableWidth,

    head: [
      [
        { content: `Party : ${data.customerName || '-'}`, colSpan: 3, styles: { halign: 'left' } },
        { content: `Date : ${formatDate(data.billDate)}`, colSpan: 2, styles: { halign: 'right' } },
      ],
      ['No', 'Particulars', 'Rate', 'Qty', 'Amount'],
    ],

    body,

    styles: {
      fontSize,
      cellPadding,
      lineWidth: 0.1,
      valign: 'middle',
      textColor: 0,
      lineColor: 0,
    },

    headStyles: {
      fillColor: [255, 255, 255],
      textColor: 0,
      fontStyle: 'bold',
      halign: 'center',
    },

    columnStyles: {
      0: { cellWidth: colWidths[0], halign: 'center' },
      1: { cellWidth: colWidths[1] },
      2: { cellWidth: colWidths[2], halign: 'center' },
      3: { cellWidth: colWidths[3], halign: 'center' },
      4: { cellWidth: colWidths[4], halign: 'center' },
    },
  });

  return doc;
};