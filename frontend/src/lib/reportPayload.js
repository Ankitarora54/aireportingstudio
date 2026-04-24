const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function buildReportPayload({
  portfolio,
  commentary = '',
  fundName = 'Fund Report',
  reportPeriod = 'Monthly',
  fundObjective = '',
  brandName = 'AI Reporting Studio',
}) {
  if (!portfolio) {
    return null;
  }

  return {
    ...portfolio,
    metrics: {
      avg_return: toNumber(portfolio.metrics?.avg_return),
      total_return: toNumber(portfolio.metrics?.total_return),
      top_stock: portfolio.metrics?.top_stock || 'N/A',
      top_return: toNumber(portfolio.metrics?.top_return),
      worst_stock: portfolio.metrics?.worst_stock || 'N/A',
      worst_return: toNumber(portfolio.metrics?.worst_return),
    },
    riskMetrics: {
      volatility: toNumber(portfolio.riskMetrics?.volatility),
      sharpe_ratio: toNumber(portfolio.riskMetrics?.sharpe_ratio),
    },
    benchmarkData: {
      benchmark_return: toNumber(portfolio.benchmarkData?.benchmark_return),
      alpha: toNumber(portfolio.benchmarkData?.alpha),
    },
    peerData: {
      peer_1_return: toNumber(portfolio.peerData?.peer_1_return),
      peer_2_return: toNumber(portfolio.peerData?.peer_2_return),
      peer_average: toNumber(portfolio.peerData?.peer_average),
      relative_vs_peers: toNumber(portfolio.peerData?.relative_vs_peers),
    },
    allocation: Array.isArray(portfolio.allocation) ? portfolio.allocation : [],
    sectorPerformance: Array.isArray(portfolio.sectorPerformance) ? portfolio.sectorPerformance : [],
    topHoldings: Array.isArray(portfolio.topHoldings) ? portfolio.topHoldings : [],
    rows: Array.isArray(portfolio.rows) ? portfolio.rows : [],
    commentary: commentary || 'Commentary has not been generated yet.',
    fundName,
    reportPeriod,
    fundObjective,
    brandName,
  };
}
