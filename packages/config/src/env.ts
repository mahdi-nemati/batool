export interface EnvHelpers {
  requireString(name: string, env?: NodeJS.ProcessEnv): string;
  optionalString(name: string, env?: NodeJS.ProcessEnv): string | undefined;
  parsePort(name: string, fallback: number, env?: NodeJS.ProcessEnv): number;
  parseHttpOrigin(name: string, fallback: string, env?: NodeJS.ProcessEnv): string;
  isProduction(env?: NodeJS.ProcessEnv): boolean;
}

function source(env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return env ?? process.env;
}

export const env: EnvHelpers = {
  requireString(name, env) {
    const value = source(env)[name];
    if (value === undefined || value.length === 0) {
      throw new Error(`Environment variable ${name} is required`);
    }
    return value;
  },

  optionalString(name, env) {
    const value = source(env)[name];
    return value === undefined || value.length === 0 ? undefined : value;
  },

  parsePort(name, fallback, env) {
    const raw = source(env)[name] ?? String(fallback);
    const port = Number(raw);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error(`${name} must be a valid port number`);
    }
    return port;
  },

  parseHttpOrigin(name, fallback, env) {
    const value = source(env)[name] ?? fallback;
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${name} must be a valid http(s) origin`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`${name} must be a valid http(s) origin`);
    }
    return value.replace(/\/+$/, "");
  },

  isProduction(env) {
    return source(env).NODE_ENV === "production";
  },
};
