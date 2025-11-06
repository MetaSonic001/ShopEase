import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportElementToPDF(el: HTMLElement, options?: { filename?: string; scale?: number }) {
  const filename = options?.filename || `export-${new Date().toISOString().slice(0,10)}.pdf`;
  const scale = options?.scale ?? 2;

  // Use html2canvas to capture the element
  const canvas = await html2canvas(el, { scale });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Calculate dimensions preserving aspect ratio
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 0;
  let heightLeft = imgHeight;

  // First page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  // Additional pages if content overflows
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

export function exportRowsToCSV(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
  filename?: string
) {
  const safe = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // Quote if contains delimiter, quote or newline
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const csv = [headers, ...rows].map(r => r.map(safe).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename || `export-${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
