interface PearlIconProps {
  size?: number;
  className?: string;
}

// Simple brand mark for the "PERLA" wordmark — a glossy pearl (radial
// gradient sphere + a soft highlight), sized/aria'd like the lucide-react
// icons used everywhere else in the admin nav.
export function PearlIcon({ size = 16, className }: PearlIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="perla-pearl-gradient" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#d3d3da" />
          <stop offset="100%" stopColor="#8b8b96" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="9" fill="url(#perla-pearl-gradient)" />
      <ellipse cx="9" cy="8.5" rx="2.3" ry="1.5" fill="#ffffff" opacity="0.7" />
    </svg>
  );
}
