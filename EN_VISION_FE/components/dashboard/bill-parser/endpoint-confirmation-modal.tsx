"use client"

import { useState } from "react"
import { AlertCircle, CheckCircle2, Edit2, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { BillScanResult } from "@/lib/api/dashboard"

export interface ConfirmedEndpointValues {
  total_energy_consumption_kwh: number
  total_cost: number
  co2_emissions_kg: number
  max_demand_kw: number
  bill_period_start: string
  bill_period_end: string
}

interface EndpointConfirmationModalProps {
  bill: BillScanResult
  onConfirm: (values: ConfirmedEndpointValues) => void
  onCancel: () => void
  isOpen: boolean
}

interface EditingField {
  field: keyof ConfirmedEndpointValues
  tempValue: number | string
}

export function EndpointConfirmationModal({
  bill,
  onConfirm,
  onCancel,
  isOpen,
}: EndpointConfirmationModalProps) {
  const [confirmedValues, setConfirmedValues] = useState<ConfirmedEndpointValues>({
    total_energy_consumption_kwh: bill.total_energy_consumption_kwh || 0,
    total_cost: bill.total_amount_inr || 0,
    co2_emissions_kg: (bill.carbon_emissions_kg_co2 || 0) / 1000, // Convert to kg
    max_demand_kw: bill.max_demand_kw || 0,
    bill_period_start: bill.billing_period_start || "",
    bill_period_end: bill.billing_period_end || "",
  })

  const [editingField, setEditingField] = useState<EditingField | null>(null)

  const endpoints = [
    {
      label: "Total Energy Consumption",
      field: "total_energy_consumption_kwh" as const,
      unit: "kWh",
      value: confirmedValues.total_energy_consumption_kwh,
      extracted: bill.total_energy_consumption_kwh || 0,
      missing: bill.missing_fields.includes("total_energy_consumption_kwh"),
    },
    {
      label: "Total Cost",
      field: "total_cost" as const,
      unit: "₹",
      value: confirmedValues.total_cost,
      extracted: bill.total_amount_inr || 0,
      missing: bill.missing_fields.includes("total_amount_inr"),
    },
    {
      label: "CO₂ Emissions",
      field: "co2_emissions_kg" as const,
      unit: "kg CO₂",
      value: confirmedValues.co2_emissions_kg,
      extracted: (bill.carbon_emissions_kg_co2 || 0) / 1000,
      missing: bill.missing_fields.includes("carbon_emissions_kg_co2"),
    },
    {
      label: "Max Demand",
      field: "max_demand_kw" as const,
      unit: "kW",
      value: confirmedValues.max_demand_kw,
      extracted: bill.max_demand_kw || 0,
      missing: bill.missing_fields.includes("max_demand_kw"),
    },
  ]

  const handleEdit = (field: string, value: number | string) => {
    setEditingField({ field: field as unknown as keyof ConfirmedEndpointValues, tempValue: value })
  }

  const handleSaveEdit = () => {
    if (!editingField) return
    const numValue = typeof editingField.tempValue === "string" ? parseFloat(editingField.tempValue) : editingField.tempValue
    if (isFinite(numValue)) {
      setConfirmedValues((prev) => ({
        ...prev,
        [editingField.field]: numValue,
      }))
    }
    setEditingField(null)
  }

  const handleConfirm = () => {
    onConfirm(confirmedValues)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950 to-slate-900 p-6 shadow-2xl"
        >
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Confirm Extracted Values</h2>
              <p className="mt-1 text-sm text-white/50">Review and confirm extracted bill values. Change any value if needed.</p>
            </div>
            <button
              onClick={onCancel}
              className="text-white/40 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Bill Info */}
          <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-xs text-white/50">
              <span className="font-semibold text-white">{bill.provider_name}</span> — Bill {bill.bill_number || "N/A"}
            </p>
            <p className="mt-1 text-xs text-white/60">
              {confirmedValues.bill_period_start} to {confirmedValues.bill_period_end}
            </p>
          </div>

          {/* Endpoints Grid */}
          <div className="space-y-3">
            {endpoints.map((endpoint) => (
              <div key={endpoint.field} className="rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{endpoint.label}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {editingField?.field === endpoint.field ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editingField.tempValue}
                            onChange={(e) => setEditingField({ ...editingField, tempValue: e.target.value })}
                            className="rounded border border-blue-500 bg-slate-900 px-2 py-1 text-sm text-white"
                            step="0.01"
                          />
                          <span className="text-xs text-white/50">{endpoint.unit}</span>
                          <button
                            onClick={handleSaveEdit}
                            className="ml-2 rounded bg-blue-500/80 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-yellow-300">
                            {endpoint.extracted === 0 ? "0" : endpoint.extracted.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-white/50">{endpoint.unit}</span>
                          {endpoint.missing && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-300">
                              <AlertCircle className="h-3 w-3" />
                              Estimated 0
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {editingField?.field !== endpoint.field && (
                    <div className="flex items-center gap-2">
                      {endpoint.extracted > 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                      )}
                      <button
                        onClick={() => handleEdit(endpoint.field, endpoint.extracted)}
                        className="rounded bg-white/10 p-2 hover:bg-white/20"
                        title="Edit this value"
                      >
                        <Edit2 className="h-4 w-4 text-white/60" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Data Quality Notes */}
          {bill.warnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold text-amber-300">Quality Notes</p>
              <ul className="mt-2 space-y-1">
                {bill.warnings.slice(0, 3).map((warning, idx) => (
                  <li key={idx} className="text-xs text-amber-200">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-emerald-500/80 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Confirm & Proceed
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
