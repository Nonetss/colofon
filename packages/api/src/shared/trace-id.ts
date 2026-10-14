import { z } from "zod"

/** An OpenTelemetry trace id as the apps log it and Tempo stores it. */
export const traceIdSchema = z
  .string()
  .regex(/^[0-9a-f]{32}$/, "Invalid trace id")
  .describe("Trace id: 32 lowercase hex characters")
