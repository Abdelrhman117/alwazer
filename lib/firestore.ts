"use client"

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase"
import type {
  Client,
  Invoice,
  Expense,
  Supplier,
  SupplierTransaction,
  ClientTransaction,
  AppSettings,
  PrintingPrice,
  SocialMediaPackage,
} from "./types"
import { DEFAULT_SETTINGS } from "./types"

// ─── helpers ────────────────────────────────────────────────────────────────

function userCol(uid: string, col: string) {
  return collection(db, "users", uid, col)
}

function userDoc(uid: string, col: string, id: string) {
  return doc(db, "users", uid, col, id)
}

// ─── Clients ────────────────────────────────────────────────────────────────

export async function getClients(uid: string): Promise<Client[]> {
  const snap = await getDocs(query(userCol(uid, "clients"), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client))
}

export function subscribeClients(uid: string, cb: (clients: Client[]) => void): Unsubscribe {
  return onSnapshot(query(userCol(uid, "clients"), orderBy("createdAt", "desc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client)))
  })
}

export async function addClient(uid: string, client: Omit<Client, "id">): Promise<string> {
  const ref = await addDoc(userCol(uid, "clients"), client)
  return ref.id
}

export async function updateClient(uid: string, id: string, data: Partial<Client>): Promise<void> {
  await updateDoc(userDoc(uid, "clients", id), data)
}

export async function deleteClient(uid: string, id: string): Promise<void> {
  await deleteDoc(userDoc(uid, "clients", id))
}

// ─── Invoices ───────────────────────────────────────────────────────────────

export async function getInvoices(uid: string): Promise<Invoice[]> {
  const snap = await getDocs(query(userCol(uid, "invoices"), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice))
}

export function subscribeInvoices(uid: string, cb: (invoices: Invoice[]) => void): Unsubscribe {
  return onSnapshot(query(userCol(uid, "invoices"), orderBy("createdAt", "desc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)))
  })
}

export async function addInvoice(uid: string, invoice: Omit<Invoice, "id">): Promise<string> {
  const ref = await addDoc(userCol(uid, "invoices"), invoice)
  return ref.id
}

export async function updateInvoice(uid: string, id: string, data: Partial<import("./types").Invoice>): Promise<void> {
  await updateDoc(userDoc(uid, "invoices", id), data as Record<string, unknown>)
}

export async function deleteInvoice(uid: string, id: string): Promise<void> {
  await deleteDoc(userDoc(uid, "invoices", id))
}

// ─── Expenses ───────────────────────────────────────────────────────────────

export async function getExpenses(uid: string): Promise<Expense[]> {
  const snap = await getDocs(query(userCol(uid, "expenses"), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense))
}

export function subscribeExpenses(uid: string, cb: (expenses: Expense[]) => void): Unsubscribe {
  return onSnapshot(query(userCol(uid, "expenses"), orderBy("createdAt", "desc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)))
  })
}

export async function addExpense(uid: string, expense: Omit<Expense, "id">): Promise<string> {
  const ref = await addDoc(userCol(uid, "expenses"), expense)
  return ref.id
}

export async function updateExpense(uid: string, id: string, data: Partial<Expense>): Promise<void> {
  await updateDoc(userDoc(uid, "expenses", id), data)
}

export async function deleteExpense(uid: string, id: string): Promise<void> {
  await deleteDoc(userDoc(uid, "expenses", id))
}

// ─── Suppliers ──────────────────────────────────────────────────────────────

export async function getSuppliers(uid: string): Promise<Supplier[]> {
  const snap = await getDocs(query(userCol(uid, "suppliers"), orderBy("createdAt", "desc")))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier))
}

export function subscribeSuppliers(uid: string, cb: (suppliers: Supplier[]) => void): Unsubscribe {
  return onSnapshot(query(userCol(uid, "suppliers"), orderBy("createdAt", "desc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier)))
  })
}

export async function addSupplier(uid: string, supplier: Omit<Supplier, "id">): Promise<string> {
  const ref = await addDoc(userCol(uid, "suppliers"), supplier)
  return ref.id
}

export async function deleteSupplier(uid: string, id: string): Promise<void> {
  await deleteDoc(userDoc(uid, "suppliers", id))
}

// ─── Supplier Transactions ──────────────────────────────────────────────────

export async function getSupplierTransactions(uid: string): Promise<SupplierTransaction[]> {
  const snap = await getDocs(query(userCol(uid, "supplierTransactions"), orderBy("date", "desc")))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupplierTransaction))
}

