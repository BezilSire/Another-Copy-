import React from 'react';

export const LightbulbIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M15.09 16.05A6.47 6.47 0 0 1 12 18a6.47 6.47 0 0 1-3.09-2" />
    <path d="M9 12a3 3 0 0 1 6 0" />
    <path d="M12 2v6" />
    <path d="M5.64 5.64l1.41 1.41" />
    <path d="M16.95 7.05l1.41-1.41" />
  </svg>
);