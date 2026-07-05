import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalyticsData } from "./analytics-types";

const COLORS = {
  paslon: [
    [14, 165, 233],
    [245, 158, 11],
    [236, 72, 153],
    [16, 185, 129],
    [99, 102, 241],
  ] as const,
  golput: [148, 163, 184] as const,
  tidakSah: [239, 68, 68] as const,
  sah: [16, 185, 129] as const,
  pending: [245, 158, 11] as const,
  grid: [226, 232, 240] as const,
};

type RGB = readonly [number, number, number];

function paslonLabel(row: AnalyticsData["paslon"][number]) {
  return `Paslon ${row.nomor} — ${row.namaKetua} & ${row.namaWakil}`;
}

function formatDateTime(date: Date) {
  return date.toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function fileStamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function addPageHeader(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 16);
  doc.setDrawColor(...COLORS.grid);
  doc.line(14, 19, 196, 19);
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 14) {
    doc.addPage();
    return 24;
  }
  return y;
}

function drawVerticalBarChart(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    items: Array<{ label: string; value: number; color: RGB; display: string }>;
    maxValue?: number;
  }
): number {
  const { x, y, width, height, title, items } = opts;
  const maxValue =
    opts.maxValue ?? Math.max(...items.map((i) => i.value), 1);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x, y);

  const chartTop = y + 6;
  const chartBottom = chartTop + height;
  const chartLeft = x + 14;
  const chartRight = x + width - 8;
  const chartWidth = chartRight - chartLeft;

  doc.setDrawColor(...COLORS.grid);
  doc.line(chartLeft, chartBottom, chartRight, chartBottom);
  doc.line(chartLeft, chartTop, chartLeft, chartBottom);

  const slot = chartWidth / Math.max(items.length, 1);
  const barWidth = Math.min(slot * 0.55, 18);

  items.forEach((item, index) => {
    const center = chartLeft + slot * index + slot / 2;
    const barHeight = (item.value / maxValue) * (height - 18);
    const barX = center - barWidth / 2;
    const barY = chartBottom - barHeight;

    doc.setFillColor(...item.color);
    doc.rect(barX, barY, barWidth, barHeight, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(item.display, center, barY - 2, { align: "center" });

    doc.setFontSize(8);
    const labelLines = doc.splitTextToSize(item.label, slot - 2);
    doc.text(labelLines, center, chartBottom + 4, { align: "center" });
  });

  return chartBottom + 18;
}

function drawHorizontalBarChart(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    width: number;
    title: string;
    items: Array<{ label: string; value: number; max: number; color: RGB; display: string }>;
  }
): number {
  const { x, y, width, title, items } = opts;
  const labelWidth = 42;
  const valueWidth = 22;
  const barArea = width - labelWidth - valueWidth - 4;
  const barHeight = 7;
  const gap = 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  if (title) doc.text(title, x, y);

  let cy = title ? y + 8 : y;
  for (const item of items) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(item.label, x, cy + 5);

    const barX = x + labelWidth;
    doc.setFillColor(...COLORS.grid);
    doc.rect(barX, cy, barArea, barHeight, "F");

    const fill = item.max > 0 ? (item.value / item.max) * barArea : 0;
    doc.setFillColor(...item.color);
    doc.rect(barX, cy, fill, barHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(item.display, barX + barArea + 3, cy + 5);

    cy += barHeight + gap;
  }

  return cy + 4;
}

function drawLegendPieSummary(
  doc: jsPDF,
  opts: {
    x: number;
    y: number;
    width: number;
    title: string;
    items: Array<{ label: string; value: number; color: RGB; percent: number }>;
  }
): number {
  const { x, y, width, title, items } = opts;
  const total = items.reduce((sum, i) => sum + i.value, 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x, y);

  let cy = y + 10;
  for (const item of items) {
    doc.setFillColor(...item.color);
    doc.circle(x + 3, cy - 1.5, 2.5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `${item.label}: ${item.value} (${total > 0 ? item.percent.toFixed(1) : "0.0"}%)`,
      x + 8,
      cy
    );
    cy += 7;
  }

  const barItems = items.map((item) => ({
    label: item.label,
    value: item.value,
    max: total,
    color: item.color,
    display: String(item.value),
  }));

  return drawHorizontalBarChart(doc, {
    x,
    y: cy + 2,
    width,
    title: "",
    items: barItems,
  });
}

