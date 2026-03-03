import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatTime, calculateHours } from "./timezone";
import type { TimeEntry } from "./types";

interface PdfOptions {
  customerName: string;
  periodLabel: string;
  entries: TimeEntry[];
  groupByProject: boolean;
  logoPng?: string; // base64 data URI
}

export function generateTimeReport(options: PdfOptions): Uint8Array {
  const { customerName, periodLabel, entries, groupByProject, logoPng } =
    options;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Dark header bar
  doc.setFillColor(30, 41, 59); // slate-800 dark
  doc.rect(0, 0, pageWidth, 36, "F");

  // Logo in header
  if (logoPng) {
    doc.addImage(logoPng, "PNG", 14, 6, 29, 17);
  }

  // Title text in header bar
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const titleX = logoPng ? 48 : 14;
  doc.text("Job Summary", titleX, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 210);
  doc.text(`Generated ${new Date().toLocaleDateString("en-AU")}`, titleX, 26);

  // Reset text color
  doc.setTextColor(31, 41, 55);

  // Customer / period info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Customer: ${customerName}`, 14, 46);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: ${periodLabel}`, 14, 53);

  let yPos = 61;

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
      doc.setTextColor(79, 70, 229); // indigo
      doc.text(projectName, 14, yPos);
      doc.setTextColor(31, 41, 55);
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
        (sum, e) => sum + calculateHours(e.start_time, e.end_time, e.break_minutes ?? 0),
        0
      );
      grandTotal += subtotal;

      yPos =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 4;
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
      (sum, e) => sum + calculateHours(e.start_time, e.end_time, e.break_minutes ?? 0),
      0
    );

    const finalY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${total.toFixed(2)} hours`, 14, finalY);
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
