export function createLogger(component: string) {
  return {
    info: (...args: any[]) => console.log(`[INFO] [${component}]`, ...args),
    warn: (...args: any[]) => console.warn(`[WARN] [${component}]`, ...args),
    error: (...args: any[]) => console.error(`[ERROR] [${component}]`, ...args),
    debug: (...args: any[]) => console.debug(`[DEBUG] [${component}]`, ...args),
  };
}
