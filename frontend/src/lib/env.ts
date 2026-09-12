// Runtime env access that works both in `astro dev` (Vite loads .env into
// import.meta.env) and in the standalone Node server (process.env).
export function getEnv(key: string, fallback = ""): string {
  const fromProcess = typeof process !== "undefined" ? process.env[key] : undefined;
  if (fromProcess !== undefined && fromProcess !== "") return fromProcess;
  const fromImport = (import.meta.env as Record<string, string | undefined>)[key];
  return fromImport ?? fallback;
}
