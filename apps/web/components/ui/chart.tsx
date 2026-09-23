"use client";

import { useState } from "react";
import { formatTomanUnit } from "@/lib/formatting/persian";

export const jalaliWeekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

type ChartColor = "primary" | "income" | "expense" | "brand";
export type ChartType = "line" | "bar";

export interface ChartDatum {
  label: string;
  [key: string]: string | number;
}

export interface ChartSeries {
  key: string;
  label: string;
  color: ChartColor;
}

interface Point {
  x: number;
  y: number;
  value: number;
}

const chartColors: Record<ChartColor, string> = {
  primary: "var(--primary)",
  income: "var(--color-income)",
  expense: "var(--color-expense)",
  brand: "var(--brand)",
};

const compactNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

function formatCompactToman(value: number): string {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (absolute >= 1_000_000_000) return `${sign}${compactNumber.format(absolute / 1_000_000_000)} میلیارد تومان`;
  if (absolute >= 1_000_000) return `${sign}${compactNumber.format(absolute / 1_000_000)} میلیون تومان`;
  if (absolute >= 1_000) return `${sign}${compactNumber.format(absolute / 1_000)} هزار تومان`;
  return formatTomanUnit(value);
}

function niceStep(rawStep: number): number {
  const power = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / power;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return factor * power;
}

function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min - 1, min, min + 1];
  const step = niceStep((max - min) / Math.max(count - 1, 1));
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= end + step / 10; value += step) {
    ticks.push(Number(value.toFixed(8)));
  }
  return ticks;
}

