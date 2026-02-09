'use client';

import { FearGreedData } from '@/types/stock';

interface FearGreedGaugeProps {
  data: FearGreedData;
}

export function FearGreedGauge({ data }: FearGreedGaugeProps) {
  const { value, classification } = data;

  // 0 = Extreme Fear, 100 = Extreme Greed
  // 게이지 각도: 0도(왼쪽) ~ 180도(오른쪽)
  const angle = (value / 100) * 180;

  // 색상 결정
  const getColor = (v: number) => {
    if (v <= 20) return '#dc2626'; // Extreme Fear - red
    if (v <= 40) return '#ea580c'; // Fear - orange
    if (v <= 60) return '#eab308'; // Neutral - yellow
    if (v <= 80) return '#65a30d'; // Greed - lime
    return '#16a34a'; // Extreme Greed - green
  };

  const getLabel = (cls: string) => {
    const map: Record<string, string> = {
      'Extreme Fear': '극단적 공포',
      'Fear': '공포',
      'Neutral': '중립',
      'Greed': '탐욕',
      'Extreme Greed': '극단적 탐욕',
    };
    return map[cls] || cls;
  };

  const color = getColor(value);

  // SVG 반원형 게이지
  const cx = 100;
  const cy = 90;
  const r = 70;

  // 바늘 끝점 계산 (각도를 라디안으로)
  const needleAngle = (180 - angle) * (Math.PI / 180);
  const needleX = cx + (r - 10) * Math.cos(needleAngle);
  const needleY = cy - (r - 10) * Math.sin(needleAngle);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-full max-w-[240px]">
        {/* 배경 반원 */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted/30"
          strokeLinecap="round"
        />
        {/* 그라디언트 반원 - 5개 구간 */}
        {[
          { start: 0, end: 36, color: '#dc2626' },
          { start: 36, end: 72, color: '#ea580c' },
          { start: 72, end: 108, color: '#eab308' },
          { start: 108, end: 144, color: '#65a30d' },
          { start: 144, end: 180, color: '#16a34a' },
        ].map((seg, i) => {
          const startAngle = (180 - seg.start) * (Math.PI / 180);
          const endAngle = (180 - seg.end) * (Math.PI / 180);
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy - r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy - r * Math.sin(endAngle);
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeLinecap="butt"
              opacity={0.7}
            />
          );
        })}
        {/* 바늘 */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="4" fill={color} />
        {/* 수치 */}
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          className="fill-foreground text-2xl font-bold"
          fontSize="28"
        >
          {value}
        </text>
      </svg>
      <span className="text-sm font-medium mt-1" style={{ color }}>
        {getLabel(classification)}
      </span>
      <span className="text-xs text-muted-foreground">Fear &amp; Greed Index</span>
    </div>
  );
}
