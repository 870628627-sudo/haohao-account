const { getDb } = require('../utils/cloud')
const { formatMonth } = require('../utils/format')

const KEYS = {
  bills: 'haohudget:bills',
  budget: 'haohudget:budget',
  fixedItems: 'haohudget:fixedItems'
}

const COLLECTIONS = {
  bills: 'bills',
  budgets: 'budgets',
  fixedItems: 'fixed_items'
}

let cachedUserId = ''

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getLocal(key, fallback) {
  return wx.getStorageSync(key) || fallback
}

function setLocal(key, value) {
  wx.setStorageSync(key, value)
}

function nowIso() {
  return new Date().toISOString()
}

async function getUserId() {
  if (cachedUserId) {
    return cachedUserId
  }

  const localUserId = wx.getStorageSync('haohudget:userId')
  if (localUserId) {
    cachedUserId = localUserId
    return cachedUserId
  }

  if (wx.cloud) {
    try {
      const result = await wx.cloud.callFunction({ name: 'login' })
      cachedUserId = result.result.openid
      wx.setStorageSync('haohudget:userId', cachedUserId)
      return cachedUserId
    } catch (error) {
      console.warn('get openid failed, use local user id', error)
    }
  }

  cachedUserId = 'local-user'
  return cachedUserId
}

async function addBill(payload) {
  const userId = await getUserId()
  const bill = {
    id: uid(),
    userId,
    bookId: 'personal',
    ...payload,
    amount: Number(payload.amount),
    createdAt: nowIso(),
    updatedAt: nowIso()
  }

  const bills = getLocal(KEYS.bills, [])
  setLocal(KEYS.bills, [bill, ...bills])

  const db = getDb()
  if (db) {
    try {
      await db.collection(COLLECTIONS.bills).add({ data: bill })
    } catch (error) {
      console.warn('cloud add bill failed, local cache kept', error)
    }
  }

  return bill
}

async function listBills(month = formatMonth()) {
  const userId = await getUserId()
  const db = getDb()
  if (db) {
    try {
      const result = await db
        .collection(COLLECTIONS.bills)
        .where({
          userId,
          bookId: 'personal',
          month
        })
        .orderBy('date', 'desc')
        .orderBy('createdAt', 'desc')
        .get()

      setLocal(KEYS.bills, result.data)
      return result.data
    } catch (error) {
      console.warn('cloud list bills failed, use local cache', error)
    }
  }

  return getLocal(KEYS.bills, []).filter((bill) => bill.month === month)
}

async function removeBill(id) {
  const bills = getLocal(KEYS.bills, []).filter((bill) => bill.id !== id)
  setLocal(KEYS.bills, bills)

  const userId = await getUserId()
  const db = getDb()
  if (db) {
    try {
      const result = await db.collection(COLLECTIONS.bills).where({ id, userId }).get()
      await Promise.all(result.data.map((item) => db.collection(COLLECTIONS.bills).doc(item._id).remove()))
    } catch (error) {
      console.warn('cloud remove bill failed, local cache updated', error)
    }
  }
}

async function getBudget(month = formatMonth()) {
  const userId = await getUserId()
  const budgets = getLocal(KEYS.budget, {})
  const localBudget = budgets[month] || { month, total: 0, warnRate: 0.8 }

  const db = getDb()
  if (db) {
    try {
      const result = await db.collection(COLLECTIONS.budgets).where({ userId, bookId: 'personal', month }).limit(1).get()
      return result.data[0] || localBudget
    } catch (error) {
      console.warn('cloud get budget failed, use local cache', error)
    }
  }

  return localBudget
}

async function saveBudget(budget) {
  const userId = await getUserId()
  const budgets = getLocal(KEYS.budget, {})
  budgets[budget.month] = {
    userId,
    bookId: 'personal',
    warnRate: 0.8,
    ...budget,
    total: Number(budget.total || 0),
    updatedAt: nowIso()
  }
  setLocal(KEYS.budget, budgets)

  const db = getDb()
  if (db) {
    try {
      const result = await db.collection(COLLECTIONS.budgets).where({ userId, bookId: 'personal', month: budget.month }).limit(1).get()
      if (result.data[0]) {
        await db.collection(COLLECTIONS.budgets).doc(result.data[0]._id).update({ data: budgets[budget.month] })
      } else {
        await db.collection(COLLECTIONS.budgets).add({ data: budgets[budget.month] })
      }
    } catch (error) {
      console.warn('cloud save budget failed, local cache updated', error)
    }
  }
}

async function listFixedItems() {
  const userId = await getUserId()
  const db = getDb()
  if (db) {
    try {
      const result = await db.collection(COLLECTIONS.fixedItems).where({ userId, bookId: 'personal', enabled: true }).get()
      setLocal(KEYS.fixedItems, result.data)
      return result.data
    } catch (error) {
      console.warn('cloud list fixed items failed, use local cache', error)
    }
  }

  return getLocal(KEYS.fixedItems, [])
}

async function saveFixedItem(payload) {
  const userId = await getUserId()
  const item = {
    id: payload.id || uid(),
    userId,
    bookId: 'personal',
    enabled: true,
    ...payload,
    defaultAmount: Number(payload.defaultAmount || 0),
    updatedAt: nowIso()
  }

  const items = getLocal(KEYS.fixedItems, [])
  const next = items.some((old) => old.id === item.id)
    ? items.map((old) => (old.id === item.id ? item : old))
    : [item, ...items]
  setLocal(KEYS.fixedItems, next)

  const db = getDb()
  if (db) {
    try {
      const result = await db.collection(COLLECTIONS.fixedItems).where({ id: item.id, userId }).limit(1).get()
      if (result.data[0]) {
        await db.collection(COLLECTIONS.fixedItems).doc(result.data[0]._id).update({ data: item })
      } else {
        await db.collection(COLLECTIONS.fixedItems).add({ data: item })
      }
    } catch (error) {
      console.warn('cloud save fixed item failed, local cache updated', error)
    }
  }

  return item
}

function summarizeBills(bills, budget) {
  const income = bills.filter((bill) => bill.type === 'income').reduce((sum, bill) => sum + Number(bill.amount), 0)
  const expense = bills.filter((bill) => bill.type === 'expense').reduce((sum, bill) => sum + Number(bill.amount), 0)
  const totalBudget = Number(budget && budget.total ? budget.total : 0)
  const usedRate = totalBudget > 0 ? expense / totalBudget : 0

  return {
    income,
    expense,
    balance: income - expense,
    budget: totalBudget,
    budgetLeft: totalBudget > 0 ? totalBudget - expense : 0,
    usedRate
  }
}

module.exports = {
  addBill,
  listBills,
  removeBill,
  getBudget,
  saveBudget,
  listFixedItems,
  saveFixedItem,
  summarizeBills
}
