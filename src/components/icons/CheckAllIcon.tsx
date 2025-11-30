
import React from 'react';

export const CheckAllIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
    <path d="m15 4 6.7 6.7" />
    <path d="m19 6.7-6.7 6.7" />
    {/* Simplified double check representation */}
    <path d="M7 12l5 5L22 7" />
    <path d="M2 12l5 5m5-5l5-5" transform="translate(-5, 0)" opacity="0.5"/> 
  </svg>
);
