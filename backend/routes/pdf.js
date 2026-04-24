import express from 'express';
import PDFDocument from 'pdfkit';

const router = express.Router();

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 42,
};

const COLORS = {
  ink: '#0f172a',
  muted: '#475569',
  faint: '#94a3b8',
  line: '#dbe4f0',
  panel: '#f8fafc',
  panelAlt: '#eef4ff',
  indigo: '#4f46e5',
  violet: '#7c3aed',
  cyan: '#0891b2',
  emerald: '#059669',
  amber: '#d97706',
  red: '#dc2626',
};

const CHART_COLORS = [
  COLORS.indigo,
  COLORS.violet,
  COLORS.cyan,
  COLORS.emerald,
  COLORS.amber,
  COLORS.red,
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatPercent(value) {
  return `${toNumber(value).toFixed(2)}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawRoundedCard(doc, x, y, width, height, fill = COLORS.panel, stroke = COLORS.line) {
  doc.save();
  doc.roundedRect(x, y, width, height, 16).fillAndStroke(fill, stroke);
  doc.restore();
}

function drawHeader(doc, payload) {
  const width = PAGE.width - PAGE.margin * 2;
  const x = PAGE.margin;
  const y = PAGE.margin;

  doc.save();
  doc.roundedRect(x, y, width, 92, 22).fillAndStroke(COLORS.ink, '#1e293b');
  doc.restore();

  doc.fillColor('#c7d2fe').font('Helvetica-Bold').fontSize(10).text(payload.brandName || 'AI Reporting Studio', x + 20, y + 18, {
    width: width - 40,
    characterSpacing: 2,
  });

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(24).text(payload.fundName || 'Fund Factsheet', x + 20, y + 36, {
    width: width - 40,
  });

  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(11).text(`${payload.reportPeriod || 'Monthly'} report`, x + 20, y + 66);

  if (payload.fundObjective) {
    doc.fillColor('#64748b').fontSize(10).text(payload.fundObjective, x + 260, y + 18, {
      width: width - 280,
      align: 'left',
      height: 56,
      ellipsis: true,
    });
  }

  return y + 112;
}

function drawSectionTitle(doc, title, subtitle, x, y, width) {
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(17).text(title, x, y, { width });
  if (subtitle) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10).text(subtitle, x, y + 20, { width });
  }
}

function drawKpiGrid(doc, report, x, y, width) {
  const gap = 12;
  const cardWidth = (width - gap * 2) / 3;
  const cardHeight = 76;
  const entries = [
    ['Average Return', formatPercent(report.metrics?.avg_return)],
    ['Total Return', formatPercent(report.metrics?.total_return)],
    ['Volatility', formatPercent(report.riskMetrics?.volatility)],
    ['Sharpe Ratio', toNumber(report.riskMetrics?.sharpe_ratio).toFixed(2)],
    ['Top Performer', report.metrics?.top_stock || 'N/A', formatPercent(report.metrics?.top_return)],
    ['Worst Performer', report.metrics?.worst_stock || 'N/A', formatPercent(report.metrics?.worst_return)],
  ];

  entries.forEach(([label, value, subValue], index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const cardX = x + col * (cardWidth + gap);
    const cardY = y + row * (cardHeight + gap);

    drawRoundedCard(doc, cardX, cardY, cardWidth, cardHeight, '#ffffff', COLORS.line);
    doc.fillColor(COLORS.faint).font('Helvetica-Bold').fontSize(9).text(label, cardX + 14, cardY + 12, { width: cardWidth - 28 });
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(20).text(value, cardX + 14, cardY + 28, { width: cardWidth - 28 });
    if (subValue) {
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10).text(subValue, cardX + 14, cardY + 54, { width: cardWidth - 28 });
    }
  });

  return y + cardHeight * 2 + gap;
}

function drawBarChart(doc, { x, y, width, height, data, title, maxValue, colors = CHART_COLORS }) {
  drawRoundedCard(doc, x, y, width, height, '#ffffff', COLORS.line);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(13).text(title, x + 16, y + 14);

  const chartX = x + 16;
  const chartY = y + 42;
  const chartWidth = width - 32;
  const chartHeight = height - 64;
  const baselineY = chartY + chartHeight - 20;
  const chartMax = Math.max(maxValue || 0, ...data.map((item) => Math.abs(toNumber(item.value))), 1);
  const barGap = 12;
  const barWidth = (chartWidth - barGap * (data.length - 1)) / Math.max(data.length, 1);

  doc.strokeColor(COLORS.line).lineWidth(1).moveTo(chartX, baselineY).lineTo(chartX + chartWidth, baselineY).stroke();

  data.forEach((item, index) => {
    const value = toNumber(item.value);
    const normalizedHeight = (Math.abs(value) / chartMax) * (chartHeight - 46);
    const barX = chartX + index * (barWidth + barGap);
    const barY = baselineY - normalizedHeight;

    doc.save();
    doc.roundedRect(barX, barY, barWidth, normalizedHeight, 8).fill(colors[index % colors.length]);
    doc.restore();

    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9).text(formatPercent(value), barX, barY - 14, {
      width: barWidth,
      align: 'center',
    });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(item.name, barX - 4, baselineY + 8, {
      width: barWidth + 8,
      align: 'center',
    });
  });
}

function drawHorizontalBars(doc, { x, y, width, height, data, title, colors = CHART_COLORS, scale = 1 }) {
  drawRoundedCard(doc, x, y, width, height, '#ffffff', COLORS.line);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(13).text(title, x + 16, y + 14);

  const innerX = x + 16;
  let rowY = y + 42;
  const available = data.slice(0, 6);

  if (available.length === 0) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10).text('No data available.', innerX, rowY);
    return;
  }

  available.forEach((item, index) => {
    const value = toNumber(item.value);
    const widthPct = clamp(Math.abs(value) * scale, 0, 100);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9).text(item.name, innerX, rowY, { width: width - 120 });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(formatPercent(value), x + width - 70, rowY, { width: 50, align: 'right' });

    doc.save();
    doc.roundedRect(innerX, rowY + 14, width - 32, 10, 6).fill('#e2e8f0');
    doc.roundedRect(innerX, rowY + 14, (width - 32) * (widthPct / 100), 10, 6).fill(colors[index % colors.length]);
    doc.restore();

    rowY += 34;
  });
}

function drawAllocationDonut(doc, { x, y, width, height, data, title, colors = CHART_COLORS }) {
  drawRoundedCard(doc, x, y, width, height, '#ffffff', COLORS.line);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(13).text(title, x + 16, y + 14);

  if (!data.length) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10).text('No data available.', x + 16, y + 42);
    return;
  }

  const radius = 48;
  const centerX = x + 84;
  const centerY = y + 98;
  const total = data.reduce((sum, item) => sum + Math.max(toNumber(item.value), 0), 0) || 1;
  let startAngle = -Math.PI / 2;

  data.slice(0, 6).forEach((item, index) => {
    const value = Math.max(toNumber(item.value), 0);
    const angle = (value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;

    doc.save();
    doc.moveTo(centerX, centerY);
    doc.fillColor(colors[index % colors.length]);
    doc.arc(centerX, centerY, radius, startAngle, endAngle).lineTo(centerX, centerY).fill();
    doc.restore();

    startAngle = endAngle;
  });

  doc.save();
  doc.circle(centerX, centerY, 24).fill('#ffffff');
  doc.restore();

  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9).text('Alloc', centerX - 18, centerY - 6, { width: 36, align: 'center' });

  let legendY = y + 44;
  data.slice(0, 6).forEach((item, index) => {
    const legendX = x + 156;
    doc.save();
    doc.roundedRect(legendX, legendY + 2, 10, 10, 3).fill(colors[index % colors.length]);
    doc.restore();
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9).text(item.name, legendX + 16, legendY, {
      width: width - 190,
    });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(formatPercent(item.value), legendX + 16, legendY + 11, {
      width: width - 190,
    });
    legendY += 25;
  });
}

function drawTable(doc, { x, y, width, title, columns, rows }) {
  const headerHeight = 28;
  const rowHeight = 24;
  const height = 54 + headerHeight + Math.max(rows.length, 1) * rowHeight;

  drawRoundedCard(doc, x, y, width, height, '#ffffff', COLORS.line);
  doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(13).text(title, x + 16, y + 14);

  const tableX = x + 16;
  const tableY = y + 42;
  const innerWidth = width - 32;
  const colWidths = columns.map((column) => column.width * innerWidth);

  doc.save();
  doc.roundedRect(tableX, tableY, innerWidth, headerHeight, 10).fill(COLORS.panelAlt);
  doc.restore();

  let cursorX = tableX;
  columns.forEach((column, index) => {
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(9).text(column.label, cursorX + 8, tableY + 9, {
      width: colWidths[index] - 16,
      align: column.align || 'left',
    });
    cursorX += colWidths[index];
  });

  if (!rows.length) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(10).text('No data available.', tableX, tableY + 38);
    return height;
  }

  rows.forEach((row, rowIndex) => {
    const rowY = tableY + headerHeight + rowIndex * rowHeight;
    if (rowIndex % 2 === 0) {
      doc.save();
      doc.rect(tableX, rowY, innerWidth, rowHeight).fill('#f8fafc');
      doc.restore();
    }

    let cellX = tableX;
    columns.forEach((column, colIndex) => {
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(String(row[colIndex] ?? ''), cellX + 8, rowY + 8, {
        width: colWidths[colIndex] - 16,
        align: column.align || 'left',
      });
      cellX += colWidths[colIndex];
    });
  });

  return height;
}

function buildPdfBuffer(payload) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: PAGE.margin, left: PAGE.margin, right: PAGE.margin, bottom: PAGE.margin },
      bufferPages: true,
      info: {
        Title: `${payload.fundName || 'Fund Factsheet'} Report`,
        Author: payload.brandName || 'AI Reporting Studio',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const report = {
      metrics: payload.metrics || {},
      riskMetrics: payload.riskMetrics || {},
      benchmarkData: payload.benchmarkData || {},
      peerData: payload.peerData || {},
      allocation: Array.isArray(payload.allocation) ? payload.allocation : [],
      sectorPerformance: Array.isArray(payload.sectorPerformance) ? payload.sectorPerformance : [],
      topHoldings: Array.isArray(payload.topHoldings) ? payload.topHoldings : [],
      commentary: payload.commentary || 'Commentary has not been generated yet.',
    };

    const contentWidth = PAGE.width - PAGE.margin * 2;
    const columnGap = 14;
    const halfWidth = (contentWidth - columnGap) / 2;

    let y = drawHeader(doc, payload);

    drawSectionTitle(doc, 'Overview', 'Core fund performance summary and portfolio visuals.', PAGE.margin, y, contentWidth);
    y += 38;
    y = drawKpiGrid(doc, report, PAGE.margin, y, contentWidth) + 22;

    drawAllocationDonut(doc, {
      x: PAGE.margin,
      y,
      width: halfWidth,
      height: 170,
      data: report.allocation,
      title: 'Portfolio Allocation',
    });

    drawHorizontalBars(doc, {
      x: PAGE.margin + halfWidth + columnGap,
      y,
      width: halfWidth,
      height: 170,
      data: report.sectorPerformance,
      title: 'Sector Performance',
      scale: 10,
    });

    doc.addPage();

    y = drawHeader(doc, payload);
    drawSectionTitle(doc, 'Benchmark', 'Fund versus benchmark and peer comparison charts.', PAGE.margin, y, contentWidth);
    y += 38;

    drawBarChart(doc, {
      x: PAGE.margin,
      y,
      width: contentWidth,
      height: 230,
      title: 'Fund vs Benchmark vs Peers',
      data: [
        { name: 'Fund', value: report.metrics?.avg_return },
        { name: 'Benchmark', value: report.benchmarkData?.benchmark_return },
        { name: 'Peer 1', value: report.peerData?.peer_1_return },
        { name: 'Peer 2', value: report.peerData?.peer_2_return },
      ],
    });

    y += 248;

    drawHorizontalBars(doc, {
      x: PAGE.margin,
      y,
      width: halfWidth,
      height: 180,
      data: [
        { name: 'Alpha', value: report.benchmarkData?.alpha },
        { name: 'Peer Average', value: report.peerData?.peer_average },
        { name: 'Relative vs Peers', value: report.peerData?.relative_vs_peers },
      ],
      title: 'Relative Performance',
      scale: 12,
    });

    drawTable(doc, {
      x: PAGE.margin + halfWidth + columnGap,
      y,
      width: halfWidth,
      title: 'Benchmark Snapshot',
      columns: [
        { label: 'Metric', width: 0.62 },
        { label: 'Value', width: 0.38, align: 'right' },
      ],
      rows: [
        ['Fund Return', formatPercent(report.metrics?.avg_return)],
        ['Benchmark Return', formatPercent(report.benchmarkData?.benchmark_return)],
        ['Alpha', formatPercent(report.benchmarkData?.alpha)],
        ['Peer Average', formatPercent(report.peerData?.peer_average)],
        ['Relative vs Peers', formatPercent(report.peerData?.relative_vs_peers)],
      ],
    });

    doc.addPage();

    y = drawHeader(doc, payload);
    drawSectionTitle(doc, 'Commentary', 'Narrative summary supported by top-holding context.', PAGE.margin, y, contentWidth);
    y += 38;

    const tableHeight = drawTable(doc, {
      x: PAGE.margin,
      y,
      width: contentWidth,
      title: 'Top Holdings',
      columns: [
        { label: 'Stock', width: 0.36 },
        { label: 'Sector', width: 0.36 },
        { label: 'Return', width: 0.28, align: 'right' },
      ],
      rows: report.topHoldings.slice(0, 8).map((holding) => [
        holding.stock || 'N/A',
        holding.sector || 'N/A',
        formatPercent(holding.return),
      ]),
    });

    y += tableHeight + 18;

    const commentaryHeight = PAGE.height - PAGE.margin - y - 24;
    drawRoundedCard(doc, PAGE.margin, y, contentWidth, commentaryHeight, '#ffffff', COLORS.line);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(13).text('AI Commentary', PAGE.margin + 16, y + 14);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(11).text(report.commentary, PAGE.margin + 16, y + 40, {
      width: contentWidth - 32,
      height: commentaryHeight - 56,
      lineGap: 4,
      ellipsis: true,
    });

    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(i);
      doc.fillColor(COLORS.faint).font('Helvetica').fontSize(8).text(
        `Page ${i + 1} of ${range.count}`,
        PAGE.margin,
        PAGE.height - PAGE.margin + 8,
        { width: PAGE.width - PAGE.margin * 2, align: 'right' }
      );
    }

    doc.end();
  });
}

router.post('/generate', async (req, res) => {
  try {
    const hasStructuredData = req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0;
    if (!hasStructuredData) {
      return res.status(400).json({ error: 'Report data is required to generate a PDF.' });
    }

    const pdf = await buildPdfBuffer(req.body);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Content-Disposition': 'attachment; filename=factsheet.pdf',
    });
    res.end(pdf);
  } catch (err) {
    console.error('PDF ERROR:', err);
    res.status(500).json({ error: 'PDF generation failed.' });
  }
});

export default router;
