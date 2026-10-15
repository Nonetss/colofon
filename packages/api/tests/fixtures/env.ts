import { env } from "@nonete/env/server"

/**
 * The env every module sees: `tests/setup.ts` installs it as
 * `@nonete/env/server`. It starts as a copy of the validated placeholder env,
 * so the content source is off until a test turns it on.
 * Call `resetEnv()` in `beforeEach`.
 */
const initial = { ...env }

export const testEnv = { ...env }

export function resetEnv() {
  Object.assign(testEnv, initial, {
    CONTENT_DIR: undefined,
    CONTENT_REPO: undefined,
  })
}
