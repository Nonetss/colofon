import { createLogger } from "@nonete/logger/factory"

export const logger = createLogger({
  service: "frontend",
  level: "info",
  production: import.meta.env.PROD,
})
