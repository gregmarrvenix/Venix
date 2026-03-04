import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatTime, calculateHours } from "./timezone";
import type { TimeEntry, Expense } from "./types";

interface PdfOptions {
  customerName: string;
  periodLabel: string;
  entries: TimeEntry[];
  groupByProject: boolean;
  logoPng?: string; // base64 data URI
}

export function generateTimeReport(options: PdfOptions): ArrayBuffer {
  const { customerName, periodLabel, entries, groupByProject, logoPng } =
    options;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const isAllCustomers = customerName === "All Customers";

  // Dark header bar
  doc.setFillColor(30, 41, 59); // slate-800 dark
  doc.rect(0, 0, pageWidth, 36, "F");

  // Logo in header
  if (logoPng) {
    doc.addImage(logoPng, "PNG", 14, 6, 29, 17);
  }

  // Title text in header bar
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const titleX = logoPng ? 48 : 14;
  doc.text(`Timesheet Data - ${periodLabel}`, titleX, 18);

  // Reset text color
  doc.setTextColor(31, 41, 55);

  // Customer info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Customer: ${customerName}`, 14, 46);

  let yPos = 54;

  // Sort entries by descending date, then descending start_time
  const sorted = [...entries].sort((a, b) => {
    const dateCompare = b.entry_date.localeCompare(a.entry_date);
    if (dateCompare !== 0) return dateCompare;
    return b.start_time.localeCompare(a.start_time);
  });

  if (isAllCustomers) {
    // Group by customer, then sort entries within each group by descending date
    const customerGroups = new Map<string, TimeEntry[]>();
    for (const entry of sorted) {
      const name = entry.customer?.name || "Unknown";
      if (!customerGroups.has(name)) customerGroups.set(name, []);
      customerGroups.get(name)!.push(entry);
    }

    let grandTotal = 0;

    for (const [custName, custEntries] of customerGroups) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229); // indigo
      doc.text(custName, 14, yPos);
      doc.setTextColor(31, 41, 55);
      yPos += 4;

      const rows = custEntries.map((e) => [
        formatDate(e.entry_date),
        e.project?.name || "",
        formatTime(e.start_time),
        formatTime(e.end_time),
        calculateHours(e.start_time, e.end_time, e.break_minutes ?? 0).toFixed(2),
        e.contractor?.display_name || "",
        e.description || "",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Project", "Start", "Finish", "Hours", "Contractor", "Description"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241], halign: "center" },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 28 },
          2: { cellWidth: 16 },
          3: { cellWidth: 16 },
          4: { cellWidth: 14 },
          5: { cellWidth: "wrap" },
          6: { cellWidth: "auto" },
        },
      });

      const subtotal = custEntries.reduce(
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
  } else if (groupByProject) {
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
        e.project?.name || "",
        formatTime(e.start_time),
        formatTime(e.end_time),
        calculateHours(e.start_time, e.end_time, e.break_minutes ?? 0).toFixed(2),
        e.contractor?.display_name || "",
        e.description || "",
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Project", "Start", "Finish", "Hours", "Contractor", "Description"]],
        body: rows,
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241], halign: "center" },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 28 },
          2: { cellWidth: 16 },
          3: { cellWidth: 16 },
          4: { cellWidth: 14 },
          5: { cellWidth: "wrap" },
          6: { cellWidth: "auto" },
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
    // Flat table with project column
    const rows = sorted.map((e) => [
      formatDate(e.entry_date),
      e.project?.name || "",
      formatTime(e.start_time),
      formatTime(e.end_time),
      calculateHours(e.start_time, e.end_time, e.break_minutes ?? 0).toFixed(2),
      e.contractor?.display_name || "",
      e.description || "",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Date", "Project", "Start", "Finish", "Hours", "Contractor", "Description"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [99, 102, 241], halign: "center" },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 16 },
        3: { cellWidth: 16 },
        4: { cellWidth: 14 },
        5: { cellWidth: "wrap" },
        6: { cellWidth: "auto" },
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

  return doc.output("arraybuffer");
}

interface ExpensePdfOptions {
  customerName: string;
  periodLabel: string;
  expenses: Expense[];
  groupByProject: boolean;
  logoPng?: string;
}

export function generateExpenseReport(options: ExpensePdfOptions): ArrayBuffer {
  const { customerName, periodLabel, expenses, groupByProject, logoPng } =
    options;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const isAllCustomers = customerName === "All Customers";

  // Dark header bar
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 36, "F");

  // Logo in header
  if (logoPng) {
    doc.addImage(logoPng, "PNG", 14, 6, 29, 17);
  }

  // Title text in header bar
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const titleX = logoPng ? 48 : 14;
  doc.text(`Expense Data - ${periodLabel}`, titleX, 18);

  // Reset text color
  doc.setTextColor(31, 41, 55);

  // Customer info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Customer: ${customerName}`, 14, 46);

  let yPos = 54;

  const sorted = [...expenses].sort((a, b) =>
    b.expense_date.localeCompare(a.expense_date)
  );

  const headRow = ["Date", "Project", "Amount", "Billable", "Contractor", "Description"];
  const colStyles = {
    0: { cellWidth: 22 },
    1: { cellWidth: 28 },
    2: { cellWidth: 20 },
    3: { cellWidth: 16 },
    4: { cellWidth: "wrap" as const },
    5: { cellWidth: "auto" as const },
  };

  function expenseRow(e: Expense) {
    return [
      formatDate(e.expense_date),
      e.project?.name || "",
      `$${Number(e.amount).toFixed(2)}`,
      e.is_billable ? "Yes" : "No",
      e.contractor?.display_name || "",
      e.description || "",
    ];
  }

  if (isAllCustomers) {
    const customerGroups = new Map<string, Expense[]>();
    for (const expense of sorted) {
      const name = expense.customer?.name || "Unknown";
      if (!customerGroups.has(name)) customerGroups.set(name, []);
      customerGroups.get(name)!.push(expense);
    }

    let grandTotal = 0;

    for (const [custName, custExpenses] of customerGroups) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(custName, 14, yPos);
      doc.setTextColor(31, 41, 55);
      yPos += 4;

      autoTable(doc, {
        startY: yPos,
        head: [headRow],
        body: custExpenses.map(expenseRow),
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241], halign: "center" },
        styles: { fontSize: 8 },
        columnStyles: colStyles,
      });

      const subtotal = custExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      grandTotal += subtotal;

      yPos =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 4;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 14, yPos);
      yPos += 10;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: $${grandTotal.toFixed(2)}`, 14, yPos);
  } else if (groupByProject) {
    const grouped = new Map<string, Expense[]>();
    for (const expense of sorted) {
      const projectName = expense.project?.name || "No Project";
      if (!grouped.has(projectName)) grouped.set(projectName, []);
      grouped.get(projectName)!.push(expense);
    }

    let grandTotal = 0;

    for (const [projectName, projectExpenses] of grouped) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(projectName, 14, yPos);
      doc.setTextColor(31, 41, 55);
      yPos += 4;

      autoTable(doc, {
        startY: yPos,
        head: [headRow],
        body: projectExpenses.map(expenseRow),
        theme: "grid",
        headStyles: { fillColor: [99, 102, 241], halign: "center" },
        styles: { fontSize: 8 },
        columnStyles: colStyles,
      });

      const subtotal = projectExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      grandTotal += subtotal;

      yPos =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 4;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 14, yPos);
      yPos += 10;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: $${grandTotal.toFixed(2)}`, 14, yPos);
  } else {
    autoTable(doc, {
      startY: yPos,
      head: [headRow],
      body: sorted.map(expenseRow),
      theme: "grid",
      headStyles: { fillColor: [99, 102, 241], halign: "center" },
      styles: { fontSize: 8 },
      columnStyles: colStyles,
    });

    const total = sorted.reduce((sum, e) => sum + Number(e.amount), 0);

    const finalY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: $${total.toFixed(2)}`, 14, finalY);
  }

  return doc.output("arraybuffer");
}
