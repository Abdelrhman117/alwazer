const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const STORAGE_PATH = path.join(__dirname, 'localstorage.json');
function loadStorage() {
  try { return JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf8')); } catch { return {}; }
}
function saveStorage(obj) { fs.writeFileSync(STORAGE_PATH, JSON.stringify(obj, null, 2)); }
function getItem(key) { const s = loadStorage(); return s[key] === undefined ? null : JSON.stringify(s[key]); }
function setItem(key, value) { const s = loadStorage(); s[key] = JSON.parse(value); saveStorage(s); }

// initialize
setItem('system_clients', JSON.stringify([{ id: 'C1', company: 'TestCo', phone: '012345', totalOwed: 0 }]));
setItem('suppliers', JSON.stringify([
  { id: 'S1', name: 'Sup1', totalOwed: 0 },
  { id: 'S2', name: 'Sup2', totalOwed: 0 }
]));
setItem('transactions', JSON.stringify([]));
setItem('all_invoices', JSON.stringify([]));

console.log('Initial storage:', loadStorage());

// prepare invoice data
const selectedCustomerId = 'C1';
const invoiceItems = [
  { id: 'I1', name: 'Service A', qty: '1000', total: '500', actual: '300', suppliersCost: { paper: { supplierId: 'S1', amount: 100 }, print: { supplierId: 'S2', amount: 50 } } }
];
const savedInvoices = JSON.parse(getItem('all_invoices') || '[]');
const currentInvoiceTotal = invoiceItems.reduce((acc, i) => acc + parseFloat(i.total), 0);

// saveAndSync logic (copied from page.tsx modifications)
(function saveAndSync() {
  if (invoiceItems.length === 0) { console.error('empty'); return; }
  const clients = JSON.parse(getItem('system_clients') || '[]');
  const clientComp = clients.find(c => c.id === selectedCustomerId);
  if (!clientComp) { console.error('no client'); return; }

  const newInvoice = {
    id: randomUUID(), customerId: selectedCustomerId, clientName: clientComp.company,
    clientPhone: clientComp.phone, date: new Date().toLocaleDateString('en-GB'),
    totalPrice: currentInvoiceTotal, items: invoiceItems
  };

  let allSuppliers = JSON.parse(getItem('suppliers') || '[]');
  let allClients = JSON.parse(getItem('system_clients') || '[]');
  let allTransactions = JSON.parse(getItem('transactions') || '[]');

  invoiceItems.forEach((item) => {
    Object.values(item.suppliersCost || {}).forEach((cost) => {
      allSuppliers = allSuppliers.map((s) => s.id === cost.supplierId ? { ...s, totalOwed: (s.totalOwed || 0) + cost.amount } : s);
      allTransactions.unshift({ id: randomUUID(), supplierId: cost.supplierId, invoiceId: newInvoice.id, amount: cost.amount, date: new Date().toLocaleDateString('en-GB'), type: 'تكلفة_فاتورة', notes: `تكلفة بند [${item.name}] فاتورة #${newInvoice.id.slice(0,5)}` });
    });
  });

  allClients = allClients.map((c) => c.id === selectedCustomerId ? { ...c, totalOwed: (c.totalOwed || 0) + currentInvoiceTotal } : c);
  allTransactions.unshift({ id: randomUUID(), clientId: selectedCustomerId, invoiceId: newInvoice.id, amount: currentInvoiceTotal, date: new Date().toLocaleDateString('en-GB'), type: 'سحب_شغل', notes: 'فاتورة مبيعات' });

  const updatedInvoices = [newInvoice, ...savedInvoices];
  setItem('all_invoices', JSON.stringify(updatedInvoices));
  setItem('suppliers', JSON.stringify(allSuppliers));
  setItem('system_clients', JSON.stringify(allClients));
  setItem('transactions', JSON.stringify(allTransactions));

  console.log('\nAfter saveAndSync:');
  console.log(loadStorage());

  return newInvoice.id;
})();

const createdInvoiceId = (function(){
  // Re-run the saveAndSync IIFE to capture its returned id. In this script we already executed it above,
  // but to keep linear flow, read the first invoice's id from storage.
  const invoices = JSON.parse(getItem('all_invoices') || '[]');
  return invoices.length ? invoices[0].id : null;
})();

// simulate delete (will receive invoiceId from saveAndSync)
(function deleteInvoice(invoiceId) {
  const savedInvoices = JSON.parse(getItem('all_invoices') || '[]');
  const updatedInvoices = savedInvoices.filter(inv => inv.id !== invoiceId);
  setItem('all_invoices', JSON.stringify(updatedInvoices));

  const allTransactions = JSON.parse(getItem('transactions') || '[]');
  let allSuppliers = JSON.parse(getItem('suppliers') || '[]');
  let allClients = JSON.parse(getItem('system_clients') || '[]');

  const transactionsToDelete = allTransactions.filter((t) => t.invoiceId === invoiceId);
  transactionsToDelete.forEach((t) => {
    if (t.supplierId) {
      allSuppliers = allSuppliers.map((s) => s.id === t.supplierId ? { ...s, totalOwed: (s.totalOwed || 0) - parseFloat(t.amount) } : s);
    }
    if (t.clientId) {
      allClients = allClients.map((c) => c.id === t.clientId ? { ...c, totalOwed: (c.totalOwed || 0) - parseFloat(t.amount) } : c);
    }
  });

  const updatedTransactions = allTransactions.filter((t) => t.invoiceId !== invoiceId);
  setItem('suppliers', JSON.stringify(allSuppliers));
  setItem('system_clients', JSON.stringify(allClients));
  setItem('transactions', JSON.stringify(updatedTransactions));

  console.log('\nAfter deleteInvoice:');
  console.log(loadStorage());
})(createdInvoiceId);
