import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatTime, calculateHours } from "./timezone";
import type { TimeEntry } from "./types";

interface PdfOptions {
  customerName: string;
  periodLabel: string;
  entries: TimeEntry[];
  groupByProject: boolean;
}

export function generateTimeReport(options: PdfOptions): Uint8Array {
  const { customerName, periodLabel, entries, groupByProject } = options;
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Venix Time Tracker — Job Summary", 14, 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Customer: ${customerName}`, 14, 30);
  doc.text(`Period: ${periodLabel}`, 14, 37);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-AU")}`,
    14,
    44
  );

  let yPos = 52;

  // Sort entries by date then start_time
  const sorted = [...entries].sort((a, b) => {
    const dateCompare = a.entry_date.localeCompare(b.entry_date);
    if (dateCompare !== 0) return dateCompare;
    return a.start_time.localeCompare(b.start_time);
  });

  if (groupByProject) {
    // Group by project
    const grouped = new Map<string, TimeEntry[]>();
    for (const entry of sorted) {
      const projectName = entry.project?.name || "No Project";
      if (!grouped.has(projectName)) grouped.set(projectName, []);
      grouped.get(projectName)!.push(entry);
    }

    let grandTotal = 0;

    for (const [projectName, projectEntries] of grouped) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(projectName, 14, yPos);
      yPos += 4;

      const rows = projectEntries.map((e) => [
        formatDate(e.entry_date),
        formatTime(e.start_time),
        formatTime(e.end_time),
        e.contractor?.display_name || "",
        e.description || "",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Start", "Finish", "Contractor", "Description"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 18 },
          2: { cellWidth: 18 },
          3: { cellWidth: 30 },
          4: { cellWidth: "auto" },
        },
      });

      const subtotal = projectEntries.reduce(
        (sum, e) => sum + calculateHours(e.start_time, e.end_time),
        0
      );
      grandTotal += subtotal;

      yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Subtotal: ${subtotal.toFixed(2)} hours`, 14, yPos);
      yPos += 10;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${grandTotal.toFixed(2)} hours`, 14, yPos);
  } else {
    const rows = sorted.map((e) => [
      formatDate(e.entry_date),
      formatTime(e.start_time),
      formatTime(e.end_time),
      e.contractor?.display_name || "",
      e.description || "",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Start", "Finish", "Contractor", "Description"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 30 },
        4: { cellWidth: "auto" },
      },
    });

    const total = sorted.reduce(
      (sum, e) => sum + calculateHours(e.start_time, e.end_time),
      0
    );

    const finalY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${total.toFixed(2)} hours`, 14, finalY);
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
