import React from 'react';

interface DonutChartProps {
  data: {
    label: string;
    value: number;
    color: string;
  }[];
  centerText: React.ReactNode;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, centerText }) => {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 80;
  const strokeWidth = 25;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let cumulativePercentage = 0;

  if (totalValue === 0) {
    // Render a simple grey circle if there's no data
    return (
      <div className="relative w-48 h-48">
        <svg viewBox="-100 -100 200 200" className="w-full h-full transform -rotate-90">
          <circle
            cx="0"
            cy="0"
            r={innerRadius}
            fill="transparent"
            stroke="#334155" // slate-700
            strokeWidth={strokeWidth}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerText}
        </div>
      </div>
    );
  }
  
  const segments = data.map(item => {
    const percentage = item.value / totalValue;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativePercentage * circumference;
    cumulativePercentage += percentage;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset
    };
  });


  return (
    <div className="relative w-48 h-48">
      <svg viewBox="-100 -100 200 200" className="w-full h-full transform -rotate-90">
        <circle
            cx="0"
            cy="0"
            r={innerRadius}
            fill="transparent"
            stroke="#334155"
            strokeWidth={strokeWidth}
        />
        {segments.map((segment) => (
           <circle
              key={segment.label}
              cx="0"
              cy="0"
              r={innerRadius}
              fill="transparent"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={segment.strokeDasharray}
              strokeDashoffset={segment.strokeDashoffset}
              strokeLinecap="round"
            />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {centerText}
      </div>
    </div>
  );
};