import React from 'react';

export const PinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M9 10v7h6v-7l2-2V3H7v5l2 2Z" />
    <line x1="7" y1="3" x2="17" y2="3" />
  </svg>
);