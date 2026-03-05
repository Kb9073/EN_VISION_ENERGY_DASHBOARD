import axios, { type AxiosInstance } from "axios"
import config from "@/lib/config"

/**
 * Singleton Axios instance for all EN-VISION API calls.
 * Base URL and timeout are driven by environment config.
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    "Content-Type": "application/json",
  },
})

// Log errors in development only
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error.message ||
      "Unknown API error"

    // Skip logging 404s — endpoint may not be implemented yet
    if (!config.isProduction && status !== 404 && status !== undefined) {
      console.error(
        `[API ${status ?? "ERR"}] ${error.config?.url ?? ""}:`,
        message
      )
    }

    return Promise.reject(error)
  }
)

const client = {
  get: async <T>(
    url: string,
    params?: Record<string, unknown>,
    _options?: { showErrors?: boolean }
  ): Promise<T> => {
    const response = await axiosInstance.get<T>(url, { params })
    return response.data
  },
}

export default client