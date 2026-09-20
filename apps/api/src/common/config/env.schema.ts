import { env } from "@batool/config";

export interface AppEnv {
  databaseUrl: string;
  apiPort: number;
  webOrigin: string;
  isProduction: boolean;
}

export function parseAppEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const isProduction = env.isProduction(source);
  return {
    databaseUrl: env.requireString("DATABASE_URL", source),
    apiPort: env.parsePort("API_PORT", 4000, source),
    webOrigin: env.parseHttpOrigin(
      "WEB_ORIGIN",
      isProduction ? "" : "http://localhost:3000",
      source,
    ),
    isProduction,
  };
}
