// MySQL and MariaDB share one Prisma provider ("mysql") but the two
// consumers disagree on the URI scheme:
//  - Prisma schema engine (migrate / db push) wants  mysql://
//  - the Node `mariadb` driver (runtime adapter + connection test) wants
//    mariadb:// and rejects mysql://
// So we accept either scheme from the user and normalize per consumer.

export function stripJdbcPrefix(url: string): string {
  return url.replace(/^jdbc:/i, "");
}

export function toPrismaMysqlUrl(url: string): string {
  return stripJdbcPrefix(url).replace(/^mariadb:\/\//i, "mysql://");
}

export function toMariadbDriverUrl(url: string): string {
  return stripJdbcPrefix(url).replace(/^mysql:\/\//i, "mariadb://");
}

export interface ConnectionParts {
  host: string;
  port?: number;
  user: string;
  password?: string;
  database: string;
}

const DEFAULT_PORT: Record<string, number> = {
  postgresql: 5432,
  mysql: 3306,
  mariadb: 3306,
  mongodb: 27017,
};

// Assembles a canonical connection URL from individual fields, URL-encoding
// the credentials/database so special characters (@ : / # ? …) don't break
// the URL. Postgres → postgresql://, MySQL/MariaDB → mysql:// (the mariadb
// driver scheme is applied later by toMariadbDriverUrl), MongoDB → mongodb://.
export function buildConnectionUrl(provider: string, parts: ConnectionParts): string {
  const scheme = provider === "postgresql" ? "postgresql" : provider === "mongodb" ? "mongodb" : "mysql";
  const port = parts.port ?? DEFAULT_PORT[provider] ?? 5432;
  const user = encodeURIComponent(parts.user);
  const auth = parts.password ? `${user}:${encodeURIComponent(parts.password)}` : user;
  const db = encodeURIComponent(parts.database);
  return `${scheme}://${auth}@${parts.host}:${port}/${db}`;
}
