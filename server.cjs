const crypto = require('crypto')
const fs = require('fs')
const http = require('http')
const path = require('path')
const { DatabaseSync } = require('node:sqlite')

const PORT = Number(process.env.PORT || 5177)
const ROOT = __dirname
const WEB_ROOT = path.join(ROOT, 'web')
const DATA_DIR = path.join(ROOT, 'data')
const SQLITE_PATH = path.join(DATA_DIR, 'haohudget.sqlite')

const COOKIE_NAME = 'haohudget_session'
const ADMIN_COOKIE_NAME = 'haohudget_admin'
const ADMIN_PASSWORD = '030825'
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000
const BEIJING_TIME_ZONE = 'Asia/Shanghai'
const DEFAULT_BOOKS = [
  { id: 'personal', name: '日常账本', icon: '🏠', sortOrder: 0 },
  { id: 'travel', name: '旅行账本', icon: '🧳', sortOrder: 1 }
]

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

ensureDataDir()
const db = new DatabaseSync(SQLITE_PATH)
db.exec('PRAGMA foreign_keys = ON')
db.exec('PRAGMA journal_mode = WAL')

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      nickname TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      avatar_data TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS books (
      user_id TEXT NOT NULL,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📒',
      sort_order INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL DEFAULT 'personal',
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      month TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      is_fixed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL DEFAULT 'personal',
      month TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      warn_rate REAL NOT NULL DEFAULT 0.8,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (user_id, book_id, month),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fixed_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL DEFAULT 'personal',
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      default_amount REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trip_books (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      place TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      budget REAL NOT NULL DEFAULT 0,
      cover_data TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planning',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trip_bills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      trip_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      payer TEXT NOT NULL DEFAULT '我',
      participants TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (trip_id) REFERENCES trip_books(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bills_user_month ON bills(user_id, month);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_books_user ON books(user_id, archived, sort_order);
    CREATE INDEX IF NOT EXISTS idx_fixed_items_user ON fixed_items(user_id, enabled);
    CREATE INDEX IF NOT EXISTS idx_trip_books_user ON trip_books(user_id, start_date, updated_at);
    CREATE INDEX IF NOT EXISTS idx_trip_bills_trip ON trip_bills(user_id, trip_id, date);
  `)

  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name)
  if (!userColumns.includes('avatar_data')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_data TEXT NOT NULL DEFAULT ''")
  }
}

function randomId() {
  return crypto.randomBytes(18).toString('hex')
}

function nowIso() {
  return new Date().toISOString()
}

function beijingParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
}

function beijingDateString(date = new Date()) {
  const parts = beijingParts(date)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function beijingMonthString(date = new Date()) {
  return beijingDateString(date).slice(0, 7)
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const candidate = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate)
}

function adminCookieValue() {
  return crypto.createHmac('sha256', ADMIN_PASSWORD)
    .update('haohao-account-admin')
    .digest('hex')
}

function json(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  })
  res.end(JSON.stringify(payload))
}

function text(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(payload)
}

function parseCookies(req) {
  const header = req.headers.cookie || ''
  return Object.fromEntries(header.split(';').filter(Boolean).map((item) => {
    const index = item.indexOf('=')
    return [
      decodeURIComponent(item.slice(0, index).trim()),
      decodeURIComponent(item.slice(index + 1).trim())
    ]
  }))
}

function cleanUser(user) {
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    createdAt: user.created_at,
    avatarData: user.avatar_data || ''
  }
}

function normalizeBookId(value = '') {
  const bookId = String(value || '').trim()
  return /^[a-z0-9_-]{1,32}$/i.test(bookId) ? bookId : 'personal'
}

function mapBook(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    sortOrder: row.sort_order,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function ensureUserBooks(userId) {
  const now = nowIso()
  const insert = db.prepare(`
    INSERT OR IGNORE INTO books (user_id, id, name, icon, sort_order, archived, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `)
  DEFAULT_BOOKS.forEach((book) => {
    insert.run(userId, book.id, book.name, book.icon, book.sortOrder, now, now)
  })
}

function activeBookIdForUser(userId, requestedBookId) {
  ensureUserBooks(userId)
  const bookId = normalizeBookId(requestedBookId)
  const exists = db.prepare('SELECT id FROM books WHERE user_id = ? AND id = ? AND archived = 0')
    .get(userId, bookId)
  return exists ? bookId : 'personal'
}

function getSessionUser(req) {
  const token = parseCookies(req)[COOKIE_NAME]
  if (!token) {
    return null
  }

  const now = Date.now()
  const row = db.prepare(`
    SELECT users.*
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ? AND sessions.expires_at > ?
  `).get(token, now)

  return row || null
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 3 * 1024 * 1024) {
        req.destroy()
        reject(new Error('Request body too large'))
      }
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function requireUser(req, res) {
  const user = getSessionUser(req)
  if (!user) {
    json(res, 401, { error: '请先登录' })
    return null
  }
  return user
}

function requireAdmin(req, res) {
  if (parseCookies(req)[ADMIN_COOKIE_NAME] !== adminCookieValue()) {
    json(res, 401, { error: '请先登录管理员' })
    return false
  }
  return true
}

function normalizeMonth(value = '') {
  return /^\d{4}-\d{2}$/.test(value) ? value : beijingMonthString()
}

function normalizePeriod(value = '') {
  return ['month', 'year'].includes(value) ? value : 'month'
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function periodRange(period, monthValue) {
  const month = normalizeMonth(monthValue)
  const year = Number(month.slice(0, 4))
  const monthIndex = Number(month.slice(5, 7)) - 1

  if (period === 'year') {
    return {
      start: `${year}-01-01`,
      end: `${year + 1}-01-01`,
      label: `${year} 年`,
      group: 'month'
    }
  }

  const endYear = monthIndex === 11 ? year + 1 : year
  const endMonth = monthIndex === 11 ? 1 : monthIndex + 2
  return {
    start: `${year}-${pad(monthIndex + 1)}-01`,
    end: `${endYear}-${pad(endMonth)}-01`,
    label: month,
    group: 'day'
  }
}

function normalizeDate(value = '') {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : beijingDateString()
}

function toMoneyNumber(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : 0
}

function mapBill(row) {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    type: row.type,
    amount: row.amount,
    category: row.category,
    date: row.date,
    month: row.month,
    note: row.note,
    isFixed: Boolean(row.is_fixed),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapBudget(row) {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    month: row.month,
    total: row.total,
    warnRate: row.warn_rate,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapFixedItem(row) {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    name: row.name,
    category: row.category,
    defaultAmount: row.default_amount,
    note: row.note,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapTrip(row) {
  const budget = Number(row.budget || 0)
  const expense = Number(row.expense || 0)
  const income = Number(row.income || 0)
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    place: row.place,
    startDate: row.start_date,
    endDate: row.end_date,
    budget,
    coverData: row.cover_data || '',
    note: row.note || '',
    status: row.status || 'planning',
    expense,
    income,
    balance: income - expense,
    budgetLeft: budget - expense,
    usedRate: budget ? expense / budget : 0,
    billCount: Number(row.bill_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapTripBill(row) {
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id,
    type: row.type,
    amount: row.amount,
    category: row.category,
    date: row.date,
    payer: row.payer || '我',
    participants: row.participants || '',
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (req.method === 'POST' && url.pathname === '/api/register') {
    const body = await readBody(req)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const nickname = String(body.nickname || '').trim() || '豪豪用户'

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      json(res, 400, { error: '请输入有效邮箱' })
      return
    }

    if (password.length < 6) {
      json(res, 400, { error: '密码至少 6 位' })
      return
    }

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (exists) {
      json(res, 409, { error: '这个邮箱已经注册过了' })
      return
    }

    const user = {
      id: randomId(),
      email,
      nickname,
      password_hash: hashPassword(password),
      created_at: nowIso()
    }
    const token = randomId()
    const expiresAt = Date.now() + ONE_WEEK

    db.prepare('INSERT INTO users (id, email, nickname, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(user.id, user.email, user.nickname, user.password_hash, user.created_at)
    ensureUserBooks(user.id)
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(token, user.id, Date.now(), expiresAt)

    json(res, 201, { user: cleanUser(user) }, {
      'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ONE_WEEK / 1000}`
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const body = await readBody(req)
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)

    if (!user || !verifyPassword(password, user.password_hash)) {
      json(res, 401, { error: '邮箱或密码不正确' })
      return
    }

    ensureUserBooks(user.id)
    const token = randomId()
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
    db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(token, user.id, Date.now(), Date.now() + ONE_WEEK)

    json(res, 200, { user: cleanUser(user) }, {
      'Set-Cookie': `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ONE_WEEK / 1000}`
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/logout') {
    const token = parseCookies(req)[COOKIE_NAME]
    if (token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    }
    json(res, 200, { ok: true }, {
      'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/me') {
    const user = getSessionUser(req)
    if (user) {
      ensureUserBooks(user.id)
    }
    json(res, 200, { user: user ? cleanUser(user) : null })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await readBody(req)
    if (String(body.password || '') !== ADMIN_PASSWORD) {
      json(res, 401, { error: '管理员密码不正确' })
      return
    }
    json(res, 200, { ok: true }, {
      'Set-Cookie': `${ADMIN_COOKIE_NAME}=${adminCookieValue()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ONE_WEEK / 1000}`
    })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
    json(res, 200, { ok: true }, {
      'Set-Cookie': `${ADMIN_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/summary') {
    if (!requireAdmin(req, res)) return
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const users = db.prepare(`
      SELECT
        users.id,
        users.email,
        users.nickname,
        users.created_at,
        COUNT(bills.id) AS bill_count,
        MAX(
          users.created_at,
          COALESCE((SELECT MAX(updated_at) FROM bills WHERE user_id = users.id), users.created_at),
          COALESCE((SELECT MAX(updated_at) FROM budgets WHERE user_id = users.id), users.created_at),
          COALESCE((SELECT MAX(updated_at) FROM fixed_items WHERE user_id = users.id), users.created_at),
          COALESCE((SELECT MAX(updated_at) FROM trip_books WHERE user_id = users.id), users.created_at),
          COALESCE((SELECT MAX(updated_at) FROM trip_bills WHERE user_id = users.id), users.created_at)
        ) AS last_activity_at
      FROM users
      LEFT JOIN bills ON bills.user_id = users.id
      GROUP BY users.id
      ORDER BY last_activity_at DESC
      LIMIT 50
    `).all()
    const totals = {
      users: db.prepare('SELECT COUNT(*) AS count FROM users').get().count,
      newUsers14d: db.prepare('SELECT COUNT(*) AS count FROM users WHERE created_at >= ?').get(fourteenDaysAgo).count
    }
    json(res, 200, { totals, users: users.map(cleanUser).map((user, index) => ({
      ...user,
      billCount: users[index].bill_count,
      lastActivityAt: users[index].last_activity_at
    })) })
    return
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/admin/users/') && url.pathname.endsWith('/detail')) {
    if (!requireAdmin(req, res)) return
    const parts = url.pathname.split('/').filter(Boolean)
    const userId = decodeURIComponent(parts[3] || '')
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
    if (!targetUser) {
      json(res, 404, { error: '用户不存在' })
      return
    }

    const month = normalizeMonth(url.searchParams.get('month') || '')
    const period = normalizePeriod(url.searchParams.get('period') || '')
    const range = periodRange(period, month)
    const income = db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM bills WHERE user_id = ? AND date >= ? AND date < ? AND type = 'income'")
      .get(userId, range.start, range.end).total
    const expense = db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM bills WHERE user_id = ? AND date >= ? AND date < ? AND type = 'expense'")
      .get(userId, range.start, range.end).total
    const ranking = db.prepare(`
      SELECT category, SUM(amount) AS amount
      FROM bills
      WHERE user_id = ? AND date >= ? AND date < ? AND type = 'expense'
      GROUP BY category
      ORDER BY amount DESC
    `).all(userId, range.start, range.end)
    const highestExpense = db.prepare(`
      SELECT category, amount, date, note
      FROM bills
      WHERE user_id = ? AND date >= ? AND date < ? AND type = 'expense'
      ORDER BY amount DESC
      LIMIT 1
    `).get(userId, range.start, range.end) || null
    const billCount = db.prepare('SELECT COUNT(*) AS count FROM bills WHERE user_id = ? AND date >= ? AND date < ?')
      .get(userId, range.start, range.end).count
    const bills = db.prepare(`
      SELECT *
      FROM bills
      WHERE user_id = ? AND date >= ? AND date < ?
      ORDER BY date DESC, created_at DESC
      LIMIT 120
    `).all(userId, range.start, range.end).map(mapBill)

    json(res, 200, {
      user: cleanUser(targetUser),
      summary: {
        month,
        period,
        label: range.label,
        income,
        expense,
        balance: income - expense,
        ranking,
        highestExpense,
        billCount
      },
      bills
    })
    return
  }

  const user = requireUser(req, res)
  if (!user) {
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/books') {
    ensureUserBooks(user.id)
    const books = db.prepare(`
      SELECT *
      FROM books
      WHERE user_id = ? AND archived = 0
      ORDER BY sort_order ASC, created_at ASC
    `).all(user.id).map(mapBook)
    json(res, 200, { books })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/books') {
    const body = await readBody(req)
    const name = String(body.name || '').trim()
    if (!name || name.length > 18) {
      json(res, 400, { error: '账本名称需要 1-18 个字' })
      return
    }
    const now = nowIso()
    const book = {
      id: normalizeBookId(body.id) === 'personal' ? `book_${randomId().slice(0, 12)}` : normalizeBookId(body.id),
      name,
      icon: String(body.icon || '📒').trim().slice(0, 4) || '📒',
      sortOrder: Number(db.prepare('SELECT COUNT(*) AS count FROM books WHERE user_id = ?').get(user.id).count || 0)
    }
    db.prepare(`
      INSERT INTO books (user_id, id, name, icon, sort_order, archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `).run(user.id, book.id, book.name, book.icon, book.sortOrder, now, now)
    const saved = db.prepare('SELECT * FROM books WHERE user_id = ? AND id = ?').get(user.id, book.id)
    json(res, 201, { book: mapBook(saved) })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/trips') {
    const trips = db.prepare(`
      SELECT
        trip_books.*,
        COALESCE(SUM(CASE WHEN trip_bills.type = 'expense' THEN trip_bills.amount ELSE 0 END), 0) AS expense,
        COALESCE(SUM(CASE WHEN trip_bills.type = 'income' THEN trip_bills.amount ELSE 0 END), 0) AS income,
        COUNT(trip_bills.id) AS bill_count
      FROM trip_books
      LEFT JOIN trip_bills ON trip_bills.trip_id = trip_books.id AND trip_bills.user_id = trip_books.user_id
      WHERE trip_books.user_id = ?
      GROUP BY trip_books.id
      ORDER BY trip_books.start_date DESC, trip_books.updated_at DESC
    `).all(user.id).map(mapTrip)
    json(res, 200, { trips })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/trips') {
    const body = await readBody(req)
    const title = String(body.title || '').trim()
    const place = String(body.place || '').trim()
    if (!title || title.length > 28) {
      json(res, 400, { error: '旅行标题需要 1-28 个字' })
      return
    }
    if (!place || place.length > 28) {
      json(res, 400, { error: '地点需要 1-28 个字' })
      return
    }
    const startDate = normalizeDate(body.startDate)
    const rawEndDate = normalizeDate(body.endDate || startDate)
    const endDate = rawEndDate < startDate ? startDate : rawEndDate
    const now = nowIso()
    const trip = {
      id: randomId(),
      userId: user.id,
      title,
      place,
      startDate,
      endDate,
      budget: toMoneyNumber(body.budget),
      coverData: String(body.coverData || '').trim(),
      note: String(body.note || '').trim(),
      status: ['planning', 'active', 'done'].includes(body.status) ? body.status : 'planning',
      createdAt: now,
      updatedAt: now
    }
    db.prepare(`
      INSERT INTO trip_books (id, user_id, title, place, start_date, end_date, budget, cover_data, note, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(trip.id, trip.userId, trip.title, trip.place, trip.startDate, trip.endDate, trip.budget, trip.coverData, trip.note, trip.status, trip.createdAt, trip.updatedAt)
    const saved = db.prepare('SELECT *, 0 AS expense, 0 AS income, 0 AS bill_count FROM trip_books WHERE id = ? AND user_id = ?')
      .get(trip.id, user.id)
    json(res, 201, { trip: mapTrip(saved) })
    return
  }

  if (req.method === 'PUT' && /^\/api\/trips\/[^/]+$/.test(url.pathname)) {
    const tripId = decodeURIComponent(url.pathname.split('/').pop())
    const existing = db.prepare('SELECT id FROM trip_books WHERE id = ? AND user_id = ?').get(tripId, user.id)
    if (!existing) {
      json(res, 404, { error: '旅行账本不存在' })
      return
    }
    const body = await readBody(req)
    const current = db.prepare('SELECT * FROM trip_books WHERE id = ? AND user_id = ?').get(tripId, user.id)
    const budget = Object.prototype.hasOwnProperty.call(body, 'budget') ? toMoneyNumber(body.budget) : current.budget
    const status = ['planning', 'active', 'done'].includes(body.status) ? body.status : current.status
    db.prepare('UPDATE trip_books SET budget = ?, status = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(budget, status, nowIso(), tripId, user.id)
    const saved = db.prepare(`
      SELECT
        trip_books.*,
        COALESCE(SUM(CASE WHEN trip_bills.type = 'expense' THEN trip_bills.amount ELSE 0 END), 0) AS expense,
        COALESCE(SUM(CASE WHEN trip_bills.type = 'income' THEN trip_bills.amount ELSE 0 END), 0) AS income,
        COUNT(trip_bills.id) AS bill_count
      FROM trip_books
      LEFT JOIN trip_bills ON trip_bills.trip_id = trip_books.id AND trip_bills.user_id = trip_books.user_id
      WHERE trip_books.id = ? AND trip_books.user_id = ?
      GROUP BY trip_books.id
    `).get(tripId, user.id)
    json(res, 200, { trip: mapTrip(saved) })
    return
  }

  if (req.method === 'GET' && /^\/api\/trips\/[^/]+$/.test(url.pathname)) {
    const tripId = decodeURIComponent(url.pathname.split('/').pop())
    const trip = db.prepare(`
      SELECT
        trip_books.*,
        COALESCE(SUM(CASE WHEN trip_bills.type = 'expense' THEN trip_bills.amount ELSE 0 END), 0) AS expense,
        COALESCE(SUM(CASE WHEN trip_bills.type = 'income' THEN trip_bills.amount ELSE 0 END), 0) AS income,
        COUNT(trip_bills.id) AS bill_count
      FROM trip_books
      LEFT JOIN trip_bills ON trip_bills.trip_id = trip_books.id AND trip_bills.user_id = trip_books.user_id
      WHERE trip_books.id = ? AND trip_books.user_id = ?
      GROUP BY trip_books.id
    `).get(tripId, user.id)
    if (!trip) {
      json(res, 404, { error: '旅行账本不存在' })
      return
    }
    const bills = db.prepare(`
      SELECT *
      FROM trip_bills
      WHERE trip_id = ? AND user_id = ?
      ORDER BY date DESC, created_at DESC
    `).all(tripId, user.id).map(mapTripBill)
    const ranking = db.prepare(`
      SELECT category, SUM(amount) AS amount
      FROM trip_bills
      WHERE trip_id = ? AND user_id = ? AND type = 'expense'
      GROUP BY category
      ORDER BY amount DESC
    `).all(tripId, user.id)
    const highestExpense = db.prepare(`
      SELECT category, amount, date, note
      FROM trip_bills
      WHERE trip_id = ? AND user_id = ? AND type = 'expense'
      ORDER BY amount DESC
      LIMIT 1
    `).get(tripId, user.id) || null
    json(res, 200, { trip: mapTrip(trip), bills, summary: { ranking, highestExpense } })
    return
  }

  if (req.method === 'POST' && /^\/api\/trips\/[^/]+\/bills$/.test(url.pathname)) {
    const parts = url.pathname.split('/').filter(Boolean)
    const tripId = decodeURIComponent(parts[2] || '')
    const trip = db.prepare('SELECT id FROM trip_books WHERE id = ? AND user_id = ?').get(tripId, user.id)
    if (!trip) {
      json(res, 404, { error: '旅行账本不存在' })
      return
    }
    const body = await readBody(req)
    const date = normalizeDate(body.date)
    const bill = {
      id: randomId(),
      userId: user.id,
      tripId,
      type: body.type === 'income' ? 'income' : 'expense',
      amount: toMoneyNumber(body.amount),
      category: String(body.category || '其他').trim() || '其他',
      date,
      payer: String(body.payer || '我').trim() || '我',
      participants: String(body.participants || '').trim(),
      note: String(body.note || '').trim(),
      createdAt: nowIso(),
      updatedAt: nowIso()
    }
    if (bill.amount <= 0) {
      json(res, 400, { error: '金额必须大于 0' })
      return
    }
    db.prepare(`
      INSERT INTO trip_bills (id, user_id, trip_id, type, amount, category, date, payer, participants, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bill.id, bill.userId, bill.tripId, bill.type, bill.amount, bill.category, bill.date, bill.payer, bill.participants, bill.note, bill.createdAt, bill.updatedAt)
    db.prepare('UPDATE trip_books SET updated_at = ? WHERE id = ? AND user_id = ?').run(nowIso(), tripId, user.id)
    json(res, 201, { bill })
    return
  }

  if (req.method === 'DELETE' && /^\/api\/trips\/[^/]+\/bills\/[^/]+$/.test(url.pathname)) {
    const parts = url.pathname.split('/').filter(Boolean)
    const tripId = decodeURIComponent(parts[2] || '')
    const billId = decodeURIComponent(parts[4] || '')
    const result = db.prepare('DELETE FROM trip_bills WHERE id = ? AND trip_id = ? AND user_id = ?')
      .run(billId, tripId, user.id)
    db.prepare('UPDATE trip_books SET updated_at = ? WHERE id = ? AND user_id = ?').run(nowIso(), tripId, user.id)
    json(res, 200, { ok: result.changes > 0 })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/profile') {
    const body = await readBody(req)
    const nickname = String(body.nickname ?? user.nickname).trim()
    if (!nickname || nickname.length > 24) {
      json(res, 400, { error: '昵称需要 1-24 个字' })
      return
    }
    const hasAvatarData = Object.prototype.hasOwnProperty.call(body, 'avatarData')
    const avatarData = hasAvatarData ? String(body.avatarData || '').trim() : user.avatar_data
    if (hasAvatarData && avatarData && !/^data:image\/(png|jpe?g|webp);base64,/i.test(avatarData)) {
      json(res, 400, { error: '头像格式不支持' })
      return
    }
    if (avatarData.length > 900000) {
      json(res, 400, { error: '头像图片太大，请换一张小一点的图片' })
      return
    }
    db.prepare('UPDATE users SET nickname = ?, avatar_data = ? WHERE id = ?').run(nickname, avatarData, user.id)
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
    json(res, 200, { user: cleanUser(updated) })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/change-password') {
    const body = await readBody(req)
    const currentPassword = String(body.currentPassword || '')
    const newPassword = String(body.newPassword || '')

    if (!verifyPassword(currentPassword, user.password_hash)) {
      json(res, 400, { error: '当前密码不正确' })
      return
    }

    if (newPassword.length < 6) {
      json(res, 400, { error: '新密码至少 6 位' })
      return
    }

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(hashPassword(newPassword), user.id)
    json(res, 200, { ok: true })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/summary') {
    const month = normalizeMonth(url.searchParams.get('month') || '')
    const period = normalizePeriod(url.searchParams.get('period') || '')
    const bookId = activeBookIdForUser(user.id, url.searchParams.get('bookId') || '')
    const range = periodRange(period, month)
    const income = db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM bills WHERE user_id = ? AND book_id = ? AND date >= ? AND date < ? AND type = 'income'")
      .get(user.id, bookId, range.start, range.end).total
    const expense = db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM bills WHERE user_id = ? AND book_id = ? AND date >= ? AND date < ? AND type = 'expense'")
      .get(user.id, bookId, range.start, range.end).total
    const budget = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND book_id = ? AND month = ?')
      .get(user.id, bookId, month)
    const ranking = db.prepare(`
      SELECT category, SUM(amount) AS amount
      FROM bills
      WHERE user_id = ? AND book_id = ? AND date >= ? AND date < ? AND type = 'expense'
      GROUP BY category
      ORDER BY amount DESC
    `).all(user.id, bookId, range.start, range.end)
    const budgetTotal = budget ? budget.total : 0
    const daysInPeriod = period === 'year' ? 12 : new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
    const highestExpense = db.prepare(`
      SELECT category, amount, date, note
      FROM bills
      WHERE user_id = ? AND book_id = ? AND date >= ? AND date < ? AND type = 'expense'
      ORDER BY amount DESC
      LIMIT 1
    `).get(user.id, bookId, range.start, range.end) || null
    const billCount = db.prepare('SELECT COUNT(*) AS count FROM bills WHERE user_id = ? AND book_id = ? AND date >= ? AND date < ?')
      .get(user.id, bookId, range.start, range.end).count

    json(res, 200, {
      month,
      period,
      bookId,
      label: range.label,
      income,
      expense,
      balance: income - expense,
      budget: budgetTotal,
      budgetLeft: budgetTotal - expense,
      usedRate: budgetTotal ? expense / budgetTotal : 0,
      ranking,
      averageExpense: expense / Math.max(1, daysInPeriod),
      highestExpense,
      billCount
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/bills') {
    const month = normalizeMonth(url.searchParams.get('month') || '')
    const period = normalizePeriod(url.searchParams.get('period') || '')
    const bookId = activeBookIdForUser(user.id, url.searchParams.get('bookId') || '')
    const range = periodRange(period, month)
    const bills = db.prepare(`
      SELECT *
      FROM bills
      WHERE user_id = ? AND book_id = ? AND date >= ? AND date < ?
      ORDER BY date DESC, created_at DESC
    `).all(user.id, bookId, range.start, range.end).map(mapBill)
    json(res, 200, { bills, period, bookId, label: range.label })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/bills') {
    const body = await readBody(req)
    const date = normalizeDate(body.date)
    const bill = {
      id: randomId(),
      userId: user.id,
      bookId: activeBookIdForUser(user.id, body.bookId || ''),
      type: body.type === 'income' ? 'income' : 'expense',
      amount: toMoneyNumber(body.amount),
      category: String(body.category || '其他').trim() || '其他',
      date,
      month: date.slice(0, 7),
      note: String(body.note || '').trim(),
      isFixed: Boolean(body.isFixed),
      createdAt: nowIso(),
      updatedAt: nowIso()
    }

    if (bill.amount <= 0) {
      json(res, 400, { error: '金额必须大于 0' })
      return
    }

    db.prepare(`
      INSERT INTO bills (id, user_id, book_id, type, amount, category, date, month, note, is_fixed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bill.id,
      bill.userId,
      bill.bookId,
      bill.type,
      bill.amount,
      bill.category,
      bill.date,
      bill.month,
      bill.note,
      bill.isFixed ? 1 : 0,
      bill.createdAt,
      bill.updatedAt
    )

    json(res, 201, { bill })
    return
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/bills/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop())
    const result = db.prepare('DELETE FROM bills WHERE id = ? AND user_id = ?').run(id, user.id)
    json(res, 200, { ok: result.changes > 0 })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/budget') {
    const month = normalizeMonth(url.searchParams.get('month') || '')
    const bookId = activeBookIdForUser(user.id, url.searchParams.get('bookId') || '')
    const budget = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND book_id = ? AND month = ?')
      .get(user.id, bookId, month)
    json(res, 200, { budget: budget ? mapBudget(budget) : { month, bookId, total: 0 } })
    return
  }

  if (req.method === 'PUT' && url.pathname === '/api/budget') {
    const body = await readBody(req)
    const month = normalizeMonth(body.month)
    const bookId = activeBookIdForUser(user.id, body.bookId || '')
    const total = toMoneyNumber(body.total)
    const existing = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND book_id = ? AND month = ?')
      .get(user.id, bookId, month)

    if (existing) {
      db.prepare('UPDATE budgets SET total = ?, updated_at = ? WHERE id = ?').run(total, nowIso(), existing.id)
    } else {
      db.prepare(`
        INSERT INTO budgets (id, user_id, book_id, month, total, warn_rate, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(randomId(), user.id, bookId, month, total, 0.8, nowIso(), nowIso())
    }

    const budget = db.prepare('SELECT * FROM budgets WHERE user_id = ? AND book_id = ? AND month = ?')
      .get(user.id, bookId, month)
    json(res, 200, { budget: mapBudget(budget) })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/fixed-items') {
    const bookId = activeBookIdForUser(user.id, url.searchParams.get('bookId') || '')
    const items = db.prepare('SELECT * FROM fixed_items WHERE user_id = ? AND book_id = ? AND enabled = 1 ORDER BY created_at DESC')
      .all(user.id, bookId)
      .map(mapFixedItem)
    json(res, 200, { items, bookId })
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/fixed-items') {
    const body = await readBody(req)
    const category = String(body.category || '其他').trim() || '其他'
    const item = {
      id: randomId(),
      userId: user.id,
      bookId: activeBookIdForUser(user.id, body.bookId || ''),
      name: String(body.name || '').trim() || category,
      category,
      defaultAmount: toMoneyNumber(body.defaultAmount),
      note: String(body.note || '').trim(),
      enabled: true,
      createdAt: nowIso(),
      updatedAt: nowIso()
    }

    if (item.defaultAmount <= 0) {
      json(res, 400, { error: '请填写金额' })
      return
    }

    db.prepare(`
      INSERT INTO fixed_items (id, user_id, book_id, name, category, default_amount, note, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(item.id, item.userId, item.bookId, item.name, item.category, item.defaultAmount, item.note, 1, item.createdAt, item.updatedAt)

    json(res, 201, { item })
    return
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/fixed-items/')) {
    const id = decodeURIComponent(url.pathname.split('/').pop())
    const result = db.prepare('UPDATE fixed_items SET enabled = 0, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(nowIso(), id, user.id)
    if (result.changes === 0) {
      json(res, 404, { error: '固定支出项目不存在' })
      return
    }
    json(res, 200, { ok: true })
    return
  }

  text(res, 404, 'Not found')
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  let filePath = path.join(WEB_ROOT, decodeURIComponent(url.pathname))

  if (url.pathname === '/' || !path.extname(filePath)) {
    filePath = path.join(WEB_ROOT, 'index.html')
  }

  if (!filePath.startsWith(WEB_ROOT) || !fs.existsSync(filePath)) {
    text(res, 404, 'Not found')
    return
  }

  const ext = path.extname(filePath).toLowerCase()
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  }
  const cacheControl = ['.html', '.css', '.js', '.webmanifest'].includes(ext)
    ? 'no-cache'
    : 'public, max-age=86400'

  res.writeHead(200, {
    'Content-Type': types[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl
  })
  fs.createReadStream(filePath).pipe(res)
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res).catch((error) => {
      console.error(error)
      json(res, 500, { error: '服务器开小差了' })
    })
    return
  }

  serveStatic(req, res)
})

initDb()
server.listen(PORT, () => {
  console.log(`豪豪记账网页应用已启动：http://localhost:${PORT}`)
  console.log(`SQLite 数据库：${SQLITE_PATH}`)
})
