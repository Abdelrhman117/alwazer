"use client"

/**
 * هذا الملف بيوفر React hooks لكل collection في Firestore
 * كل hook بيعمل real-time subscription باستخدام onSnapshot
 */

import { useState, useEffect } from "react"
import { useAuth } from "./auth-context"
import {
  subscribeClients,
  subscribeInvoices,
  subscribeExpenses,
  subscribeSuppliers,
  subscribeSupplierTransactions,
  subscribeClientTransactions,
  subscribeSettings,
  getSettings,
  saveSettings as firestoreSaveSettings,
} from "./firestore"
import type {
  Client,
  Invoice,
  Expense,
  Supplier,
  SupplierTransaction,
  ClientTransaction,
  AppSettings,
} from "./types"
import { DEFAULT_SETTINGS } from "./types"

// ─── Clients hook ────────────────────────────────────────────────────────────

export function useClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const unsub = subscribeClients(user.uid, (data) => {
      setClients(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  return { clients, loading }
}

// ─── Invoices hook ───────────────────────────────────────────────────────────

export function useInvoices() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const unsub = subscribeInvoices(user.uid, (data) => {
      setInvoices(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  return { invoices, loading }
}

// ─── Expenses hook ───────────────────────────────────────────────────────────

export function useExpenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const unsub = subscribeExpenses(user.uid, (data) => {
      setExpenses(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  return { expenses, loading }
}

// ─── Suppliers hook ──────────────────────────────────────────────────────────

export function useSuppliers() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const unsub = subscribeSuppliers(user.uid, (data) => {
      setSuppliers(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  return { suppliers, loading }
}

// ─── Supplier Transactions hook ──────────────────────────────────────────────

export function useSupplierTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const unsub = subscribeSupplierTransactions(user.uid, (data) => {
      setTransactions(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  return { transactions, loading }
}

// ─── Client Transactions hook ────────────────────────────────────────────────

export function useClientTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<ClientTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const unsub = subscribeClientTransactions(user.uid, (data) => {
      setTransactions(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  return { transactions, loading }
}

// ─── Settings hook ───────────────────────────────────────────────────────────

export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const unsub = subscribeSettings(user.uid, (data) => {
      setSettings(data)
      setLoading(false)
    })
    return unsub
  }, [user])

  async function save(newSettings: AppSettings) {
    if (!user) return
    setSettings(newSettings)
    await firestoreSaveSettings(user.uid, newSettings)
  }

  return { settings, save, loading }
}

// ─── Generate invoice number ─────────────────────────────────────────────────

export function generateInvoiceNumber(invoices: Invoice[]): string {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`
  const maxNum = invoices
    .filter((inv) => inv.invoiceNumber?.startsWith(prefix))
    .reduce((max, inv) => {
      const num = parseInt(inv.invoiceNumber.slice(prefix.length), 10)
      return isNaN(num) ? max : Math.max(max, num)
    }, 0)
  return `${prefix}${String(maxNum + 1).padStart(4, "0")}`
}
