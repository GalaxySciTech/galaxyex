"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { KlineInterval, Kline } from "@/lib/api-client";
import { fetchKlines } from "@/lib/api-client";

const INTERVALS: { label: string; value: KlineInterval }[] = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "4h", value: "4h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
];

type Props = {
  pair: string;
};

export function KlineChart({ pair }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts").createChart> | null>(null);
  const candleSeriesRef = useRef<ReturnType<ReturnType<typeof import("lightweight-charts").createChart>["addSeries"]> | null>(null);
  const volumeSeriesRef = useRef<ReturnType<ReturnType<typeof import("lightweight-charts").createChart>["addSeries"]> | null>(null);
  const [interval, setInterval_] = useState<KlineInterval>("1h");
  const [loading, setLoading] = useState(true);
  const [lcModule, setLcModule] = useState<typeof import("lightweight-charts") | null>(null);

  useEffect(() => {
    import("lightweight-charts").then(setLcModule);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !lcModule) return;

    const { createChart, CandlestickSeries, HistogramSeries, ColorType } = lcModule;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(51, 65, 85, 0.3)" },
        horzLines: { color: "rgba(51, 65, 85, 0.3)" },
      },
      crosshair: {
        vertLine: { color: "rgba(16, 185, 129, 0.3)", labelBackgroundColor: "#0f172a" },
        horzLine: { color: "rgba(16, 185, 129, 0.3)", labelBackgroundColor: "#0f172a" },
      },
      rightPriceScale: {
        borderColor: "rgba(51, 65, 85, 0.5)",
      },
      timeScale: {
        borderColor: "rgba(51, 65, 85, 0.5)",
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [lcModule]);

  const loadData = useCallback(async () => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    setLoading(true);
    try {
      const klines = await fetchKlines(pair, interval, 300);
      if (klines.length === 0) {
        setLoading(false);
        return;
      }

      const candleData = klines.map((k: Kline) => ({
        time: (k.time / 1000) as import("lightweight-charts").UTCTimestamp,
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      }));

      const volumeData = klines.map((k: Kline) => ({
        time: (k.time / 1000) as import("lightweight-charts").UTCTimestamp,
        value: k.volume,
        color: k.close >= k.open ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)",
      }));

      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);
      chartRef.current?.timeScale().fitContent();
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [pair, interval]);

  useEffect(() => {
    loadData();
    const id = globalThis.setInterval(loadData, 30_000);
    return () => globalThis.clearInterval(id);
  }, [loadData]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800">
        <span className="text-xs text-slate-400 mr-2">Interval</span>
        {INTERVALS.map((i) => (
          <button
            key={i.value}
            onClick={() => setInterval_(i.value)}
            className={`px-2 py-0.5 text-xs rounded transition ${
              interval === i.value
                ? "bg-emerald-500/20 text-emerald-400 font-medium"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>
      <div className="relative flex-1 min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900/50">
            <div className="text-xs text-slate-400 animate-pulse">Loading chart...</div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
