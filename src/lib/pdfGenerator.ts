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
  const doc = new jsPDF({
    unit: "mm",
    format: [100, 150], // 10cm x 15cm
  });

  let y = 8;

  // Shop name
  if (data.showShopName) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SRI MEENAKSHI TRADERS", 50, y, { align: "center" });
    y += 6;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATE", 50, y, { align: "center" });
  y += 4;

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

  // Calculate vertical space and adapt row height so we can fit at least 25 rows per page.
  const pageHeight = doc.internal.pageSize.getHeight();
  const topY = y; // where table starts
  const bottomMargin = 0.5; // mm reserved at bottom

  let availableHeight = pageHeight - topY - bottomMargin;

  // Initial style estimates
  let fontSize = 8; // pts
  let cellPadding = 1.5; // mm

  const minFontSize = 6;
  const minCellPadding = 0.6;

  const headerRows = 2; // number of head rows in our table
  const footerRows = 2; // subtotal + (maybe grand total)

  // Helper to estimate row height in mm. Font size in pts -> mm conversion (1pt = 0.352777...mm)
  const ptToMm = (pt: number) => pt * 0.3527777778;
  const estimateRowHeight = (fs: number, cp: number) => ptToMm(fs) + cp * 2 + 0.5; // small extra

  // Adjust fontSize/cellPadding down until we can fit 25 rows (or reach minimums)
  let rowsPerPage = 25;
  while (true) {
    const rowH = estimateRowHeight(fontSize, cellPadding);
    const headerH = headerRows * rowH;
    const footerH = footerRows * rowH;
    const usable = availableHeight - headerH - footerH;
    const fit = Math.floor(usable / rowH);
    if (fit >= 25) {
      rowsPerPage = 25;
      break;
    }
    // If we've reached minimums, accept the fit (may be <25)
    if (fontSize <= minFontSize && cellPadding <= minCellPadding) {
      rowsPerPage = Math.max(1, fit);
      break;
    }
    // reduce sizes a bit
    fontSize = Math.max(minFontSize, fontSize - 0.5);
    cellPadding = Math.max(minCellPadding, +(cellPadding - 0.15).toFixed(2));
  }

  // Now paginate according to computed rowsPerPage
  const pages: typeof itemsForPdf[] = [];
  for (let i = 0; i < itemsForPdf.length; i += rowsPerPage) {
    pages.push(itemsForPdf.slice(i, i + rowsPerPage));
  }
  if (pages.length === 0) pages.push([]);

  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 3; // mm
  const rightMargin = 3; // mm
  // reserve a tiny extra gap to avoid floating-point overflow when rendering
  const renderSafetyGap = 0.8; // mm
  let availableWidth = pageWidth - leftMargin - rightMargin - renderSafetyGap;

  // Base column widths (rough values in mm). We'll scale them to fill available width.
  const baseWidths = { 0: 8, 1: 46, 2: 14, 3: 10, 4: 20 };
  const sumBase = Object.values(baseWidths).reduce((s, v) => s + v, 0);
  const scale = availableWidth / sumBase;
  // Round down widths to whole mm to avoid tiny overflows; ensure reasonable minimums
  const colWidths = {
    0: Math.max(6, Math.floor(baseWidths[0] * scale)),
    1: Math.max(10, Math.floor(baseWidths[1] * scale)),
    2: Math.max(8, Math.floor(baseWidths[2] * scale)),
    3: Math.max(6, Math.floor(baseWidths[3] * scale)),
    4: Math.max(8, Math.floor(baseWidths[4] * scale)),
  };
  // If rounding caused a tiny gap, add it to the particulars column so table fills width
  const totalCols = Object.values(colWidths).reduce((s, v) => s + v, 0);
  const roundingGap = Math.round(availableWidth) - totalCols;
  if (roundingGap > 0) colWidths[1] += roundingGap;

  // Render pages: each page gets rowsPerPage rows (padded if needed), then a Subtotal row.
  pages.forEach((pageItems, pageIndex) => {
    // Pad page to rowsPerPage with empty rows so table looks consistent
    const padded = [...pageItems];
    while (padded.length < rowsPerPage) padded.push({ no: 0, particulars: '', rate: '', qty: '', amount: 0 ,isSpecial: false});

    const pageBody: any[] = padded.map((it: any) => {
      const noDisplay = it.no === 0 ? '' : it.no;
      const amountDisplay = it.particulars === '' ? '' : (it.amount || 0).toFixed(0);
      
      // If special item, center the particulars
      if (it.isSpecial) {
        return [
          { content: '', styles: { halign: 'center' } },
          { content: it.particulars, styles: { halign: 'center' } },
          { content: it.rate, styles: { halign: 'center' } },
          { content: it.qty, styles: { halign: 'center' } },
          { content: amountDisplay, styles: { halign: 'center' } }
        ];
      }
      
      return [noDisplay, it.particulars, it.rate, it.qty, amountDisplay];
    });

    const pageSubtotal = pageItems.reduce((s, it) => s + (it.amount || 0), 0);

    // Subtotal row for the page
    pageBody.push([
      { content: 'SUBTOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: formatINR(pageSubtotal), styles: { fontStyle: 'bold' } },
    ]);

    // If last page, add GRAND TOTAL row below subtotal
    if (pageIndex === pages.length - 1) {
      pageBody.push([
        { content: 'GRAND TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatINR(grandTotal), styles: { fontStyle: 'bold' } },
      ]);
    }

    if (pageIndex > 0) doc.addPage();

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

      body: pageBody,

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
  });

  return doc;
  //d;
};