export function exportAnalyticsPdf(data: AnalyticsData) {
  const generatedAt = new Date();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("Laporan Hasil Pemilihan", 105, 28, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(14, 165, 233);
  doc.text("HIMATRIS — Live Counting", 105, 36, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Reorganisasi Periode 2025/2026 → 2026/2027", 105, 44, {
    align: "center",
  });
  doc.text(`Dicetak: ${formatDateTime(generatedAt)}`, 105, 51, {
    align: "center",
  });

  doc.setDrawColor(...COLORS.grid);
  doc.line(14, 58, 196, 58);

  autoTable(doc, {
    startY: 64,
    head: [["Ringkasan", "Jumlah", "Persentase"]],
    body: [
      ["Total mahasiswa terdaftar", String(data.mahasiswa.total), "100%"],
      [
        "Sudah memilih",
        String(data.mahasiswa.sudahMemilih),
        `${data.mahasiswa.turnout}%`,
      ],
      [
        "Golput (belum memilih)",
        String(data.golput.total),
        `${data.golput.percent}%`,
      ],
      ["Total suara masuk", String(data.votes.total), "—"],
      ["Suara SAH", String(data.votes.sah), "—"],
      ["Suara pending", String(data.votes.pending), "—"],
      [
        "Suara tidak sah",
        String(data.votes.tidakSah),
        `${data.votes.tidakSahPercent}%`,
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2.5 },
    margin: { left: 14, right: 14 },
  });

  const afterSummary =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 120;

  autoTable(doc, {
    startY: afterSummary + 8,
    head: [["Paslon", "Calon", "Suara SAH", "% dari SAH", "% dari mahasiswa"]],
    body: [
      ...data.paslon.map((p) => [
        `Paslon ${p.nomor}`,
        `${p.namaKetua} & ${p.namaWakil}`,
        String(p.total),
        `${p.percent}%`,
        `${p.percentOfMahasiswa}%`,
      ]),
      [
        "Golput",
        "Mahasiswa belum memilih",
        String(data.golput.total),
        "—",
        `${data.golput.percent}%`,
      ],
      [
        "Tidak SAH",
        "Suara tidak sah",
        String(data.votes.tidakSah),
        "—",
        `${data.votes.tidakSahPercent}%`,
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center" },
    },
    margin: { left: 14, right: 14 },
  });

  doc.addPage();
  addPageHeader(doc, "Grafik & Visualisasi Data");

  let chartY = 28;
  const chartWidth = 182;

  chartY = drawVerticalBarChart(doc, {
    x: 14,
    y: chartY,
    width: chartWidth,
    height: 52,
    title: "Grafik Total Suara SAH per Paslon",
    items: data.paslon.map((p, i) => ({
      label: `P${p.nomor}`,
      value: p.total,
      color: COLORS.paslon[i % COLORS.paslon.length],
      display: String(p.total),
    })),
  });

  chartY = ensureSpace(doc, chartY + 4, 70);
  chartY = drawVerticalBarChart(doc, {
    x: 14,
    y: chartY,
    width: chartWidth,
    height: 52,
    title: "Grafik Persentase Suara SAH per Paslon",
    maxValue: 100,
    items: data.paslon.map((p, i) => ({
      label: `P${p.nomor}`,
      value: p.percent,
      color: COLORS.paslon[i % COLORS.paslon.length],
      display: `${p.percent}%`,
    })),
  });

  chartY = ensureSpace(doc, chartY + 4, 55);
  drawHorizontalBarChart(doc, {
    x: 14,
    y: chartY,
    width: chartWidth,
    title: "Grafik Persentase dari Total Mahasiswa (Paslon, Golput, Tidak SAH)",
    items: [
      ...data.paslon.map((p, i) => ({
        label: `Paslon ${p.nomor}`,
        value: p.percentOfMahasiswa,
        max: 100,
        color: COLORS.paslon[i % COLORS.paslon.length],
        display: `${p.percentOfMahasiswa}%`,
      })),
      {
        label: "Golput",
        value: data.golput.percent,
        max: 100,
        color: COLORS.golput,
        display: `${data.golput.percent}%`,
      },
      {
        label: "Tidak SAH",
        value: data.votes.tidakSahPercent,
        max: 100,
        color: COLORS.tidakSah,
        display: `${data.votes.tidakSahPercent}%`,
      },
    ],
  });

  doc.addPage();
  addPageHeader(doc, "Status Suara & Partisipasi");

  drawLegendPieSummary(doc, {
    x: 14,
    y: 28,
    width: 88,
    title: "Status Suara",
    items: [
      {
        label: "Pending",
        value: data.votes.pending,
        color: COLORS.pending,
        percent:
          data.votes.total > 0
            ? Math.round((data.votes.pending / data.votes.total) * 1000) / 10
            : 0,
      },
      {
        label: "SAH",
        value: data.votes.sah,
        color: COLORS.sah,
        percent:
          data.votes.total > 0
            ? Math.round((data.votes.sah / data.votes.total) * 1000) / 10
            : 0,
      },
      {
        label: "Tidak SAH",
        value: data.votes.tidakSah,
        color: COLORS.tidakSah,
        percent:
          data.votes.total > 0
            ? Math.round((data.votes.tidakSah / data.votes.total) * 1000) / 10
            : 0,
      },
    ],
  });

  drawLegendPieSummary(doc, {
    x: 108,
    y: 28,
    width: 88,
    title: "Partisipasi Mahasiswa",
    items: [
      {
        label: "Sudah memilih",
        value: data.mahasiswa.sudahMemilih,
        color: COLORS.sah,
        percent: data.mahasiswa.turnout,
      },
      {
        label: "Golput",
        value: data.golput.total,
        color: COLORS.golput,
        percent: data.golput.percent,
      },
    ],
  });

  autoTable(doc, {
    startY: 95,
    head: [["Antrian Pending (Cek Otomatis)", "Jumlah"]],
    body: [
      ["Layak diverifikasi", String(data.pendingEligibility.eligible)],
      [
        "NIM tidak terdaftar",
        String(data.pendingEligibility.nimTidakTerdaftar),
      ],
      ["Sudah memilih (double)", String(data.pendingEligibility.sudahMemilih)],
    ],
    theme: "grid",
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });

  autoTable(doc, {
    startY: 130,
    head: [["Detail Paslon", "Informasi"]],
    body: data.paslon.map((p) => [
      paslonLabel(p),
      `${p.total} suara SAH · ${p.percent}% dari SAH · ${p.percentOfMahasiswa}% dari mahasiswa`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2.5 },
    margin: { left: 14, right: 14 },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Halaman ${i} / ${pageCount}`, 196, 287, { align: "right" });
    doc.text("Live Counting HIMATRIS", 14, 287);
  }

  doc.save(`hasil-pemilu-himatris-${fileStamp(generatedAt)}.pdf`);
}
