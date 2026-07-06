interface OpenLocationButtonProps {
  lat: number;
  lng: number;
}

// A universal https Maps link works across platforms (including iOS
// Safari, which offers to hand off to the native Maps app) without
// needing client-side UA sniffing.
export function OpenLocationButton({ lat, lng }: OpenLocationButtonProps) {
  const href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full rounded-lg bg-accent px-4 py-3 text-center font-medium text-accent-foreground"
    >
      Apri posizione
    </a>
  );
}
