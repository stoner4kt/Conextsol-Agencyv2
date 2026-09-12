import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Client, Invoice } from '../types';

const formatCurrency = (value: number) =>
  `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

export function generateInvoicePDF(invoice: Invoice, client: Client): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  doc.setFillColor(6, 8, 13);
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('CONEXTSOL', margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 180, 210);
  doc.text('AGENCY — COMMAND CENTRE', margin, 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth - margin, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 170, 200);
  doc.text(invoice.invoice_number, pageWidth - margin, 30, { align: 'right' });

  let y = 52;
  const statusColors: Record<Invoice['status'], [number, number, number]> = {
    paid: [16, 185, 129],
    unpaid: [250, 204, 21],
    overdue: [239, 68, 68],
    draft: [148, 163, 184],
  };
  const [statusRed, statusGreen, statusBlue] = statusColors[invoice.status];

  doc.setFillColor(statusRed, statusGreen, statusBlue);
  doc.roundedRect(margin, y - 5, 28, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(invoice.status.toUpperCase(), margin + 14, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Issued: ${invoice.issued_date}`, margin + 34, y);
  doc.text(`Due: ${invoice.due_date}`, margin + 80, y);
  if (invoice.paid_at) {
    doc.text(`Paid: ${invoice.paid_at.split('T')[0]}`, margin + 120, y);
  }

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 140, 160);
  doc.text('BILL TO', margin, y);

  y += 5;
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(client.company_name, margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(client.primary_contact_name, margin, y);
  y += 5;
  doc.text(client.email, margin, y);
  if (client.phone) {
    y += 5;
    doc.text(client.phone, margin, y);
  }

  y += 12;
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: invoice.line_items.map(lineItem => [
      lineItem.description,
      lineItem.quantity.toString(),
      formatCurrency(lineItem.unit_price),
      formatCurrency(lineItem.amount),
    ]),
    headStyles: {
      fillColor: [11, 15, 25],
      textColor: [100, 180, 210],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
    theme: 'striped',
  });

  const finalY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  const totalsX = pageWidth - margin - 70;
  let totalOffset = 0;

  const drawTotal = (
    label: string,
    value: string,
    bold = false,
    color: [number, number, number] = [60, 60, 60]
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(...color);
    doc.text(label, totalsX, finalY + totalOffset);
    doc.text(value, pageWidth - margin, finalY + totalOffset, { align: 'right' });
    totalOffset += 6;
  };

  drawTotal('Subtotal', formatCurrency(invoice.subtotal));
  drawTotal(`VAT (${invoice.tax_rate}%)`, formatCurrency(invoice.tax_amount));

  const separatorY = finalY + totalOffset - 2;
  doc.setDrawColor(200, 210, 220);
  doc.line(totalsX, separatorY, pageWidth - margin, separatorY);
  totalOffset += 2;
  drawTotal('TOTAL DUE', formatCurrency(invoice.total), true, [6, 182, 212]);

  if (invoice.payment_notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 150);
    doc.text(`Payment note: ${invoice.payment_notes}`, margin, finalY + totalOffset + 6);
  }

  const footerY = pageHeight - 14;
  doc.setFillColor(6, 8, 13);
  doc.rect(0, footerY - 4, pageWidth, 20, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 120, 140);
  doc.text('Conextsol Agency · conextsol.com', margin, footerY + 4);
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-ZA')} · ${invoice.invoice_number}`,
    pageWidth - margin,
    footerY + 4,
    { align: 'right' }
  );

  doc.save(`${invoice.invoice_number}_${client.company_name.replace(/\s+/g, '_')}.pdf`);
}