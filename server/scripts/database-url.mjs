function withSslIfNeeded(url) {
  if (url.includes("render.com") && !url.includes("sslmode=")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}sslmode=require`;
  }

  return url;
}

export function getDatabaseUrl() {
  const external = process.env.EXTERNAL_CLOUD_DATABASE_URL;
  if (external) {
    return withSslIfNeeded(external);
  }

  const internal = process.env.INTERNAL_CLOUD_DATABASE_URL;
  if (internal) {
    return internal;
  }

  const host = process.env.CLOUD_DATABASE_HOSTNAME;
  const user = process.env.CLOUD_DATABASE_USER;
  const password = process.env.CLOUD_DATABASE_PASSWORD;
  const database = process.env.CLOUD_DATABASE_NAME;
  const port = process.env.CLOUD_DATABASE_PORT ?? "5432";

  if (host && user && password && database) {
    return withSslIfNeeded(
      `postgresql://${user}:${password}@${host}:${port}/${database}`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return databaseUrl;
  }

  throw new Error(
    "Database connection is not configured. Set EXTERNAL_CLOUD_DATABASE_URL or CLOUD_DATABASE_* variables.",
  );
}
