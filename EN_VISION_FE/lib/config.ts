/**
 * EN-VISION Configuration
 * Source of truth for all environment-level constants.
 */

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000", 10),
  },
  /**
   * Active company context.
   * Every dashboard endpoint requires company_id as a query param.
   * In multi-tenant setup, replace with auth context / JWT claim.
   */
  companyId: parseInt(process.env.NEXT_PUBLIC_COMPANY_ID || "1", 10),
  env: process.env.NEXT_PUBLIC_ENV || "development",
  isDevelopment: process.env.NEXT_PUBLIC_ENV !== "production",
  isProduction: process.env.NEXT_PUBLIC_ENV === "production",
} as const

export default config