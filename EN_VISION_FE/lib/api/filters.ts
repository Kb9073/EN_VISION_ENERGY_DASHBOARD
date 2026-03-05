import client from "@/lib/api/client"
import config from "@/lib/config"
import type { StandardResponse } from "@/lib/api/dashboard"

export interface FilterOption {
  id: number
  name: string
}

/**
 * GET /dashboard/filters/departments?company_id=
 * Returns all departments for the active company.
 */
export async function getDepartments(): Promise<FilterOption[]> {
  try {
    const res = await client.get<StandardResponse<FilterOption[]>>(
      "/dashboard/filters/departments",
      { company_id: config.companyId }
    )
    return Array.isArray(res?.data) ? res.data : []
  } catch {
    return []
  }
}

/**
 * GET /dashboard/filters/devices?company_id=&department_id=
 * Returns devices, optionally scoped to a department.
 */
export async function getDevices(
  departmentId?: number | null
): Promise<FilterOption[]> {
  try {
    const params: Record<string, unknown> = {
      company_id: config.companyId,
    }
    if (departmentId) {
      params.department_id = departmentId
    }
    const res = await client.get<StandardResponse<FilterOption[]>>(
      "/dashboard/filters/devices",
      params
    )
    return Array.isArray(res?.data) ? res.data : []
  } catch {
    return []
  }
}