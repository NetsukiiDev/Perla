export const SPANISH_REGIONS = [
  "Andalucía",
  "Aragón",
  "Asturias",
  "Baleares",
  "Canarias",
  "Cantabria",
  "Castilla y León",
  "Castilla-La Mancha",
  "Cataluña",
  "Ceuta",
  "Comunidad Valenciana",
  "Extremadura",
  "Galicia",
  "La Rioja",
  "Madrid",
  "Melilla",
  "Murcia",
  "Navarra",
  "País Vasco",
] as const;

export type SpanishRegion = (typeof SPANISH_REGIONS)[number];

export function isSpanishRegion(value: string): value is SpanishRegion {
  return (SPANISH_REGIONS as readonly string[]).includes(value);
}