export function subscribeSupplierTransactions(
  uid: string,
  cb: (txs: SupplierTransaction[]) => void
): Unsubscribe {
  return onSnapshot(
    query(userCol(uid, "supplierTransactions"), orderBy("date", "desc")),
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupplierTransaction)))
    }
  )
}

export async function addSupplierTransaction(
  uid: string,
  tx: Omit<SupplierTransaction, "id">
): Promise<string> {
  const ref = await addDoc(userCol(uid, "supplierTransactions"), tx)
  return ref.id
}

export async function deleteSupplierTransaction(uid: string, id: string): Promise<void> {
  await deleteDoc(userDoc(uid, "supplierTransactions", id))
}

// ─── Client Transactions ────────────────────────────────────────────────────

export async function getClientTransactions(uid: string): Promise<ClientTransaction[]> {
  const snap = await getDocs(query(userCol(uid, "clientTransactions"), orderBy("date", "desc")))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientTransaction))
}

export function subscribeClientTransactions(
  uid: string,
  cb: (txs: ClientTransaction[]) => void
): Unsubscribe {
  return onSnapshot(
    query(userCol(uid, "clientTransactions"), orderBy("date", "desc")),
    (snap) => {
      cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientTransaction)))
    }
  )
}

export async function addClientTransaction(
  uid: string,
  tx: Omit<ClientTransaction, "id">
): Promise<string> {
  const ref = await addDoc(userCol(uid, "clientTransactions"), tx)
  return ref.id
}

export async function deleteClientTransaction(uid: string, id: string): Promise<void> {
  await deleteDoc(userDoc(uid, "clientTransactions", id))
}

// ─── Settings ───────────────────────────────────────────────────────────────

export async function getSettings(uid: string): Promise<AppSettings> {
  const snap = await getDoc(userDoc(uid, "meta", "settings"))
  if (snap.exists()) return snap.data() as AppSettings
  return DEFAULT_SETTINGS
}

export async function saveSettings(uid: string, settings: AppSettings): Promise<void> {
  await setDoc(userDoc(uid, "meta", "settings"), settings)
}

export function subscribeSettings(uid: string, cb: (s: AppSettings) => void): Unsubscribe {
  return onSnapshot(userDoc(uid, "meta", "settings"), (snap) => {
    cb(snap.exists() ? (snap.data() as AppSettings) : DEFAULT_SETTINGS)
  })
}

// ─── Printing Prices ────────────────────────────────────────────────────────

export async function getPrintingPrices(uid: string): Promise<PrintingPrice[]> {
  const snap = await getDocs(userCol(uid, "printingPrices"))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PrintingPrice))
}

export async function savePrintingPrices(uid: string, prices: PrintingPrice[]): Promise<void> {
  // overwrite all: delete existing then re-add
  const snap = await getDocs(userCol(uid, "printingPrices"))
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  await Promise.all(
    prices.map((p) => setDoc(userDoc(uid, "printingPrices", p.id), p))
  )
}

// ─── Social Packages ────────────────────────────────────────────────────────

export async function getSocialPackages(uid: string): Promise<SocialMediaPackage[]> {
  const snap = await getDocs(userCol(uid, "socialPackages"))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SocialMediaPackage))
}

export async function saveSocialPackages(uid: string, pkgs: SocialMediaPackage[]): Promise<void> {
  const snap = await getDocs(userCol(uid, "socialPackages"))
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
  await Promise.all(
    pkgs.map((p) => setDoc(userDoc(uid, "socialPackages", p.id), p))
  )
}
