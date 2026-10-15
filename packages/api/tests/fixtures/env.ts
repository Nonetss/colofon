import { env } from "@nonete/env/server"

/**
 * The env every module sees: `tests/setup.ts` installs it as
 * `@nonete/env/server`. It starts as a copy of the validated placeholder env,
 * so the integrations it gates (`LOKI_URL`, `TEMPO_URL`, the content source) are off until a test turns it on.
 * Call `resetEnv()` in `beforeEach`.
 */
const initial = { ...env }

export const testEnv = { ...env }

export function resetEnv() {
  Object.assign(testEnv, initial, {
    LOKI_URL: undefined,
    TEMPO_URL: undefined,
    CONTENT_DIR: undefined,
    CONTENT_REPO: undefined,
  })
}
