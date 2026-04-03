"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Bot, BrainCircuit, Building2, CalendarDays, CheckCircle2, ChevronDown, Cpu, LayoutDashboard, MessageSquare, MinusCircle, Send, Upload, X } from "lucide-react"

import type { FilterState, TimeRange } from "@/components/dashboard/filter-controls"
import { ingestParsedBill, scanElectricityBill, type BillScanResult } from "@/lib/api/dashboard"
import { useDepartments, useDevices } from "@/hooks/use-dashboard-data"
import { EndpointConfirmationModal, type ConfirmedEndpointValues } from "@/components/dashboard/bill-parser/endpoint-confirmation-modal"

interface BillSideChatProps {
  preferredDeviceId?: number | null
  filters: FilterState
  onFiltersChange?: (next: FilterState) => void
  kpiSnapshot?: {
    totalKwh?: number
    totalCost?: number
    overPct?: number
  }
}

type SideTab = "upload" | "search"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
}

export type ParsedPeriod = {
  startISO?: string
  endISO?: string
  billISO?: string
  billingDays: number
  suggestedRange: TimeRange
  label: string
}

export type ScannedBill = {
  id: string
  fileName: string
  parsed: BillScanResult
  period: ParsedPeriod
  assignedDepartmentId?: number
  assignedDepartmentName?: string
  assignedDeviceId?: number
  assignedDeviceName?: string
}

export type BillRangeOption = {
  id: string
  label: string
  start_date?: string
  end_date?: string
  suggestedRange: TimeRange
}

export type BillDashboardSource = {
  id: string
  label: string
  billIds: string[]
  filter: FilterState
  lockedTimeRanges: TimeRange[]
}

const BILL_RANGES_EVENT = "bill-ranges-updated"
export const BILL_SOURCES_EVENT = "bill-sources-updated"

const MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

