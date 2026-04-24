import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import KpiCard from '../components/dashboard/KpiCard';
import { buildReportPayload } from '../lib/reportPayload';

const COLORS = ['#6366F1', '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
const STORAGE_KEY = 'ai-reporting-studio:report-payload';

function readGlobalReportData() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.__REPORT_DATA__ || null;
}

function readStoredReportData() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export default function ReportPrint() {
  const location = useLocation();
  const [data, setData] = useState(() => location.state?.reportData || readGlobalReportData() || readStoredReportData());

  useEffect(() => {
    if (data) {
      window.__REPORT_READY__ = true;
      return;
    }

    const nextData = location.state?.reportData || readGlobalReportData() || readStoredReportData();
    if (nextData) {
      setData(nextData);
      window.__REPORT_READY__ = true;
    }
  }, [data, location.state]);

  const report = useMemo(() => {
    if (!data) {
      return null;
    }

    return buildReportPayload(data) || data;
  }, [data]);

  if (!report) {
    return <div className="min-h-screen bg-slate-950 p-10 text-white">No report data available for printing.</div>;
  }

  const {
    metrics,
    riskMetrics,
    benchmarkData,
    peerData,
    allocation,
    sectorPerformance,
    topHoldings,
    commentary,
    fundName,
    reportPeriod,
    brandName,
    fundObjective,
  } = report;

  return (
    <div className="min-h-screen bg-slate-950 p-10 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-3xl border border-white/10 bg-slate-900/70 p-8">
          <div className="text-sm uppercase tracking-[0.3em] text-indigo-300">{brandName}</div>
          <h1 className="mt-3 text-4xl font-bold">{fundName}</h1>
          <p className="mt-2 text-slate-300">{reportPeriod} report</p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">{fundObjective}</p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <KpiCard label="Average Return" value={formatPercent(metrics.avg_return)} />
          <KpiCard label="Total Return" value={formatPercent(metrics.total_return)} />
          <KpiCard label="Volatility" value={formatPercent(riskMetrics.volatility)} />
          <KpiCard label="Sharpe Ratio" value={Number(riskMetrics.sharpe_ratio || 0).toFixed(2)} />
          <KpiCard label="Top Performer" value={metrics.top_stock} sub={formatPercent(metrics.top_return)} />
          <KpiCard label="Worst Performer" value={metrics.worst_stock} sub={formatPercent(metrics.worst_return)} />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 text-xl font-semibold">Benchmark Overview</h2>
            <div className="space-y-3 text-slate-200">
              <div className="flex items-center justify-between rounded-2xl bg-slate-800/70 px-4 py-3">
                <span>Fund Return</span>
                <span>{formatPercent(metrics.avg_return)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-800/70 px-4 py-3">
                <span>Benchmark Return</span>
                <span>{formatPercent(benchmarkData.benchmark_return)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-800/70 px-4 py-3">
                <span>Alpha</span>
                <span>{formatPercent(benchmarkData.alpha)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-800/70 px-4 py-3">
                <span>Peer Average</span>
                <span>{formatPercent(peerData.peer_average)}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-xl font-semibold">Portfolio Allocation</h2>
            <div className="space-y-3">
              {allocation.map((item, index) => (
                <div key={`${item.name}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-200">
                    <span>{item.name}</span>
                    <span>{formatPercent(item.value)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(Number(item.value || 0), 100))}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 text-xl font-semibold">Sector Performance</h2>
            <div className="space-y-3">
              {sectorPerformance.map((sector, index) => (
                <div key={`${sector.name}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-200">
                    <span>{sector.name}</span>
                    <span>{formatPercent(sector.value)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(Number(sector.value || 0) * 10, 100))}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-xl font-semibold">Top Holdings</h2>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-3 gap-4 bg-slate-800/80 px-4 py-3 text-sm font-medium text-slate-200">
                <span>Stock</span>
                <span>Sector</span>
                <span className="text-right">Return</span>
              </div>
              {topHoldings.map((holding, index) => (
                <div
                  key={`${holding.stock}-${index}`}
                  className="grid grid-cols-3 gap-4 border-t border-white/10 px-4 py-3 text-sm text-slate-300"
                >
                  <span>{holding.stock}</span>
                  <span>{holding.sector}</span>
                  <span className="text-right">{formatPercent(holding.return)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-semibold">AI Commentary</h2>
          <div className="whitespace-pre-wrap leading-7 text-slate-200">{commentary}</div>
        </section>
      </div>
    </div>
  );
}
