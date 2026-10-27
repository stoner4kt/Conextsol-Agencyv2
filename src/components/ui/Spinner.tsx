/**
 * Spinner — inline loading indicator for buttons.
 * Matches the dashboard's existing border-t-cyan-400 loader pattern.
 */
interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 14, className = '' }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      className={`animate-spin shrink-0 ${className}`}
      aria-hidden="true"
    >
      <circle
        cx="7"
        cy="7"
        r="5.5"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M7 1.5A5.5 5.5 0 0 1 12.5 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