function toISO(raw?: string): string | undefined {
  if (!raw) return undefined
  const value = raw.trim()
  if (!value) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parts = value.split(/[\/-]/).map((p) => p.trim())
  if (parts.length !== 3) return undefined

  const [a, b, c] = parts
  let day = Number(a)
  let month = Number(b)
  let year = Number(c)

  if (a.length === 4) {
    year = Number(a)
    month = Number(b)
    day = Number(c)
  }

  if (year < 100) year += 2000

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return undefined
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`
}

function diffDaysInclusive(startISO?: string, endISO?: string): number {
  if (!startISO || !endISO) return 0
  const start = new Date(`${startISO}T00:00:00`)
  const end = new Date(`${endISO}T00:00:00`)
  const delta = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
  return delta > 0 ? delta : 0
}

function inferRange(days: number, startISO?: string, endISO?: string): TimeRange {
  if (days >= 75 && days <= 100) return "90d"
  if (days >= 27 && days <= 31) return "30d"
  if (days >= 6 && days <= 8) return "7d"
  if (startISO && endISO) return "custom"
  return "7d"
}

function periodLabel(period: ParsedPeriod): string {
  if (period.startISO && period.endISO) {
    return `${period.startISO} to ${period.endISO}`
  }
  if (period.billISO) {
    return `Bill date ${period.billISO}`
  }
  return "Unknown bill period"
}

function parsePeriodFromBill(parsed: BillScanResult): ParsedPeriod {
  const startISO = toISO(parsed.billing_period_start)
  const endISO = toISO(parsed.billing_period_end)
  const billISO = toISO(parsed.bill_date)
  const days = parsed.billing_days > 0 ? parsed.billing_days : diffDaysInclusive(startISO, endISO)
  const suggestedRange = inferRange(days, startISO, endISO)

  return {
    startISO,
    endISO,
    billISO,
    billingDays: days,
    suggestedRange,
    label: periodLabel({
      startISO,
      endISO,
      billISO,
      billingDays: days,
      suggestedRange,
      label: "",
    }),
  }
}

function applyRangeToFilters(filters: FilterState, period: ParsedPeriod): FilterState {
  const common = {
    department_id: filters.department_id,
    device_id: filters.device_id,
  }

  if (period.suggestedRange === "90d") {
    return { ...common, timeRange: "90d" }
  }

  if (period.suggestedRange === "30d") {
    return { ...common, timeRange: "30d" }
  }

  if (period.suggestedRange === "7d") {
    return { ...common, timeRange: "7d" }
  }

  if (period.startISO && period.endISO) {
    return {
      ...common,
      timeRange: "custom",
      start_date: period.startISO,
      end_date: period.endISO,
    }
  }

  return { ...common, timeRange: "7d" }
}

function buildSourceForBills(bills: ScannedBill[], label: string, sourceId: string): BillDashboardSource {
  const first = bills[0]
  const start = bills
    .map((b) => b.period.startISO)
    .filter((v): v is string => Boolean(v))
    .sort()[0]
  const end = bills
    .map((b) => b.period.endISO)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1)

  const inferredRange: TimeRange = bills.length === 1 ? first.period.suggestedRange : "custom"
  const baseRange = inferredRange === "custom" ? "custom" : inferredRange
  const filter: FilterState = {
    timeRange: baseRange,
    department_id: first.assignedDepartmentId ?? null,
    device_id: first.assignedDeviceId ?? null,
    ...(start && end ? { start_date: start, end_date: end } : {}),
  }

  return {
    id: sourceId,
    label,
    billIds: bills.map((b) => b.id),
    filter,
    lockedTimeRanges: [baseRange],
  }
}

function numberOrNA(parsed: BillScanResult, field: string, value: number, suffix = ""): string {
  if (parsed.missing_fields.includes(field) || !Number.isFinite(value)) return "Not Available"
  if (value === 0 && parsed.missing_fields.includes(field)) return "Not Available"
  return `${value.toLocaleString("en-IN")}${suffix}`
}

function textOrNA(parsed: BillScanResult, field: string, value?: string): string {
  if (!value || parsed.missing_fields.includes(field)) return "Not Available"
  return value
}

function titleCaseField(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Split warnings into system-level config notes (e.g. Tesseract not found) vs
 * real data quality issues (e.g. low-res scan, no text detected).
 */
function classifyWarnings(warnings: string[]): { sysNotes: string[]; dataWarnings: string[] } {
  const SYS_PATTERNS = [
    /tesseract/i,
    /not found in path/i,
    /tesseract_cmd/i,
    /ocr is needed/i,
    /executable was not found/i,
  ]
  const sysNotes: string[] = []
  const dataWarnings: string[] = []
  for (const w of warnings) {
    if (SYS_PATTERNS.some((p) => p.test(w))) {
      sysNotes.push(w)
    } else {
      dataWarnings.push(w)
    }
  }
  return { sysNotes, dataWarnings }
}

function buildExtractionSummary(bill: ScannedBill): string {
  const missing = bill.parsed.missing_fields
  const { dataWarnings } = classifyWarnings(bill.parsed.warnings)
  const lines: string[] = []

  lines.push(`Scanned ${bill.fileName}. Range: ${bill.period.label}. Suggested filter: ${bill.period.suggestedRange.toUpperCase()}.`)

  if (missing.length > 0) {
    const preview = missing.slice(0, 6).map(titleCaseField).join(", ")
    lines.push(`Not available: ${preview}${missing.length > 6 ? ", ..." : ""}.`)
  } else {
    lines.push("All key fields were extracted.")
  }

  if (dataWarnings.length > 0) {
    lines.push(`Data quality note: ${dataWarnings[0]}`)
  }

  return lines.join(" ")
}

function groupSummary(bills: ScannedBill[]): string[] {
  const map = new Map<string, number>()
  bills.forEach((bill) => {
    const key = `${bill.assignedDepartmentName ?? "Unassigned Department"} -> ${bill.assignedDeviceName ?? "Unassigned Device"}`
    map.set(key, (map.get(key) ?? 0) + 1)
  })
  return Array.from(map.entries()).map(([key, count]) => `${key}: ${count} bill(s)`) 
}

type EndpointRow = {
  endpoint: string
  source: string
  value: string
  ok: boolean
  note?: string
}

function buildEndpointMapping(bill: ScannedBill): EndpointRow[] {
  const p = bill.parsed
  const kwh = p.total_energy_consumption_kwh ?? 0
  const dayWise = p.day_wise_consumption ?? []
  const co2 = p.carbon_emissions_kg_co2 ?? 0
  const maxDemand = p.max_demand_kw ?? 0

  return [
    {
      endpoint: "Total Consumption",
      source: "total_energy_consumption_kwh",
      value: kwh > 0 ? `${kwh.toLocaleString("en-IN")} kWh` : "No data",
      ok: kwh > 0,
    },
    {
      endpoint: "Energy Trend (daily)",
      source: dayWise.length > 0 ? "day_wise_consumption" : "spread from total",
      value:
        dayWise.length > 0
          ? `${dayWise.length} daily readings`
          : kwh > 0
          ? "Distributed uniformly"
          : "No data",
      ok: kwh > 0,
      note: dayWise.length === 0 && kwh > 0 ? "kWh will be spread across billing days" : undefined,
    },
    {
      endpoint: "Total Cost",
      source: "kWh × tariff rate",
      value: kwh > 0 ? `Computed from ${kwh.toLocaleString("en-IN")} kWh` : "No data",
      ok: kwh > 0,
      note: "Dashboard cost uses tariff rate — may differ from bill amount",
    },
    {
      endpoint: "CO\u2082 Emissions",
      source: co2 > 0 ? "carbon_emissions_kg_co2" : "kWh × emission factor",
      value:
        co2 > 0
          ? `${co2.toLocaleString("en-IN")} kg CO\u2082`
          : kwh > 0
          ? "Derived from kWh"
          : "No data",
      ok: kwh > 0 || co2 > 0,
    },
    {
      endpoint: "Peak Demand",
      source: "max_demand_kw",
      value: maxDemand > 0 ? `${maxDemand} kW` : "Not in bill",
      ok: maxDemand > 0,
    },
    {
      endpoint: "Energy Saved",
      source: "(baseline required)",
      value: "No baseline available",
      ok: false,
      note: "Needs historical baseline data",
    },
    {
      endpoint: "Location / Zone",
      source: "device assignment",
      value: bill.assignedDeviceName
        ? `${bill.assignedDepartmentName ?? "Dept?"} \u2192 ${bill.assignedDeviceName}`
        : "No device assigned",
      ok: !!bill.assignedDeviceId,
    },
    {
      endpoint: "Anomaly Detection",
      source: "(computed post-ingest)",
      value: kwh > 0 ? "Will compute from ingested rows" : "No data",
      ok: kwh > 0,
    },
  ]
}

function areConsecutive(bills: ScannedBill[]): boolean {
  const withDates = bills
    .filter((b) => b.period.startISO && b.period.endISO)
    .sort((a, b) => (a.period.startISO! < b.period.startISO! ? -1 : 1))

  if (withDates.length < 2) return false

  for (let i = 1; i < withDates.length; i += 1) {
    const prevEnd = new Date(`${withDates[i - 1].period.endISO}T00:00:00`)
    const currStart = new Date(`${withDates[i].period.startISO}T00:00:00`)
    const delta = Math.floor((currStart.getTime() - prevEnd.getTime()) / 86400000)
    if (delta !== 1) return false
  }

  return true
}

export function BillSideChat({ preferredDeviceId, filters, onFiltersChange, kpiSnapshot }: BillSideChatProps) {
  const { data: departments = [] } = useDepartments()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<SideTab>("upload")

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [thinkingText, setThinkingText] = useState("")
  const [scanError, setScanError] = useState("")

  const [scannedBills, setScannedBills] = useState<ScannedBill[]>([])
  const [selectedBillId, setSelectedBillId] = useState<string>("")

  const [pendingBill, setPendingBill] = useState<ScannedBill | null>(null)
  const [confirmStart, setConfirmStart] = useState("")
  const [confirmEnd, setConfirmEnd] = useState("")
  const [pendingDepartmentId, setPendingDepartmentId] = useState<number | null>(filters.department_id ?? null)
  const [pendingDeviceId, setPendingDeviceId] = useState<number | null>(preferredDeviceId ?? filters.device_id ?? null)
  const { data: pendingDevices = [] } = useDevices(pendingDepartmentId)

  const [showEndpointConfirmation, setShowEndpointConfirmation] = useState(false)
  const [pendingEndpointValues, setPendingEndpointValues] = useState<ConfirmedEndpointValues | null>(null)

  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestInfo, setIngestInfo] = useState("")
  const [showEndpointMap, setShowEndpointMap] = useState(false)

  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "boot",
      role: "assistant",
      text:
        "Ask me simple dashboard queries like: 'what is the bill for aug month', 'give me energy savings tip', or 'show overconsumption status'.",
    },
  ])

  const selectedBill = useMemo(
    () => scannedBills.find((b) => b.id === selectedBillId) ?? null,
    [scannedBills, selectedBillId]
  )

  const consecutiveBills = useMemo(() => areConsecutive(scannedBills), [scannedBills])

  const hasUsableSelectedBill = Boolean(
    selectedBill &&
      (selectedBill.parsed.total_energy_consumption_kwh > 0 ||
        selectedBill.parsed.day_wise_consumption.some((row) => row.kwh > 0))
  )

  const groupedAssignments = useMemo(() => groupSummary(scannedBills), [scannedBills])
  const unassignedDeviceBills = useMemo(
    () => scannedBills.filter((bill) => !bill.assignedDeviceId),
    [scannedBills]
  )

  useEffect(() => {
    if (!pendingBill) return

    if (pendingDepartmentId && !departments.some((d) => d.id === pendingDepartmentId)) {
      setPendingDepartmentId(null)
    }
    if (pendingDeviceId && !pendingDevices.some((d) => d.id === pendingDeviceId)) {
      setPendingDeviceId(null)
    }
  }, [pendingBill, pendingDepartmentId, pendingDeviceId, departments, pendingDevices])

  const broadcastBillRanges = (bills: ScannedBill[], selectedId?: string) => {
    if (typeof window === "undefined") return

    const ranges: BillRangeOption[] = bills.map((bill) => ({
      id: bill.id,
      label: `${bill.fileName} - ${bill.period.label}`,
      start_date: bill.period.startISO,
      end_date: bill.period.endISO,
      suggestedRange: bill.period.suggestedRange,
    }))

    window.dispatchEvent(
      new CustomEvent(BILL_RANGES_EVENT, {
        detail: {
          ranges,
          selectedId: selectedId ?? ranges[0]?.id ?? "",
        },
      })
    )
  }

  const broadcastBillSources = (bills: ScannedBill[], selectedBill?: string, selectedSourceId?: string) => {
    if (typeof window === "undefined") return

    const singleSources = bills.map((bill) =>
      buildSourceForBills(
        [bill],
        `${bill.fileName} (${bill.period.label})`,
        `bill-${bill.id}`
      )
    )
    const sources = [...singleSources]

    if (areConsecutive(bills) && bills.length > 1) {
      const sorted = [...bills].sort((a, b) => ((a.period.startISO ?? "") < (b.period.startISO ?? "") ? -1 : 1))
      const start = sorted[0]?.period.startISO ?? sorted[0]?.period.billISO ?? ""
      const end = sorted[sorted.length - 1]?.period.endISO ?? sorted[sorted.length - 1]?.period.billISO ?? ""
      sources.push(
        buildSourceForBills(
          sorted,
          `Combined Bills (${sorted.length}) ${start}${start && end ? ` to ${end}` : ""}`,
          `bill-group-${sorted.map((b) => b.id).join("-")}`
        )
      )
    }

    window.dispatchEvent(
      new CustomEvent(BILL_SOURCES_EVENT, {
        detail: {
          bills,
          sources,
          selectedBillId: selectedBill ?? bills[0]?.id ?? "",
          selectedSourceId: selectedSourceId ?? "",
        },
      })
    )
  }

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setSelectedFiles(files)
    setScanError("")
  }

  const runThinkingStep = (index: number, total: number) => {
    const stepTexts = [
      "AI is reading text and tables...",
      "Detecting bill dates and usage values...",
      "Cross-checking amounts and confidence...",
    ]
    setThinkingText(`${stepTexts[index % stepTexts.length]} (${index + 1}/${total})`)
  }

  const onScan = async () => {
    if (selectedFiles.length === 0) {
      setScanError("Choose one or more bill files first.")
      return
    }

    setIsScanning(true)
    setScanError("")
    setIngestInfo("")

    try {
      for (let i = 0; i < selectedFiles.length; i += 1) {
        const file = selectedFiles[i]
        runThinkingStep(i, selectedFiles.length)
        const parsed = await scanElectricityBill(file)
        const period = parsePeriodFromBill(parsed)

        const candidate: ScannedBill = {
          id: `${Date.now()}-${i}`,
          fileName: file.name,
          parsed,
          period,
        }

        setPendingBill(candidate)
        setConfirmStart(period.startISO ?? "")
        setConfirmEnd(period.endISO ?? "")

        // Wait for the user confirmation popup for each file.
        return
      }
    } catch {
      setScanError("Could not process one of the uploaded bills. Please try clearer files.")
      setThinkingText("")
      setIsScanning(false)
    }
  }

  const addPendingBillAndContinue = async () => {
    if (!pendingBill) return

    const startISO = toISO(confirmStart) ?? pendingBill.period.startISO
    const endISO = toISO(confirmEnd) ?? pendingBill.period.endISO
    const days = diffDaysInclusive(startISO, endISO) || pendingBill.period.billingDays

    const nextPeriod: ParsedPeriod = {
      ...pendingBill.period,
      startISO,
      endISO,
      billingDays: days,
      suggestedRange: inferRange(days, startISO, endISO),
      label: periodLabel({
        ...pendingBill.period,
        startISO,
        endISO,
        billingDays: days,
      }),
    }

    const updatedParsed: BillScanResult = {
      ...pendingBill.parsed,
      billing_period_start: startISO ?? pendingBill.parsed.billing_period_start,
      billing_period_end: endISO ?? pendingBill.parsed.billing_period_end,
      billing_days: days || pendingBill.parsed.billing_days,
      bill_date: pendingBill.parsed.bill_date || startISO || pendingBill.parsed.bill_date,
    }

    const confirmedBill: ScannedBill = {
      ...pendingBill,
      parsed: updatedParsed,
      period: nextPeriod,
      assignedDepartmentId: pendingDepartmentId ?? undefined,
      assignedDepartmentName: departments.find((d) => d.id === pendingDepartmentId)?.name,
      assignedDeviceId: pendingDeviceId ?? undefined,
      assignedDeviceName: pendingDevices.find((d) => d.id === pendingDeviceId)?.name,
    }

    if (nextPeriod.suggestedRange === "90d") {
      const accepted = window.confirm(
        "This bill appears to be around 90 days (3 months). Use 90D dashboard range for this bill?"
      )
      if (!accepted) {
        return
      }
    }

    // Show endpoint confirmation modal for user to review/confirm extracted values.
    // Do not advance scanning here; continue only after endpoint confirmation.
    setShowEndpointConfirmation(true)
    setPendingBill(confirmedBill)
    return
  }

  const handleEndpointConfirmation = async (confirmedValues: ConfirmedEndpointValues) => {
    if (!pendingBill) return

    setShowEndpointConfirmation(false)
    setPendingEndpointValues(confirmedValues)

    // Update the pending bill with confirmed values
    const confirmedBill: ScannedBill = {
      ...pendingBill,
      parsed: {
        ...pendingBill.parsed,
        total_energy_consumption_kwh: confirmedValues.total_energy_consumption_kwh,
        total_amount_inr: confirmedValues.total_cost,
        carbon_emissions_kg_co2: confirmedValues.co2_emissions_kg * 1000,
        max_demand_kw: confirmedValues.max_demand_kw,
      },
    }

    // Add to scanned bills
    const nextBills = [...scannedBills, confirmedBill]
    const nextSelectedId = selectedBillId || confirmedBill.id
    setScannedBills(nextBills)
    if (!selectedBillId) {
      setSelectedBillId(confirmedBill.id)
    }
    broadcastBillRanges(nextBills, nextSelectedId)
    broadcastBillSources(nextBills, nextSelectedId)

    const summaryText = buildExtractionSummary(confirmedBill)
    setChatMessages((prev) => [
      ...prev,
      { id: `a-scan-${Date.now()}`, role: "assistant", text: summaryText },
    ])

    // Continue with next file if there are more
    const consumedCount = scannedBills.length + 1
    if (consumedCount < selectedFiles.length) {
      try {
        runThinkingStep(consumedCount, selectedFiles.length)
        const nextFile = selectedFiles[consumedCount]
        const parsed = await scanElectricityBill(nextFile)
        const period = parsePeriodFromBill(parsed)
        const candidate: ScannedBill = {
          id: `${Date.now()}-${consumedCount}`,
          fileName: nextFile.name,
          parsed,
          period,
        }
        setPendingBill(candidate)
        setConfirmStart(period.startISO ?? "")
        setConfirmEnd(period.endISO ?? "")
        setPendingDepartmentId(filters.department_id ?? null)
        setPendingDeviceId(preferredDeviceId ?? filters.device_id ?? null)
      } catch {
        setScanError("Some files were scanned, but a later file failed. You can continue with scanned bills.")
        setThinkingText("")
        setIsScanning(false)
      }
      return
    }

    // All files processed
    setThinkingText("")
    setIsScanning(false)
    setSelectedFiles([])
    setPendingBill(null)

    const grouping = groupSummary(nextBills)
    if (grouping.length > 0) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-group-${Date.now()}`,
          role: "assistant",
          text: `Department/device grouping preview: ${grouping.join(" | ")}`,
        },
      ])
    }

    if (onFiltersChange) {
      onFiltersChange(applyRangeToFilters(filters, confirmedBill.period))
    }
  }

  const handleEndpointCancellation = () => {
    setShowEndpointConfirmation(false)
    setPendingBill(null)
    // Continue with next file if available
    const consumedCount = scannedBills.length
    if (consumedCount < selectedFiles.length) {
      try {
        setThinkingText("")
        setPendingBill(null)
      } catch {
        setScanError("Could not continue scanning remaining files.")
        setThinkingText("")
        setIsScanning(false)
      }
      return
    }
    setIsScanning(false)
  }

  const useBillData = async (useAllConsecutive: boolean) => {
    if (scannedBills.length === 0) return

    const targetBills = useAllConsecutive
      ? [...scannedBills].sort((a, b) => (a.period.startISO ?? "") < (b.period.startISO ?? "") ? -1 : 1)
      : selectedBill
      ? [selectedBill]
      : []

    if (targetBills.length === 0) return

    if (targetBills.length > 1) {
      const withoutDevice = targetBills.filter((bill) => !bill.assignedDeviceId)
      if (withoutDevice.length > 0) {
        const sampleNames = withoutDevice
          .slice(0, 3)
          .map((bill) => bill.fileName)
          .join(", ")
        setScanError(
          `Confirm device mapping for every bill before grouped ingest. Missing device for: ${sampleNames}${withoutDevice.length > 3 ? ", ..." : ""}.`
        )
        return
      }
    }

    const ingestConfirmed = window.confirm(`Ingest ${targetBills.length} bill(s) into dashboard database?`)
    if (!ingestConfirmed) return

    setIsIngesting(true)
    setScanError("")
    setIngestInfo("")

    try {
      let successCount = 0
      let lastError = ""

      // Ingest each bill into the backend database
      for (const bill of targetBills) {
        try {
          const result = await ingestParsedBill(bill.parsed, {
            device_id: bill.assignedDeviceId || undefined,
            clear_existing: false,
          })
          if (result && result.rows_upserted > 0) {
            successCount++
          } else {
            lastError = `Bill ${bill.fileName}: No rows ingested`
          }
        } catch (error) {
          lastError = `Bill ${bill.fileName}: ${error instanceof Error ? error.message : String(error)}`
          console.error(`Ingest error for ${bill.fileName}:`, error)
        }
      }

      if (successCount > 0) {
        setIngestInfo(`✓ Successfully ingested ${successCount}/${targetBills.length} bill(s) into main dashboard.`)
        broadcastBillSources(scannedBills, selectedBillId || scannedBills[0]?.id, "main")
        // Switch to main dashboard to show the ingested data
        onFiltersChange?.({
          timeRange: filters.timeRange || "7d",
          department_id: filters.department_id || null,
          device_id: filters.device_id || null,
        })
      } else {
        setScanError(lastError || "Failed to ingest any bills. Check browser console for details.")
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      setScanError(`Ingest error: ${errorMsg}`)
      console.error("Ingest failed:", error)
    } finally {
      setIsIngesting(false)
    }
  }

  const onSelectBill = (billId: string) => {
    setSelectedBillId(billId)
    broadcastBillRanges(scannedBills, billId)
    broadcastBillSources(scannedBills, billId)
    const found = scannedBills.find((b) => b.id === billId)
    if (found && onFiltersChange) {
      onFiltersChange(applyRangeToFilters(filters, found.period))
    }
  }

  const askAssistant = (question: string): string => {
    const q = question.toLowerCase()

    if (q.includes("tip") || q.includes("save") || q.includes("saving")) {
      return "Try shifting heavy loads to off-peak hours, fixing compressed-air leaks, and setting HVAC to tighter schedules. These are usually the fastest savings wins."
    }

    const monthMatch = q.match(/bill\s+for\s+([a-z]{3,9})/)
    if (monthMatch) {
      const token = monthMatch[1].slice(0, 3)
      const month = MONTH_LOOKUP[token]
      if (month !== undefined) {
        const found = scannedBills.find((bill) => {
          const source = bill.period.startISO ?? bill.period.billISO
          if (!source) return false
          return new Date(`${source}T00:00:00`).getMonth() === month
        })
        if (found) {
          return `For ${monthMatch[1]}, I found ${found.fileName}. Consumption is ${found.parsed.total_energy_consumption_kwh.toLocaleString("en-IN")} kWh and amount is INR ${found.parsed.total_amount_inr.toLocaleString("en-IN")}.`
        }
        return `I could not find a scanned bill for ${monthMatch[1]} yet. Upload that month and ask again.`
      }
    }

    if (q.includes("overconsumption") || q.includes("over consumption")) {
      return `Current overconsumption is about ${(kpiSnapshot?.overPct ?? 0).toFixed(1)}%.`
    }

    if (q.includes("total consumption") || q.includes("kwh")) {
      return `Current dashboard total consumption is ${(kpiSnapshot?.totalKwh ?? 0).toLocaleString("en-IN")} kWh.`
    }

    if (q.includes("cost") || q.includes("bill amount")) {
      return `Current dashboard cost is around INR ${(kpiSnapshot?.totalCost ?? 0).toLocaleString("en-IN")}.`
    }

    return "I can answer simple bill and dashboard questions. Try: 'what is the bill for aug month', 'show overconsumption', or 'give me energy savings tip'."
  }

  const onSendChat = () => {
    const input = chatInput.trim()
    if (!input) return

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: input }
    const botMsg: ChatMessage = { id: `a-${Date.now()}`, role: "assistant", text: askAssistant(input) }

    setChatMessages((prev) => [...prev, userMsg, botMsg])
    setChatInput("")
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 bottom-6 z-40 rounded-xl border border-blue-400/30 bg-[#0c1529]/95 px-4 py-2.5 text-[12px] font-semibold text-blue-200 shadow-[0_18px_40px_rgba(0,0,0,0.5)] hover:bg-[#122041] transition-colors"
      >
        <span className="inline-flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Bill Assistant
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.aside
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 h-screen w-[380px] border-l border-white/10 bg-[#090f1d]/95 backdrop-blur-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_40px_80px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <p className="text-[13px] font-semibold text-white">Bill & AI Side Chat</p>
                <p className="text-[11px] text-white/40">Upload bills, confirm ranges, and query quickly</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-3 pt-3">
              <div className="grid grid-cols-2 rounded-xl bg-white/[0.04] p-1 border border-white/10">
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`rounded-lg py-2 text-[12px] font-medium transition-colors ${
                    activeTab === "upload" ? "bg-blue-500/20 text-blue-200" : "text-white/50"
                  }`}
                >
                  Upload Bill
                </button>
                <button
                  onClick={() => setActiveTab("search")}
                  className={`rounded-lg py-2 text-[12px] font-medium transition-colors ${
                    activeTab === "search" ? "bg-blue-500/20 text-blue-200" : "text-white/50"
                  }`}
                >
                  AI Search
                </button>
              </div>
            </div>

            {activeTab === "upload" ? (
              <div className="h-[calc(100vh-124px)] overflow-y-auto px-3 py-3 space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-[12px] text-white/75 cursor-pointer">
                    <Upload className="w-4 h-4 text-blue-300" />
                    <span>{selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : "Choose bill files"}</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
                      className="hidden"
                      onChange={onPickFiles}
                    />
                  </label>

                  <button
                    onClick={onScan}
                    disabled={isScanning}
                    className="mt-2 w-full rounded-lg bg-blue-500/90 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                  >
                    {isScanning ? "AI scanning..." : "Scan Bill(s)"}
                  </button>

                  {thinkingText ? (
                    <p className="mt-2 text-[11px] text-cyan-200 inline-flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 animate-pulse" />
                      {thinkingText}
                    </p>
                  ) : null}
                  {scanError ? <p className="mt-2 text-[11px] text-red-300">{scanError}</p> : null}
                  {ingestInfo ? <p className="mt-2 text-[11px] text-emerald-300">{ingestInfo}</p> : null}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-[11px] font-semibold text-white mb-2">Scanned Bills</p>

                  {scannedBills.length === 0 ? (
                    <p className="text-[11px] text-white/45">No scanned bills yet.</p>
                  ) : (
                    <>
                      <div className="relative">
                        <select
                          value={selectedBillId}
                          onChange={(e) => onSelectBill(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-white/15 bg-[#0d162b] px-3 py-2 pr-8 text-[12px] text-white"
                        >
                          {scannedBills.map((bill) => (
                            <option key={bill.id} value={bill.id}>
                              {bill.fileName} - {bill.period.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 w-4 h-4 text-white/40" />
                      </div>

                      {selectedBill ? (
                        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                          <p className="text-[11px] text-white/70 inline-flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {selectedBill.period.label}
                          </p>
                          <p className="mt-1 text-[11px] text-white/50">
                            Confidence {selectedBill.parsed.confidence.toFixed(1)}% | Consumption {selectedBill.parsed.total_energy_consumption_kwh.toLocaleString("en-IN")} kWh
                          </p>
                          <p className="mt-1 text-[11px] text-white/50">
                            Suggested filter: {selectedBill.period.suggestedRange === "custom" ? "Custom Date Range" : selectedBill.period.suggestedRange.toUpperCase()}
                          </p>
                          <p className="mt-1 text-[11px] text-white/50">
                            Department: {selectedBill.assignedDepartmentName ?? "Not Confirmed"} | Device: {selectedBill.assignedDeviceName ?? "Not Confirmed"}
                          </p>
                          <div className="mt-2 rounded-md border border-white/10 bg-black/20 p-2 text-[11px] text-white/70 space-y-1">
                            <p>Provider: {textOrNA(selectedBill.parsed, "provider_name", selectedBill.parsed.provider_name)}</p>
                            <p>Bill Number: {textOrNA(selectedBill.parsed, "bill_number", selectedBill.parsed.bill_number)}</p>
                            <p>Consumer Number: {textOrNA(selectedBill.parsed, "consumer_number", selectedBill.parsed.consumer_number)}</p>
                            <p>Meter Number: {textOrNA(selectedBill.parsed, "meter_number", selectedBill.parsed.meter_number)}</p>
                            <p>Total Amount: {numberOrNA(selectedBill.parsed, "total_amount_inr", selectedBill.parsed.total_amount_inr, " INR")}</p>
                            <p>Total Consumption: {numberOrNA(selectedBill.parsed, "total_energy_consumption_kwh", selectedBill.parsed.total_energy_consumption_kwh, " kWh")}</p>
                          </div>
                          <button
                            onClick={() => onFiltersChange?.(applyRangeToFilters(filters, selectedBill.period))}
                            className="mt-2 rounded-md bg-white/[0.08] px-2.5 py-1.5 text-[11px] text-white/85 hover:bg-white/[0.12]"
                          >
                            Apply This Bill Range To Dashboard
                          </button>

                          {/* Dashboard Impact preview (pre-ingest) */}
                          <button
                            onClick={() => setShowEndpointMap((v) => !v)}
                            className="mt-2 w-full flex items-center justify-between rounded-md bg-blue-500/10 px-2.5 py-1.5 text-[11px] text-blue-200 hover:bg-blue-500/20 border border-blue-400/20"
                          >
                            <span className="flex items-center gap-1.5">
                              <LayoutDashboard className="w-3.5 h-3.5" />
                              Dashboard Impact Preview
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showEndpointMap ? "rotate-180" : ""}`} />
                          </button>
                          {showEndpointMap ? (
                            <div className="mt-1.5 rounded-lg border border-white/10 bg-black/25 p-2 space-y-1.5">
                              <p className="text-[10px] text-white/35 mb-1">Which dashboard sections will be populated after ingest:</p>
                              {buildEndpointMapping(selectedBill).map((row) => (
                                <div key={row.endpoint} className="flex items-start gap-2">
                                  {row.ok
                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                    : <MinusCircle className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
                                  }
                                  <div className="min-w-0">
                                    <p className="text-[11px] text-white/80 font-medium leading-tight">{row.endpoint}</p>
                                    <p className="text-[10px] text-white/45 leading-tight">{row.value}</p>
                                    {row.note ? <p className="text-[10px] text-amber-300/60 leading-tight">{row.note}</p> : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {consecutiveBills ? (
                        <p className="mt-2 text-[11px] text-emerald-300">
                          Bills are consecutive. You can apply them together.
                        </p>
                      ) : null}

                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <button
                          onClick={() => useBillData(false)}
                          disabled={isIngesting || !hasUsableSelectedBill}
                          className="rounded-lg bg-emerald-500/90 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                        >
                          {isIngesting ? "Preparing..." : "Use This Bill Dashboard"}
                        </button>

                        {consecutiveBills ? (
                          <button
                            onClick={() => useBillData(true)}
                            disabled={isIngesting || unassignedDeviceBills.length > 0}
                            className="rounded-lg bg-cyan-500/80 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                          >
                            Use All Consecutive (Custom)
                          </button>
                        ) : null}
                      </div>

                      {unassignedDeviceBills.length > 0 ? (
                        <p className="mt-2 text-[11px] text-amber-300">
                          Device confirmation pending for {unassignedDeviceBills.length} bill(s). Grouped ingest is locked until all are assigned.
                        </p>
                      ) : null}
                    </>
                  )}

                  {groupedAssignments.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                      <p className="text-[11px] font-semibold text-white">Grouped by Department/Device</p>
                      <div className="mt-1 space-y-1">
                        {groupedAssignments.map((item) => (
                          <p key={item} className="text-[11px] text-white/60">{item}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="h-[calc(100vh-124px)] overflow-y-auto px-3 py-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                          msg.role === "user"
                            ? "ml-8 bg-blue-500/20 text-blue-100"
                            : "mr-8 bg-white/[0.06] text-white/80"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <span className="mb-1 inline-flex items-center gap-1 text-[10px] text-white/45">
                            <Bot className="w-3 h-3" /> Assistant
                          </span>
                        ) : null}
                        <p>{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onSendChat()
                      }}
                      placeholder="Ask simple dashboard or bill query..."
                      className="flex-1 rounded-lg border border-white/15 bg-[#0d162b] px-3 py-2 text-[12px] text-white outline-none"
                    />
                    <button
                      onClick={onSendChat}
                      className="rounded-lg bg-blue-500/90 p-2 text-white"
                      title="Send"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {pendingBill && !showEndpointConfirmation ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1324]/95 p-5"
            >
              <h3 className="text-[15px] font-semibold text-white">Confirm Bill Date Range</h3>
              <p className="text-[12px] text-white/40 mt-1">
                {pendingBill.fileName} | Confidence {pendingBill.parsed.confidence.toFixed(1)}%
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/45">Start Date</label>
                  <input
                    type="date"
                    value={confirmStart}
                    onChange={(e) => setConfirmStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d162b] px-2.5 py-2 text-[12px] text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/45">End Date</label>
                  <input
                    type="date"
                    value={confirmEnd}
                    onChange={(e) => setConfirmEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-[#0d162b] px-2.5 py-2 text-[12px] text-white"
                  />
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-[11px] text-white/70">
                Parsed amount: INR {pendingBill.parsed.total_amount_inr.toLocaleString("en-IN")} | Consumption: {pendingBill.parsed.total_energy_consumption_kwh.toLocaleString("en-IN")} kWh
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-[11px] text-white/75 space-y-1">
                <p>Bill Number: {textOrNA(pendingBill.parsed, "bill_number", pendingBill.parsed.bill_number)}</p>
                <p>Consumer Number: {textOrNA(pendingBill.parsed, "consumer_number", pendingBill.parsed.consumer_number)}</p>
                <p>Meter Number: {textOrNA(pendingBill.parsed, "meter_number", pendingBill.parsed.meter_number)}</p>
                <p>Billing Days: {pendingBill.period.billingDays > 0 ? pendingBill.period.billingDays : "Not Available"}</p>
                <p>Suggested Filter: {pendingBill.period.suggestedRange.toUpperCase()}</p>
                {pendingBill.parsed.missing_fields.length > 0 ? (
                  <p className="text-amber-300">
                    Not available: {pendingBill.parsed.missing_fields.slice(0, 6).map(titleCaseField).join(", ")}
                    {pendingBill.parsed.missing_fields.length > 6 ? ", ..." : ""}
                  </p>
                ) : null}
                {(() => {
                  const { sysNotes, dataWarnings } = classifyWarnings(pendingBill.parsed.warnings)
                  return (
                    <>
                      {dataWarnings.length > 0 ? (
                        <p className="text-red-300">Data quality issue: {dataWarnings[0]}</p>
                      ) : null}
                      {sysNotes.length > 0 ? (
                        <p className="text-white/35 text-[10px]">
                          Note: OCR is not configured on server — text extraction was used instead. This is fine for PDF/text bills.
                        </p>
                      ) : null}
                    </>
                  )
                })()}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <label className="text-[10px] text-white/45 inline-flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Confirm Department
                </label>
                <select
                  value={pendingDepartmentId ?? ""}
                  onChange={(e) => setPendingDepartmentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-white/15 bg-[#0d162b] px-2.5 py-2 text-[12px] text-white"
                >
                  <option value="">Select Department (optional)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>

                <label className="text-[10px] text-white/45 inline-flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5" /> Confirm Device
                </label>
                <select
                  value={pendingDeviceId ?? ""}
                  onChange={(e) => setPendingDeviceId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-white/15 bg-[#0d162b] px-2.5 py-2 text-[12px] text-white"
                >
                  <option value="">Select Device (optional)</option>
                  {pendingDevices.map((device) => (
                    <option key={device.id} value={device.id}>{device.name}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={addPendingBillAndContinue}
                  className="flex-1 rounded-lg bg-emerald-500/90 py-2 text-[12px] font-semibold text-white"
                >
                  Confirm Date
                </button>
                <button
                  onClick={addPendingBillAndContinue}
                  className="flex-1 rounded-lg bg-white/[0.08] py-2 text-[12px] font-semibold text-white/90"
                >
                  Add Other dates/Month bill
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {pendingBill && (
        <EndpointConfirmationModal
          bill={pendingBill.parsed}
          isOpen={showEndpointConfirmation}
          onConfirm={handleEndpointConfirmation}
          onCancel={handleEndpointCancellation}
        />
      )}
    </>
  )
}