function pathFor(points: Point[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function Chart({
  data,
  series,
  type = "line",
  label = "نمودار روند مالی",
}: {
  data: ChartDatum[];
  series: ChartSeries[];
  type?: ChartType;
  label?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const width = 720;
  const height = 300;
  const pad = { top: 24, end: 88, bottom: 48, start: 16 };
  const plotWidth = width - pad.start - pad.end;
  const plotHeight = height - pad.top - pad.bottom;
  const values = data.flatMap((datum) => series.map((item) => Number(datum[item.key] ?? 0)));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const ticks = niceTicks(minValue, maxValue);
  const domainMin = ticks[0] ?? 0;
  const domainMax = ticks[ticks.length - 1] ?? 1;
  const domainRange = domainMax - domainMin || 1;
  const slot = plotWidth / Math.max(data.length, 1);
  const tooltipHeight = 34 + series.length * 18;
  const xFor = (index: number) => width - pad.end - (index + 1) * slot;
  const yFor = (value: number) => pad.top + ((domainMax - value) / domainRange) * plotHeight;
  const baseline = yFor(0);
  const pointsFor = (key: string) =>
    data.map((datum, index) => ({
      x: xFor(index),
      y: yFor(Number(datum[key] ?? 0)),
      value: Number(datum[key] ?? 0),
    }));
  const activeDatum = activeIndex === null ? null : data[activeIndex];
  const activePointY =
    activeIndex === null || series[0] === undefined
      ? pad.top
      : yFor(Number(data[activeIndex]?.[series[0].key] ?? 0));

  return (
    <div dir="rtl" className="w-full overflow-hidden" onPointerLeave={() => setActiveIndex(null)}>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {series.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: chartColors[item.color] }}
              aria-hidden
            />
            {item.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="h-auto w-full overflow-hidden text-foreground"
        style={{ direction: "ltr" }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setActiveIndex(null);
        }}
      >
        {ticks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={pad.start}
                x2={width - pad.end}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="2 5"
              />
              <text
                x={width - pad.end - 8}
                y={y + 4}
                textAnchor="end"
                fill="var(--muted-foreground)"
                fontSize="11"
                direction="rtl"
              >
                {formatCompactToman(tick)}
              </text>
            </g>
          );
        })}

        {data.map((datum, index) => (
          <text
            key={`label-${datum.label}-${index}`}
            x={xFor(index)}
            y={height - 16}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="11"
            direction="rtl"
          >
            {chartXLabel(datum.label)}
          </text>
        ))}

        {series.map((item) => {
          const points = pointsFor(item.key);
          return (
            <g key={item.key}>
              {type === "line" && points.length > 1 ? (
                <path
                  d={pathFor(points)}
                  fill="none"
                  stroke={chartColors[item.color]}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {type === "bar"
                ? points.map((point, index) => {
                    const barWidth = Math.min(32, slot * 0.58);
                    const top = Math.min(point.y, baseline);
                    return (
                      <rect
                        key={`${item.key}-bar-${index}`}
                        x={point.x - barWidth / 2}
                        y={top}
                        width={barWidth}
                        height={Math.max(Math.abs(point.y - baseline), 2)}
                        rx="var(--radius-md)"
                        fill={chartColors[item.color]}
                        opacity={activeIndex === index ? 1 : 0.82}
                      />
                    );
                  })
                : null}
              {points.map((point, index) => (
                <g key={`${item.key}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="9"
                    fill="transparent"
                    stroke="transparent"
                    strokeWidth="2"
                    tabIndex={0}
                    className="focus-visible:stroke-ring"
                    role="button"
                    aria-label={`${datumLabel(data[index], index)}، ${item.label}: ${formatTomanUnit(point.value)}`}
                    onPointerEnter={() => setActiveIndex(index)}
                    onFocus={() => setActiveIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") setActiveIndex(index);
                      if (event.key === "Escape") setActiveIndex(null);
                    }}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={activeIndex === index ? 5 : 3.5}
                    fill="var(--card)"
                    stroke={chartColors[item.color]}
                    strokeWidth="2"
                    pointerEvents="none"
                  />
                  <title>{`${datumLabel(data[index], index)}، ${item.label}: ${formatTomanUnit(point.value)}`}</title>
                </g>
              ))}
            </g>
          );
        })}

        {activeDatum && activeIndex !== null ? (
          <g pointerEvents="none">
            <line
              x1={xFor(activeIndex)}
              x2={xFor(activeIndex)}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 4"
              opacity="0.5"
            />
            <rect
              x={tooltipX(xFor(activeIndex), width, pad.start, pad.end)}
              y={tooltipY(activePointY, height, pad.top, pad.bottom, tooltipHeight)}
              width="190"
              height={tooltipHeight}
              rx="var(--radius-md)"
              fill="var(--popover)"
              stroke="var(--border)"
            />
            <text
              x={tooltipX(xFor(activeIndex), width, pad.start, pad.end) + 180}
              y={tooltipY(activePointY, height, pad.top, pad.bottom, tooltipHeight) + 18}
              textAnchor="end"
              fill="var(--popover-foreground)"
              fontSize="11"
              fontWeight="600"
              direction="rtl"
            >
              {datumLabel(activeDatum, activeIndex)}
            </text>
            {series.map((item, seriesIndex) => (
              <text
                key={item.key}
                x={tooltipX(xFor(activeIndex), width, pad.start, pad.end) + 180}
                y={tooltipY(activePointY, height, pad.top, pad.bottom, tooltipHeight) + 36 + seriesIndex * 18}
                textAnchor="end"
                fill={chartColors[item.color]}
                fontSize="10"
                direction="rtl"
              >
                {`${item.label}: ${formatTomanUnit(Number(activeDatum[item.key] ?? 0))}`}
              </text>
            ))}
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function datumLabel(datum: ChartDatum | undefined, index: number): string {
  return datum?.label ?? `نقطه ${index + 1}`;
}

function chartXLabel(label: string): string {
  const parts = label.trim().split(/\s+/);
  return parts.length > 1 && /^[0-9۰-۹]/.test(parts[parts.length - 1] ?? "")
    ? parts.slice(0, -1).join(" ")
    : label;
}

function tooltipX(x: number, width: number, start: number, end: number): number {
  const tooltipWidth = 190;
  return Math.max(start, Math.min(x - tooltipWidth / 2, width - end - tooltipWidth));
}

function tooltipY(y: number, height: number, top: number, bottom: number, tooltipHeight: number): number {
  const preferred = y < height / 2 ? y + 16 : y - tooltipHeight - 16;
  return Math.max(top, Math.min(preferred, height - bottom - tooltipHeight));
}
