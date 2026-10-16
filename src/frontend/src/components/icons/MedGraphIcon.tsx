import React from 'react';

interface MedGraphIconProps {
  className?: string;
  size?: number;
}

/**
 * Constellation / Organic Node Cluster icon for MedGraph
 * Represents biological networks, differential associations, and pathways
 */
export const MedGraphIcon: React.FC<MedGraphIconProps> = ({ className = '', size = 18 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="8" r="3" />
      <circle cx="12" cy="18" r="3" />
      <path d="M8.5 7.5l7 1.5M7.5 8.5l3.5 7M16.5 10.5l-3.5 5" />
    </svg>
  );
};

