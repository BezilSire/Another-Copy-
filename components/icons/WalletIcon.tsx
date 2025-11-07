import React from 'react';

export const WalletIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <path d="M20 12V8H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
    <path d="M4 6v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V12" />
    <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2a2 2 0 1 0 0-4z" />
  </svg>
);
