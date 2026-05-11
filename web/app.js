const bearSrc = '/assets/bear-ledger.jpg'
const canvasFontFamily = '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans SC", "Noto Sans CJK SC", "Source Han Sans SC", "WenQuanYi Micro Hei", "SimHei", sans-serif'
const BEIJING_TIME_ZONE = 'Asia/Shanghai'
const expenseCategories = ['早餐', '午餐', '晚餐', '水果', '奶茶', '零食', '交通', '话费网费', '日用品', '医疗', '娱乐', '王者荣耀', '保卫向日葵', '旅游', '购物', '理发', '人情往来', '其他']
const incomeCategories = ['工资', '生活费', '零花钱', '兼职', '红包', '退款', '其他']
const fixedCategories = ['水电燃气', '房租', '物业费', '停车费', '话费网费', '会员订阅', '小荷包', '其他']
const tripCategories = ['公交', '大巴', '火车', '飞机', '租车', '停车费', '住宿', '餐饮', '门票', '购物', '打车', '娱乐', '伴手礼', '加油', '签证', '保险', '其他']
const fallbackBooks = [
  { id: 'personal', name: '日常账本', icon: '🏠' },
  { id: 'travel', name: '旅行账本', icon: '🧳' }
]

const categoryIcons = {
  早餐: '🥣',
  午餐: '🍱',
  晚餐: '🍚',
  水果: '🍓',
  奶茶: '🧋',
  零食: '🍪',
  交通: '🚌',
  公交: '🚍',
  大巴: '🚌',
  火车: '🚄',
  飞机: '✈️',
  租车: '🚙',
  停车费: '🅿️',
  餐饮: '🍜',
  话费网费: '📶',
  住宿: '🏨',
  日用品: '🧻',
  医疗: '💊',
  娱乐: '🎬',
  王者荣耀: '🎮',
  保卫向日葵: '🌻',
  旅游: '🧳',
  购物: '🛍️',
  打车: '🚕',
  门票: '🎟️',
  伴手礼: '🎀',
  停车: '🅿️',
  加油: '⛽',
  签证: '🛂',
  保险: '🛡️',
  理发: '💈',
  人情往来: '🎁',
  工资: '💼',
  生活费: '🏠',
  零花钱: '🪙',
  兼职: '🧰',
  红包: '🧧',
  退款: '↩️',
  其他: '✨'
}

const state = {
  user: null,
  month: beijingMonthString(),
  period: 'month',
  billType: 'expense',
  selectedCategory: '午餐',
  activeView: 'home',
  bills: [],
  summary: null,
  fixedItems: [],
  books: fallbackBooks,
  activeBookId: localStorage.getItem('haohao-active-book') || 'personal',
  switchingBookId: '',
  trips: [],
  activeTripId: localStorage.getItem('haohao-active-trip') || '',
  activeTripTab: 'overview',
  travelPanel: '',
  travelDetail: null,
  tripStatusEditing: false,
  tripStatusDraft: '',
  selectedTripCategory: '公交',
  profileTool: '',
  accountMenuOpen: false,
  accountPanel: '',
  adminLoginOpen: false,
  adminPanelOpen: false,
  adminSummary: null,
  adminUserDetail: null,
  sharePanelOpen: false,
  shareImageUrl: '',
  heroMessageIndex: Math.floor(Math.random() * 12),
  billDraft: {
    amount: '',
    date: beijingDateString(),
    note: ''
  }
}

const app = document.querySelector('#app')

function money(value) {
  return Number(value || 0).toFixed(2)
}

function categoryIcon(category) {
  return categoryIcons[category] || '✨'
}

function currentBook() {
  return state.books.find((book) => book.id === state.activeBookId) || fallbackBooks[0]
}

function bookQuery() {
  return `bookId=${encodeURIComponent(state.activeBookId)}`
}

function isTravelBook() {
  return state.activeBookId === 'travel'
}

function dateRangeText(startDate, endDate) {
  if (!startDate && !endDate) return '未设置日期'
  if (startDate === endDate) return startDate
  return `${startDate} - ${endDate}`
}

function tripStatusText(status) {
  return ({ planning: '计划中', active: '进行中', done: '已结束' })[status] || '计划中'
}

function tripBudgetPercent(trip) {
  return Math.max(0, Math.round(Number(trip?.usedRate || 0) * 100))
}

function tripBudgetWidth(trip) {
  return Math.min(100, tripBudgetPercent(trip))
}

function travelTip(trip) {
  if (!trip) return '先建一张旅行卡片，豪豪再开始陪你盯路费。'
  if (!Number(trip.budget || 0)) return '这趟还没设置预算，建议先给钱包画一条旅行边界。'
  if (trip.usedRate >= 0.9) return '预算快到底了，接下来更适合看风景，少看菜单。'
  if (trip.usedRate >= 0.5) return '旅行预算已经过半，豪豪建议把购物欲先放慢一点。'
  return '这趟旅行预算还挺稳，可以继续保持快乐但有数。'
}

function localDateFromString(value) {
  const [year, month, day] = String(value || '').split('-').map(Number)
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : new Date()
}

function tripDayNumber(trip, date) {
  const start = localDateFromString(trip.startDate)
  const current = localDateFromString(date)
  const diff = Math.round((current - start) / 86400000)
  return Math.max(1, diff + 1)
}

function shortDateText(date) {
  const [, month, day] = String(date || '').split('-')
  return month && day ? `${month}月${day}日` : date
}

function buildTripTimeline(trip, bills) {
  const groups = new Map()
  ;[...(bills || [])].sort((a, b) => {
    const dateSort = String(a.date || '').localeCompare(String(b.date || ''))
    return dateSort || String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  }).forEach((bill) => {
    const date = bill.date || trip.startDate || beijingDateString()
    if (!groups.has(date)) {
      groups.set(date, {
        date,
        dayNumber: tripDayNumber(trip, date),
        total: 0,
        items: []
      })
    }
    const group = groups.get(date)
    if (bill.type !== 'income') {
      group.total += Number(bill.amount || 0)
    }
    group.items.push(bill)
  })
  return [...groups.values()]
}

function timelineDayNote(day) {
  if (!day.items.length) return '这天还没有记录。'
  const top = day.items
    .filter((item) => item.type !== 'income')
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0]
  return top ? `这天主要花在${top.category}上。` : '这天有收入记录，旅途账面变轻了一点。'
}

function beijingParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
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

function beijingYear() {
  return Number(beijingDateString().slice(0, 4))
}

function budgetPercent(summary) {
  return Math.max(0, Math.round(Number(summary.usedRate || 0) * 100))
}

function budgetBarWidth(summary) {
  return Math.min(100, budgetPercent(summary))
}

function budgetTone(summary) {
  const rate = Number(summary.usedRate || 0)
  if (rate >= 0.9) return 'danger'
  if (rate >= 0.5) return 'warn'
  return 'safe'
}

function budgetStatusText(summary) {
  if (!Number(summary.budget || 0)) return '本月还没设置预算'
  return `预算 ¥${money(summary.budget)} · 剩余 ¥${money(summary.budgetLeft)}`
}

function budgetInlineText(summary) {
  return Number(summary.budget || 0)
    ? `预算 ¥${money(summary.budget)} · 剩余 ¥${money(summary.budgetLeft)} · 支出 ¥${money(summary.expense)}`
    : `本月还没设置预算 · 支出 ¥${money(summary.expense)}`
}

function budgetTip(summary) {
  if (!Number(summary.budget || 0)) {
    return '豪豪小建议：先给本月设个预算，钱包就有一条温柔的护栏。'
  }
  const rate = Number(summary.usedRate || 0)
  if (rate >= 0.9) return '豪豪小建议：预算快见底了，今天先进入温柔省钱模式。'
  if (rate >= 0.5) return '豪豪小建议：预算进入中段，接下来花钱稍微带点数。'
  return '豪豪小建议：预算很稳，今天的钱包还有一点底气。'
}

function monthLabel(month) {
  const [year, monthNumber] = String(month || '').split('-')
  if (!year || !monthNumber) return '当前月份'
  return `${year}年${monthNumber}月`
}

function formatDateTime(value) {
  if (!value) return '暂无'
  const raw = String(value)
  const normalized = raw.includes('T') && !/(Z|[+-]\d{2}:?\d{2})$/.test(raw) ? `${raw}Z` : raw
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return raw
  const parts = beijingParts(date)
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}

function summaryLabel() {
  return state.period === 'year' ? `${selectedYear()}年度账单` : `${monthLabel(state.month)}账单`
}

const heroMessages = [
  { title: '钱包还站得住吗？', text: '记账不是抠门，是给钱安排一个明白的去处。' },
  { title: '今天的钱有去处了吗？', text: '每一笔都写清楚，月底就少一点悬疑片剧情。' },
  { title: '豪豪开始巡账了', text: '收入、支出、结余都在这里，钱包有没有委屈一眼就知道。' },
  { title: '先看余额，再谈快乐', text: '快乐可以有，预算也要坐在同一张桌上。' },
  { title: '本月消费天气预报', text: '目前账面已更新，豪豪建议出门前先看一眼钱包气压。' },
  { title: '钱去哪儿了？', text: '别让它无声失踪，记下来就有迹可循。' },
  { title: '今日钱包体检', text: '不怕花钱，就怕花完以后谁也说不清。' },
  { title: '豪豪正在盯账', text: '该花的花，该省的省，乱跑的钱一个都别想躲。' },
  { title: '预算线还好吗？', text: '每次打开看一眼，月底就少一次心跳加速。' },
  { title: '账本醒了', text: '它不审判生活，它只帮你看清生活花在哪里。' },
  { title: '钱包今日上线', text: '先把账摆明白，再决定要不要奖励自己。' },
  { title: '豪豪给你盘一盘', text: '数字不骗人，但豪豪会负责把话说得好听一点。' }
]

const shareMessages = [
  { title: '钱包体检报告', text: '豪豪把本期账单翻了一遍，重点已经圈好。' },
  { title: '本期花钱地图', text: '钱都去了哪里，豪豪已经用图给你摊开。' },
  { title: '账单小结出炉', text: '收入、支出和预算都在这里，月底复盘不再靠感觉。' },
  { title: '钱包状态播报', text: '这份账单不吓人，只负责把生活花销讲清楚。' },
  { title: '消费结构观察', text: '豪豪把支出切成了几块，哪块最抢眼一眼就知道。' },
  { title: '本期账面快照', text: '每一笔都算数，合起来就是这段时间的生活轮廓。' },
  { title: '预算巡逻完成', text: '豪豪看过预算线了，接下来花钱可以更有底。' },
  { title: '账本今日营业', text: '数字排好队，钱包有没有压力就看这一张。' },
  { title: '支出结构复盘', text: '不是审判生活，是帮你看清钱花在哪些地方。' },
  { title: '钱包晴雨表', text: '余额、支出和预算一起看，心里会更稳一点。' },
  { title: '本期消费切片', text: '豪豪把账单切成扇形，最大那块已经藏不住了。' },
  { title: '账单温柔版', text: '花出去的钱都有名字，复盘起来就少一点迷糊。' },
  { title: '豪豪记账简报', text: '这期账单已经整理好，适合保存，也适合提醒自己。' },
  { title: '钱包复盘卡', text: '看清支出结构，比单纯心疼余额更有用。' },
  { title: '本期账单拼图', text: '每类支出都是一块拼图，拼起来就是消费习惯。' },
  { title: '预算线观察员', text: '豪豪已经盯过预算进度，剩下的交给下一次选择。' },
  { title: '生活花销记录', text: '钱不是凭空消失的，它只是变成了这一张图。' },
  { title: '消费雷达打开', text: '哪类支出最活跃，豪豪已经帮你标出来了。' },
  { title: '账单复盘时刻', text: '本期花销已经归位，下一期可以更从容。' },
  { title: '钱包小结卡', text: '把账记清楚，是给未来的自己留一盏灯。' }
]

function pickShareMessage() {
  return shareMessages[Math.floor(Math.random() * shareMessages.length)]
}

function refreshHeroMessage() {
  state.heroMessageIndex = Math.floor(Math.random() * heroMessages.length)
}

function currentHeroMessage(summary) {
  if (summary.usedRate >= 1) {
    return { title: '预算已经拉响警报', text: '本月预算已经花穿，豪豪建议今天先别和支付软件见面。' }
  }
  if (summary.usedRate >= 0.8) {
    return { title: '钱包进入观察期', text: '预算使用超过八成，接下来每一笔都值得认真看一眼。' }
  }
  return heroMessages[state.heroMessageIndex % heroMessages.length]
}

function escapeAttr(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function avatarSrc() {
  return state.user?.avatarData || bearSrc
}

async function syncFixedItems() {
  const fixedItems = await api(`/api/fixed-items?${bookQuery()}`)
  state.fixedItems = fixedItems.items || []
  return state.fixedItems
}

async function syncBooks() {
  const data = await api('/api/books')
  state.books = data.books?.length ? data.books : fallbackBooks
  if (!state.books.some((book) => book.id === state.activeBookId)) {
    state.activeBookId = 'personal'
    localStorage.setItem('haohao-active-book', state.activeBookId)
  }
  return state.books
}

async function loadTravelDashboard() {
  const [data, detail] = await Promise.all([
    api('/api/trips'),
    state.activeTripId
      ? api(`/api/trips/${encodeURIComponent(state.activeTripId)}`).catch(() => null)
      : Promise.resolve(null)
  ])
  state.trips = data.trips || []
  if (state.activeTripId && !state.trips.some((trip) => trip.id === state.activeTripId)) {
    state.activeTripId = ''
    state.travelDetail = null
    localStorage.removeItem('haohao-active-trip')
  }
  if (state.activeTripId) {
    state.travelDetail = detail || await api(`/api/trips/${encodeURIComponent(state.activeTripId)}`)
  }
}

function renderFixedItemList() {
  return `
    <div class="list fixed-list">
      ${state.fixedItems.length ? state.fixedItems.map((item) => `
        <div class="bill">
          <div><strong>${escapeAttr(item.name)}</strong><small>${escapeAttr(item.category)}</small></div>
          <div class="amount">
            <strong>¥${money(item.defaultAmount)}</strong>
            <div class="bill-actions">
              <button class="btn secondary" data-record-fixed="${escapeAttr(item.id)}" type="button">记本月</button>
              <button class="btn danger" data-delete-fixed="${escapeAttr(item.id)}" type="button">删除</button>
            </div>
          </div>
        </div>
      `).join('') : '<p class="muted">还没有固定支出项目。</p>'}
    </div>
  `
}

function renderProfileSection(summary) {
  const isBudget = state.profileTool === 'budget'
  const isFixed = state.profileTool === 'fixed'
  return `
    <section class="card view-section profile-panel ${state.activeView === 'profile' ? 'active-view' : ''}" data-view="profile">
      <div class="profile-tool-tabs">
        <button class="${isBudget ? 'active' : ''}" data-profile-tool="budget" type="button">
          <strong>月度预算 <em>${budgetPercent(summary)}%</em></strong>
          <div class="budget-chip-progress budget-${budgetTone(summary)}"><span style="width:${budgetBarWidth(summary)}%"></span></div>
          <span class="budget-chip-text">${budgetStatusText(summary)}</span>
        </button>
        <button class="${isFixed ? 'active' : ''}" data-profile-tool="fixed" type="button">
          <strong>固定支出项目</strong>
          <span>${state.fixedItems.length} 项 · 点开新增或修改</span>
        </button>
      </div>
      ${isBudget ? `
        <div class="profile-tool-body">
          <div class="section-title compact-title"><h3>月度预算</h3><strong>${Math.round(summary.usedRate * 100)}%</strong></div>
          <div class="bar budget-progress budget-${budgetTone(summary)}"><span style="width:${budgetBarWidth(summary)}%"></span></div>
          <p class="muted">${budgetStatusText(summary)}</p>
          <form class="form budget-form" id="budgetForm">
            <input class="input" name="total" type="number" min="0" step="0.01" placeholder="设置本月总预算" value="${summary.budget || ''}" />
            <button class="btn secondary" type="submit">保存预算</button>
          </form>
        </div>
      ` : ''}
      ${isFixed ? `
        <div class="profile-tool-body">
          <div class="section-title compact-title"><h3>固定支出</h3><button class="btn secondary" data-profile-tool-close type="button">收起</button></div>
          <form class="form" id="fixedForm">
            <input class="input" name="name" placeholder="项目名，可不填，默认用分类名" />
            <div class="grid-2">
              <input class="input" name="defaultAmount" type="number" min="0.01" step="0.01" placeholder="金额" required />
              <select class="select" name="category">${fixedCategories.map((item) => `<option>${item}</option>`).join('')}</select>
            </div>
            <button class="btn secondary" type="submit">保存项目</button>
          </form>
          ${renderFixedItemList()}
        </div>
      ` : ''}
      ${!isBudget && !isFixed ? `
        ${renderFixedItemList()}
      ` : ''}
    </section>
  `
}

function renderAdminUserDetail(detail) {
  const user = detail.user
  const summary = detail.summary || { income: 0, expense: 0, balance: 0, billCount: 0, ranking: [], highestExpense: null }
  const maxRank = Math.max(...(summary.ranking || []).map((item) => item.amount), 1)
  return `
    <div class="admin-detail">
      <button class="btn secondary admin-back" id="adminBackBtn" type="button">返回用户列表</button>
      <div class="admin-detail-head">
        <div>
          <h3>${escapeAttr(user.nickname)}</h3>
          <p class="muted">${escapeAttr(user.email)} · 注册时间（北京）：${formatDateTime(user.createdAt)}</p>
        </div>
        <strong>${summary.period === 'year' ? selectedYear() + '年度' : monthLabel(summary.month)}</strong>
      </div>
      <div class="stats-summary admin-detail-stats">
        <div class="stat-tile primary"><span>总支出</span><strong>¥${money(summary.expense)}</strong></div>
        <div class="stat-tile"><span>总收入</span><strong class="income">¥${money(summary.income)}</strong></div>
        <div class="stat-tile"><span>结余</span><strong class="${summary.balance >= 0 ? 'income' : 'expense'}">¥${money(summary.balance)}</strong></div>
        <div class="stat-tile"><span>消费笔数</span><strong>${summary.billCount || 0}</strong></div>
        <div class="stat-tile"><span>最高单笔</span><strong>${summary.highestExpense ? `¥${money(summary.highestExpense.amount)}` : '暂无'}</strong></div>
        <div class="stat-tile"><span>分类数</span><strong>${(summary.ranking || []).length}</strong></div>
      </div>
      <div class="admin-detail-section">
        <h4>支出分类</h4>
        <div class="rank">
          ${(summary.ranking || []).length ? summary.ranking.slice(0, 6).map((item) => `
            <div class="rank-row">
              <span>${escapeAttr(item.category)}</span>
              <div class="bar"><span style="width:${Math.max(6, Math.round(item.amount / maxRank * 100))}%"></span></div>
              <strong>¥${money(item.amount)}</strong>
            </div>
          `).join('') : '<p class="muted">这个账期暂无支出分类。</p>'}
        </div>
      </div>
      <div class="admin-detail-section">
        <h4>账单明细</h4>
        <div class="admin-bill-list">
          ${(detail.bills || []).length ? detail.bills.map((bill) => `
            <div class="admin-bill">
              <div>
                <strong>${escapeAttr(bill.category)}</strong>
                <small>${escapeAttr(bill.date)}${bill.note ? ` · ${escapeAttr(bill.note)}` : ''}</small>
              </div>
              <span class="${bill.type === 'income' ? 'income' : 'expense'}">${bill.type === 'income' ? '+' : '-'}¥${money(bill.amount)}</span>
            </div>
          `).join('') : '<p class="muted">这个账期暂无账单。</p>'}
        </div>
      </div>
    </div>
  `
}

function renderTripForm() {
  return `
    <div class="travel-modal-card">
      <div class="travel-modal-head">
        <h3>新建旅行</h3>
        <button class="btn secondary" id="tripFormCloseBtn" type="button">关闭</button>
      </div>
      <form class="form" id="tripForm">
        <div class="field">
          <label>旅行名称</label>
          <input class="input" name="title" maxlength="28" placeholder="比如 杭州三日游" required />
        </div>
        <div class="form-grid two travel-date-grid">
          <div class="field">
            <label>开始日期</label>
            <input class="input travel-date-input" name="startDate" type="date" value="${beijingDateString()}" required />
          </div>
          <div class="field">
            <label>结束日期</label>
            <input class="input travel-date-input" name="endDate" type="date" value="${beijingDateString()}" required />
          </div>
        </div>
        <div class="field">
          <label>预算</label>
          <input class="input" name="budget" type="number" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div class="field">
          <label>备注</label>
          <input class="input" name="note" placeholder="比如 这趟主要是吃，不许装不知道" />
        </div>
        <button class="btn" type="submit">创建旅行</button>
      </form>
    </div>
  `
}

function renderTripBudgetForm() {
  const trip = state.travelDetail?.trip
  if (!trip) return ''
  return `
    <div class="travel-modal-card compact">
      <div class="travel-modal-head">
        <h3>设置预算</h3>
        <button class="btn secondary" id="tripBudgetCloseBtn" type="button">关闭</button>
      </div>
      <form class="form" id="tripBudgetForm">
        <div class="field">
          <label>${escapeAttr(trip.title)} 的旅行预算</label>
          <input class="input amount-input" name="budget" type="number" min="0" step="0.01" placeholder="0.00" value="${Number(trip.budget || 0) ? escapeAttr(trip.budget) : ''}" />
        </div>
        <button class="btn" type="submit">保存预算</button>
      </form>
    </div>
  `
}

function renderTripCityEditorForm() {
  const detail = state.travelDetail
  const trip = detail?.trip
  if (!trip) return ''
  const cities = detail.cities || []
  return `
    <div class="travel-modal-card compact">
      <div class="travel-modal-head">
        <h3>编辑旅行城市</h3>
        <button class="btn secondary" id="tripCityCloseBtn" type="button">关闭</button>
      </div>
      <div class="trip-city-editor-copy">
        <strong>${escapeAttr(trip.title)}</strong>
        <span>把走过或计划去的城市按顺序放进来，之后回看会更有路线感。</span>
      </div>
      <form class="trip-city-form" id="tripCityForm">
        <input class="input" name="name" maxlength="18" placeholder="添加城市名，比如 杭州" required />
        <button class="btn secondary" type="submit">添加</button>
      </form>
      <div class="trip-city-route editor">
        ${cities.length ? cities.map((city, index) => `
          <div class="trip-city-node editable">
            <span>${index + 1}</span>
            <strong>${escapeAttr(city.name)}</strong>
            <button class="btn secondary" data-delete-trip-city="${escapeAttr(city.id)}" type="button">删除</button>
          </div>
        `).join('') : '<p class="muted">还没有城市节点。先加一个城市，慢慢把这趟旅行串起来。</p>'}
      </div>
    </div>
  `
}

function renderTravelSheet() {
  if (!isTravelBook() || !state.travelPanel) return ''
  const body = state.travelPanel === 'budget'
    ? renderTripBudgetForm()
    : state.travelPanel === 'cities'
      ? renderTripCityEditorForm()
      : renderTripForm()
  return `
    <div class="travel-sheet" role="dialog" aria-modal="true" aria-label="旅行设置">
      ${body}
    </div>
  `
}

function renderTravelHome() {
  const totalExpense = state.trips.reduce((sum, trip) => sum + Number(trip.expense || 0), 0)
  const activeCount = state.trips.filter((trip) => trip.status !== 'done').length
  return `
    <div class="travel-workspace">
      <section class="travel-hero">
        <div>
          <div class="eyebrow">旅行账本</div>
        </div>
        <button class="btn travel-new-btn" id="tripNewBtn" type="button">新建旅行</button>
      </section>

      <div class="travel-overview-strip">
        <div><span>旅行数</span><strong>${state.trips.length}</strong></div>
        <div><span>进行中</span><strong>${activeCount}</strong></div>
        <div><span>总支出</span><strong>¥${money(totalExpense)}</strong></div>
      </div>

      <section class="travel-card-grid">
        ${state.trips.length ? state.trips.map((trip) => `
          <button class="trip-card" data-trip-open="${escapeAttr(trip.id)}" type="button">
            <div class="trip-card-body">
              <div class="trip-card-head">
                <strong>${escapeAttr(trip.title)}</strong>
                <em>${tripStatusText(trip.status)}</em>
              </div>
              <p>${dateRangeText(trip.startDate, trip.endDate)}</p>
              <div class="trip-card-money">
                <span>已花 ¥${money(trip.expense)}</span>
                <span>${Number(trip.budget || 0) ? `预算 ¥${money(trip.budget)}` : '未设预算'}</span>
              </div>
              <div class="budget-progress budget-${budgetTone(trip)}"><span style="width:${tripBudgetWidth(trip)}%"></span></div>
              <small>${trip.note ? escapeAttr(trip.note) : travelTip(trip)}</small>
            </div>
          </button>
        `).join('') : '<p class="muted travel-empty">还没有旅行卡片。先创建一趟，豪豪就能开始盯路费。</p>'}
      </section>
    </div>
  `
}

function renderTripDetail() {
  const detail = state.travelDetail
  const trip = detail?.trip
  if (!trip) return renderTravelHome()
  const bills = detail.bills || []
  const cities = detail.cities || []
  const ranking = detail.summary?.ranking || []
  const timeline = buildTripTimeline(trip, bills)
  const highest = detail.summary?.highestExpense
  return `
    <div class="travel-workspace trip-detail">
      ${state.activeTripTab === 'overview' ? `
        <section class="travel-detail-hero budget-${budgetTone(trip)}">
          <div class="travel-detail-title">
            <div class="travel-detail-meta">
              <span>旅行</span>
              <button class="trip-status-pill" data-trip-status-toggle type="button">${tripStatusText(trip.status)}</button>
            </div>
            <div class="travel-title-row">
              <h2>${escapeAttr(trip.title)}</h2>
              <p>${dateRangeText(trip.startDate, trip.endDate)}</p>
            </div>
          </div>
          <div class="travel-detail-budget">
            <div><span>已花</span><strong>¥${money(trip.expense)}</strong></div>
            <button class="travel-budget-button" data-trip-budget type="button"><span>预算</span><strong>${Number(trip.budget || 0) ? `¥${money(trip.budget)}` : '未设置'}</strong></button>
            <div><span>剩余</span><strong>¥${money(trip.budgetLeft)}</strong></div>
          </div>
          <div class="budget-progress"><span style="width:${tripBudgetWidth(trip)}%"></span></div>
          ${state.tripStatusEditing ? `
            <form class="trip-status-form hero-status-editor" id="tripStatusForm">
              <div class="trip-status-options">
                ${[
                  ['planning', '计划中'],
                  ['active', '进行中'],
                  ['done', '已完成']
                ].map(([status, label]) => `
                  <button class="${(state.tripStatusDraft || trip.status) === status ? 'active' : ''}" data-trip-status-choice="${status}" type="button">${label}</button>
                `).join('')}
              </div>
              <button class="btn secondary" type="submit">保存</button>
            </form>
          ` : ''}
        </section>
        <section class="travel-panel">
          <div class="trip-city-plan">
            <div class="trip-city-head">
              <div>
                <span>旅行城市</span>
              </div>
              <button class="btn secondary" data-trip-cities type="button">编辑城市</button>
            </div>
            <div class="trip-city-route display">
              ${cities.length ? cities.map((city, index) => `
                <div class="trip-city-node">
                  <span>${index + 1}</span>
                  <strong>${escapeAttr(city.name)}</strong>
                </div>
              `).join('') : '<p class="muted">还没有城市节点。把这趟旅行经过的城市一个个放进来，之后回看会很有画面。</p>'}
            </div>
          </div>
          <div class="stats-summary">
            <div class="stat-tile primary"><span>总支出</span><strong>¥${money(trip.expense)}</strong></div>
            <div class="stat-tile"><span>总收入</span><strong class="income">¥${money(trip.income)}</strong></div>
            <div class="stat-tile"><span>消费笔数</span><strong>${trip.billCount || 0}</strong></div>
            <div class="stat-tile"><span>最高单笔</span><strong>${highest ? `¥${money(highest.amount)}` : '暂无'}</strong></div>
            <div class="stat-tile"><span>预算使用</span><strong>${tripBudgetPercent(trip)}%</strong></div>
            <div class="stat-tile"><span>最花钱</span><strong>${ranking[0]?.category || '暂无'}</strong></div>
          </div>
        </section>
      ` : ''}

      ${state.activeTripTab === 'add' ? `
        <section class="travel-panel">
          <form class="form" id="tripBillForm">
            <div class="amount-save-row">
              <div class="field">
                <label>金额</label>
                <input class="input amount-input" name="amount" type="number" min="0" step="0.01" placeholder="0.00" required />
              </div>
              <button class="btn save-inline" type="submit">保存</button>
            </div>
            <div class="compact-date-row">
              <div class="field">
                <label>日期</label>
                <input class="input date-compact" name="date" type="date" value="${beijingDateString()}" required />
              </div>
            </div>
            <div class="field">
              <label>旅行分类</label>
              <div class="category-grid trip-category-grid">
                ${tripCategories.map((item) => `
                  <button class="category-chip ${state.selectedTripCategory === item ? 'active' : ''}" type="button" data-trip-category="${item}" aria-pressed="${state.selectedTripCategory === item ? 'true' : 'false'}">
                    <span class="category-icon">${categoryIcon(item)}</span>
                    <span class="category-name">${item}</span>
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="field">
              <label>备注</label>
              <input class="input" name="note" placeholder="比如 高铁、酒店、景区门票" />
            </div>
          </form>
        </section>
      ` : ''}

      ${state.activeTripTab === 'bills' ? `
        <section class="travel-panel">
          <div class="list">
            ${bills.length ? bills.map((bill) => `
              <div class="bill">
                <div>
                  <strong>${categoryIcon(bill.category)} ${escapeAttr(bill.category)}</strong>
                  <small>${escapeAttr(bill.date)}${bill.note ? ` · ${escapeAttr(bill.note)}` : ''}</small>
                </div>
                <div class="amount expense">
                  -¥${money(bill.amount)}
                  <br /><button class="btn secondary" data-delete-trip-bill="${escapeAttr(bill.id)}" style="min-height: 30px; padding: 0 10px; border-radius: 10px; margin-top: 6px;">删除</button>
                </div>
              </div>
            `).join('') : '<p class="muted">这趟旅行还没有账单，豪豪暂时只看风景。</p>'}
          </div>
        </section>
      ` : ''}

      ${state.activeTripTab === 'stats' ? `
        <section class="travel-panel">
          <div class="trip-journey-head">
            <div>
              <span>消费历程</span>
              <strong>${escapeAttr(trip.title)}</strong>
            </div>
            <em>${timeline.length} 天 · ${bills.length} 笔</em>
          </div>
          <div class="trip-timeline">
            ${timeline.length ? timeline.map((day) => `
              <article class="trip-day">
                <div class="trip-day-marker"></div>
                <div class="trip-day-card">
                  <div class="trip-day-head">
                    <div>
                      <span>第 ${day.dayNumber} 天</span>
                      <strong>${shortDateText(day.date)}</strong>
                    </div>
                    <em>¥${money(day.total)}</em>
                  </div>
                  <p>${timelineDayNote(day)}</p>
                  <div class="trip-day-items">
                    ${day.items.map((bill) => `
                      <div class="trip-day-item">
                        <span>${categoryIcon(bill.category)}</span>
                        <div>
                          <strong>${escapeAttr(bill.category)}</strong>
                          <small>${escapeAttr(bill.note || '旅行消费')}</small>
                        </div>
                        <em class="${bill.type === 'income' ? 'income' : 'expense'}">${bill.type === 'income' ? '+' : '-'}¥${money(bill.amount)}</em>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </article>
            `).join('') : '<p class="muted">还没有消费历程。先在旅行里记一笔，豪豪再帮你串成时间线。</p>'}
          </div>
          ${timeline.length ? `
            <div class="trip-journey-summary">
              这趟旅行一共记录 ${bills.length} 笔，花费 ¥${money(trip.expense)}${highest ? `，最高单笔是 ${highest.category} ¥${money(highest.amount)}` : ''}。
            </div>
          ` : ''}
        </section>
      ` : ''}
    </div>
  `
}

function renderTravelWorkspace() {
  return state.activeTripId && state.travelDetail ? renderTripDetail() : renderTravelHome()
}

function captureBillDraft() {
  const form = document.querySelector('#billForm')
  if (!form) return
  const data = new FormData(form)
  state.billDraft = {
    amount: String(data.get('amount') || ''),
    date: String(data.get('date') || beijingDateString()),
    note: String(data.get('note') || '')
  }
}

function periodName(period) {
  return ({ month: '月度账单', year: '年度账单' })[period] || '月度账单'
}

function selectedYear() {
  return state.month.slice(0, 4)
}

function yearOptions() {
  const currentYear = beijingYear()
  const chosenYear = Number(selectedYear())
  const years = new Set()
  for (let year = currentYear - 5; year <= currentYear + 2; year += 1) {
    years.add(year)
  }
  if (Number.isFinite(chosenYear)) years.add(chosenYear)
  return [...years].sort((a, b) => b - a)
}

function periodDateInput(id) {
  if (state.period === 'year') {
    return `
      <select class="select date-compact year-compact" id="${id}" aria-label="选择年份">
        ${yearOptions().map((year) => `<option value="${year}" ${String(year) === selectedYear() ? 'selected' : ''}>${year}年</option>`).join('')}
      </select>
    `
  }

  return `<input class="input date-compact" id="${id}" type="month" value="${state.month}" />`
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || '请求失败')
  }
  return data
}

function toast(message) {
  const old = document.querySelector('.toast')
  if (old) old.remove()
  const el = document.createElement('div')
  el.className = 'toast'
  el.textContent = message
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2600)
}

function judge(message) {
  const old = document.querySelector('.judge')
  if (old) old.remove()
  const el = document.createElement('div')
  el.className = 'judge'
  el.innerHTML = `
    <div class="judge-card">
      <img src="${bearSrc}" alt="豪豪小熊" />
      <div>
        <strong>豪豪审判</strong>
        <p>${message}</p>
      </div>
      <button type="button">知道了</button>
    </div>
  `
  document.body.appendChild(el)
  el.querySelector('button').addEventListener('click', () => el.remove())
  el.addEventListener('click', (event) => {
    if (event.target === el) el.remove()
  })
  setTimeout(() => el.remove(), 5200)
}

function pickComment(record, comments) {
  const seedText = `${record.id || ''}${record.category || ''}${record.date || ''}${record.amount || ''}`
  let seed = 0
  for (let index = 0; index < seedText.length; index += 1) {
    seed = (seed + seedText.charCodeAt(index) * (index + 1)) % 9973
  }
  return comments[seed % comments.length]
}

function bearComment(record) {
  const amount = Number(record.amount || 0)
  const category = record.category || '其他'
  const necessaryCategories = ['交通', '水电燃气', '房租', '话费网费']

  if (record.type === 'income') {
    if (amount >= 3000) return pickComment(record, ['大额收入到账，豪豪宣布钱包今天恢复编制。', '这笔收入很顶，先别急着奖励自己，豪豪已经盯住购物车了。', '钱包突然精神了，但豪豪建议先把预算排个队。', '收入大部队抵达，豪豪建议先把储蓄位安排上。', '这笔进账很有排面，钱包今天走路都带风。', '钱来了是好事，豪豪提醒别让快乐消费立刻集合。'])
    if (amount >= 500) return pickComment(record, ['收入到账，钱包终于等到一点尊重。', '这笔进账不错，豪豪建议先存一口，再花一口。', '钱来了，豪豪提醒你别让它刚进门就下班。', '进账已登记，豪豪建议给预算表一点掌声。', '这笔收入让余额体面了一点，先稳住。', '钱包回血成功，但豪豪仍然建议慢慢花。'])
    return pickComment(record, ['小收入也要记，豪豪给认真生活加一分。', '这笔进账不大，但它很清白，记上就赢。', '零钱入账也值得有姓名，豪豪已登记。', '小钱也是钱，豪豪不允许它无名无姓。', '这笔收入像小糖豆，金额不大但心情加分。', '认真记下小进账，月底复盘会感谢现在的你。'])
  }

  if (necessaryCategories.includes(category)) {
    if (amount >= 1000) return pickComment(record, ['必要支出也挺重，豪豪建议月底给它单独开个会。', '这笔是刚需，但金额不小，钱包需要深呼吸。', '逃不掉的支出已记录，豪豪先不吐槽你，吐槽账单。', '刚需大项出现，豪豪建议预算表单独给它留座。', '这笔不是乱花，但钱包确实被认真敲了一下。', '生活成本已到账，豪豪建议下月提前预留。'])
    if (amount >= 200) return pickComment(record, ['刚需支出通过，豪豪只提醒一句：记得看本月结余。', '这类钱花得有理由，但也别让它悄悄长胖。', '必要项目已归档，钱包没有喊冤，只是有点沉默。', '刚需可以理解，豪豪只负责把金额高亮一下。', '这钱花得有出处，月底复盘别忘了它。', '必要支出通过审核，但预算线被轻轻碰了一下。'])
    return pickComment(record, ['这笔刚需很正常，记下来就已经赢一半。', '必要支出别内耗，豪豪批准通过。', '这钱花得明白，钱包暂时没有意见。', '刚需小额通过，豪豪不多念叨。', '生活基本款已记录，账本看起来很踏实。', '这笔支出很朴素，豪豪给它盖章放行。'])
  }

  if (['早餐', '午餐', '晚餐'].includes(category)) {
    if (amount <= 15) return pickComment(record, ['这顿饭很克制，豪豪怀疑你偷偷会过日子。', '餐饮控制得不错，钱包今天没被油烟熏晕。', '这一餐很稳，豪豪给你盖个省钱章。', '吃得实在又不贵，豪豪今天少唠叨两句。', '这餐价格很清爽，钱包表示还能继续上班。', '饭吃了，账也稳了，豪豪满意地点点头。'])
    if (amount <= 40) return pickComment(record, ['这顿饭价格正常，豪豪暂时放下计算器。', '吃饭是正事，这笔看起来还算讲道理。', '这餐没有离谱，钱包保持冷静。', '正常吃饭正常记账，豪豪批准。', '这顿饭在合理区间，预算没有发出警报。', '胃被照顾到了，钱包也没有太委屈。'])
    if (amount <= 100) return pickComment(record, ['这顿饭有点豪华，豪豪已经开始翻本月预算了。', '餐饮支出抬头了，豪豪建议下一餐朴素一点。', '吃得不错，钱包也确实瘦了一点。', '这餐有点仪式感，豪豪希望味道配得上价格。', '饭局可以有，但豪豪已经把它记进重点观察。', '这笔餐饮有存在感，下一顿让预算喘口气。'])
    return pickComment(record, ['这顿饭是镶金边了吗？豪豪替钱包沉默三秒。', '餐饮单笔破百，豪豪建议把它列入重点观察。', '这顿饭很有排面，但预算可能没这么爱面子。', '豪豪闻到了高级饭局的味道，也听见了钱包的叹气。', '这一餐吃得漂亮，账单也漂亮得有点刺眼。', '餐饮大额出现，豪豪建议快乐和复盘一起打包。'])
  }

  if (['水果', '奶茶', '零食', '零食饮料'].includes(category)) {
    if (category === '奶茶') {
      if (amount <= 20) return pickComment(record, ['奶茶支出还算克制，豪豪允许一点甜。', '这杯奶茶没有太过分，钱包暂时不抗议。', '快乐加冰可以，预算别加太满。', '这杯甜得刚好，钱包还没开始皱眉。', '小甜水通过，豪豪提醒别天天打卡。'])
      if (amount <= 50) return pickComment(record, ['奶茶有点活跃，豪豪建议明天喝水冷静一下。', '这杯快乐不便宜，钱包已经记住甜度了。', '奶茶到账，预算表轻轻皱眉。', '甜度上来了，豪豪建议预算也要降降温。', '这杯奶茶开始有分量，钱包已经记住店名。'])
      return pickComment(record, ['奶茶喝到这个数，豪豪建议它先退出本周群聊。', '这不是奶茶，是钱包的甜蜜负担。', '豪豪不反对快乐，但反对奶茶连续开会。', '这杯奶茶像小型投资，豪豪建议评估回报率。', '奶茶金额偏高，豪豪建议今天快乐到此为止。'])
    }
    if (category === '水果') {
      if (amount <= 30) return pickComment(record, ['水果支出很健康，豪豪批准你认真补充维生素。', '这笔水果很清爽，钱包和身体都能接受。', '买水果可以，豪豪今天不扫兴。', '健康消费已登记，豪豪给它一颗小红花。'])
      return pickComment(record, ['水果买得有点丰盛，豪豪希望它们别在冰箱里开会。', '健康是健康，但金额也确实长得挺健康。', '水果支出偏高，豪豪建议按时吃完别浪费。', '这袋水果有点排面，钱包闻到了榴莲级别的压力。'])
    }
    if (amount <= 20) return pickComment(record, ['小零食可以，豪豪允许快乐有一点预算。', '这笔嘴馋支出还算克制，钱包没报警。', '甜的可以有，但豪豪已经开始数次数了。', '嘴巴小小开心一下，豪豪暂时不拦。', '零食小额通过，快乐别升级成批发。'])
    if (amount <= 50) return pickComment(record, ['零食有点活跃，豪豪建议它明天低调。', '这笔快乐不算便宜，钱包正在小声记仇。', '嘴巴开心了，预算表开始皱眉。', '零食金额开始认真，豪豪建议下次先看看库存。', '这笔嘴馋有点响亮，账本已经听见了。'])
    return pickComment(record, ['零食花到这个数，豪豪建议快乐先冷静两天。', '这不是嘴馋，这是预算的支线剧情。', '吃得很开心，钱包看起来不太开心。', '零食支出偏高，豪豪建议零食柜进入管控期。', '这笔快乐体积不小，月底复盘会再次出现。'])
  }

  if (category === '交通') {
    if (amount <= 20) return pickComment(record, ['交通费很正常，钱包没有发出求救信号。', '这趟出行价格友好，豪豪批准通行。', '交通支出稳定，豪豪暂时不念叨。'])
    if (amount <= 80) return pickComment(record, ['这笔交通费略有存在感，豪豪建议看看是不是能优化路线。', '出门成本上来了，钱包可能想申请居家办公。', '交通费不算离谱，但豪豪已经记住它了。'])
    return pickComment(record, ['这趟路花得挺远，豪豪建议确认不是钱包在旅行。', '交通单笔偏高，豪豪把它放进观察名单。', '路是走到了，预算也跟着走了一截。'])
  }

  if (['王者荣耀', '保卫向日葵', '娱乐'].includes(category)) {
    if (amount <= 30) return pickComment(record, ['娱乐小额通过，豪豪提醒快乐也要限量。', '这笔娱乐还算轻，钱包没有立刻黑脸。', '玩可以，豪豪给你一个小小的预算通行证。'])
    if (amount <= 100) return pickComment(record, ['娱乐支出开始认真了，豪豪建议先看看本月余额。', '快乐到账，钱包扣款，豪豪两边都看见了。', '这笔娱乐不算小，豪豪建议别连续上头。'])
    return pickComment(record, ['游戏娱乐破百，豪豪已经把理性消费四个字贴屏幕上了。', '这笔快乐有点贵，预算表正在申请冷静期。', '豪豪不反对快乐，但反对钱包被秒切后排。'])
  }

  if (category === '购物') {
    if (amount <= 50) return pickComment(record, ['购物小额还行，豪豪先不审太狠。', '这笔购物比较克制，钱包暂时还能坐稳。', '买得不大，记得别让购物车继续膨胀。'])
    if (amount <= 200) return pickComment(record, ['购物支出有点份量，豪豪建议问一句：真需要吗？', '这笔买完记得用，别让它变成抽屉库存。', '钱包被拿捏了一下，豪豪已经记录证据。'])
    return pickComment(record, ['购物大额出现，豪豪建议你和预算进行一次严肃对话。', '这单很猛，钱包可能需要售后安慰。', '买得挺果断，豪豪希望这不是冲动消费的胜利。'])
  }

  if (category === '日用品') {
    if (amount <= 80) return pickComment(record, ['日用品支出很踏实，豪豪批准生活继续运转。', '这笔买得实用，钱包没有太多意见。', '生活补给已记录，豪豪觉得还挺合理。', '日用品不是乱花，记清楚就很安心。'])
    return pickComment(record, ['日用品买得不少，豪豪建议看看是不是囤货上头了。', '实用归实用，金额也确实有存在感。', '生活补给大包到货，钱包被顺手补了一刀。', '日用品支出偏高，豪豪建议下次先盘库存。'])
  }

  if (category === '医疗') {
    if (amount <= 150) return pickComment(record, ['医疗支出别心疼，身体优先，豪豪批准。', '这笔钱花在健康上，豪豪不审你，只提醒记清。', '看病买药已记录，钱包辛苦一下但值得。', '健康支出通过，豪豪希望你早点舒服。'])
    return pickComment(record, ['医疗支出不小，豪豪希望这是把身体照顾好的成本。', '这笔健康账有点重，但该花就别硬扛。', '钱包疼一下可以，身体别一直疼。', '医疗大额已记录，豪豪建议后面预算单独留一点。'])
  }

  if (category === '理发') {
    if (amount <= 60) return pickComment(record, ['发型支出很稳，豪豪批准你精神一点。', '理发记上了，钱包和发际线都需要被认真对待。', '这笔形象管理还算克制，豪豪点头。'])
    return pickComment(record, ['这次理发有点高级，豪豪希望发型撑得起价格。', '形象管理可以，但钱包刚刚也被修剪了一下。', '理发支出偏高，豪豪建议帅气多维持几天。'])
  }

  if (category === '旅游') {
    if (amount <= 200) return pickComment(record, ['旅行支出已记录，开心可以，预算也要带上。', '这笔旅游还算温和，豪豪祝你玩得明白。', '出去看看挺好，回来也记得看看账。', '小旅行小快乐，豪豪提醒别让路费偷偷加戏。', '这笔旅游还算轻，钱包暂时愿意同行。'])
    return pickComment(record, ['旅游支出不小，豪豪建议把快乐和预算一起打包。', '这趟体验感应该不错，钱包的参与感也很强。', '旅行可以治愈心情，但豪豪负责照看余额。', '远方很美，账单也很有存在感。', '这趟出行钱包参与度过高，豪豪建议回来复盘。'])
  }

  if (category === '人情往来') {
    if (amount <= 100) return pickComment(record, ['人情往来已记，豪豪理解这笔社会性支出。', '这笔花得有人情味，预算也闻到了。', '关系要维护，账也要记清。', '人情小额通过，豪豪知道这不是乱花。', '这笔有人情味，账本也要有记忆点。'])
    return pickComment(record, ['人情支出有点重，豪豪建议月底单独复盘。', '这笔不是乱花，但金额确实有存在感。', '面子照顾到了，钱包也需要被照顾一下。', '人情往来金额不轻，豪豪建议预算里给它留位置。', '这笔花得体面，钱包也体面地瘦了一圈。'])
  }

  if (amount <= 20) return pickComment(record, ['这笔很克制，豪豪今天允许你夸自己一句。', '小额支出稳稳落地，钱包没有受惊。', '这笔钱走得很安静，豪豪表示满意。', '金额很轻，账本记得很认真。', '小额通过，豪豪给你的自制力加一分。'])
  if (amount >= 300) return pickComment(record, ['这笔花得挺猛，豪豪已经把它圈出来了。', '单笔金额偏大，钱包刚才明显顿了一下。', '豪豪建议这笔进本月复盘重点名单。', '金额有点响，豪豪已经把预算表叫醒了。', '这笔消费很有存在感，月底别装不认识它。'])
  if (amount >= 100) return pickComment(record, ['这笔有点份量，豪豪建议接下来两天收一收。', '钱包被轻轻拍了一下，不疼但记得。', '金额不算小，豪豪已经开始盯本月节奏。', '这笔支出开始认真了，豪豪建议留意频率。', '钱包被提醒了一下，接下来消费节奏放慢点。'])
  return pickComment(record, ['记下来了，至少你没有让钱消失得不明不白。', '这笔普通消费已归档，豪豪继续盯账。', '账记清了，钱包少一点神秘失踪案。', '普通一笔也值得记录，月底会少一点疑惑。', '这笔已归队，豪豪继续守着账本。'])
}

function renderAuth(mode = 'login') {
  app.innerHTML = `
    <section class="auth-page">
      <div class="card auth-card">
        <div class="auth-art">
          <div class="eyebrow">豪豪记账</div>
          <h1>每一笔钱，都有自己的去处。</h1>
          <p class="hero-text">注册一个账号，账单、预算、固定支出都会只保存在你的名下。豪豪负责盯账，也负责吐槽。</p>
          <img src="${bearSrc}" alt="豪豪小熊" />
        </div>
        <div class="auth-panel">
          <div class="tabs">
            <button class="tab ${mode === 'login' ? 'active' : ''}" data-auth-tab="login">登录</button>
            <button class="tab ${mode === 'register' ? 'active' : ''}" data-auth-tab="register">注册</button>
          </div>
          <form class="form" id="authForm">
            <div class="field ${mode === 'register' ? '' : 'hidden'}">
              <label>昵称</label>
              <input class="input" name="nickname" placeholder="例如：豪豪本人" />
            </div>
            <div class="field">
              <label>邮箱</label>
              <input class="input" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div class="field">
              <label>密码</label>
              <input class="input" name="password" type="password" placeholder="至少 6 位" required />
            </div>
            <button class="btn" type="submit">${mode === 'login' ? '登录' : '注册并进入'}</button>
          </form>
        </div>
      </div>
    </section>
  `

  document.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.addEventListener('click', () => renderAuth(button.dataset.authTab))
  })

  document.querySelector('#authForm').addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const data = await api(mode === 'login' ? '/api/login' : '/api/register', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form.entries()))
      })
      state.user = data.user
      refreshHeroMessage()
      await syncBooks()
      await loadDashboard()
      toast(mode === 'login' ? '欢迎回来，豪豪已经开始盯账。' : '注册成功，豪豪正式上岗。')
    } catch (error) {
      toast(error.message)
    }
  })
}

function renderApp() {
  const summary = state.summary || { income: 0, expense: 0, balance: 0, budget: 0, budgetLeft: 0, usedRate: 0, ranking: [], label: state.month, averageExpense: 0, highestExpense: null, billCount: 0 }
  const maxRank = Math.max(...summary.ranking.map((item) => item.amount), 1)
  const categories = state.billType === 'income' ? incomeCategories : expenseCategories
  const heroMessage = currentHeroMessage(summary)
  const activeBook = currentBook()
  if (!categories.includes(state.selectedCategory)) {
    state.selectedCategory = categories[0]
  }

  app.innerHTML = `
    <div class="shell app-shell" data-active-view="${state.activeView}" data-book-mode="${isTravelBook() ? 'travel' : 'daily'}">
      <header class="topbar">
        <div class="brand">
          <button class="brand-bear-button" id="accountBtn" type="button" aria-label="账户详情">
            <img src="${escapeAttr(avatarSrc())}" alt="账户头像" />
          </button>
          <div class="brand-copy">
            <strong class="brand-title">豪豪记账</strong>
            <span class="brand-username">${escapeAttr(state.user.nickname)} · ${escapeAttr(activeBook.name)}</span>
          </div>
        </div>
        <div class="userbar">
          <span>${state.user.nickname} · ${state.user.email}</span>
          <button class="btn secondary" id="logoutBtn">退出</button>
        </div>
      </header>

      <div class="layout ${isTravelBook() ? 'travel-layout' : ''}">
        ${isTravelBook() ? renderTravelWorkspace() : `
        <div class="stack">
          <section class="card hero view-section ${state.activeView === 'home' ? 'active-view' : ''}" data-view="home">
            <div class="hero-copy">
              <div class="hero-meta">
                <div class="eyebrow">本月概览</div>
                <div class="hero-period">${monthLabel(state.month)}</div>
              </div>
              <h2>${heroMessage.title}</h2>
              <p class="hero-text">${heroMessage.text}</p>
            </div>
            <button class="hero-bear-button" type="button" data-view-jump="add" aria-label="去记账">
              <img class="hero-bear" src="${bearSrc}" alt="豪豪小熊" />
            </button>
            <div class="hero-stats">
              <div class="mini-card"><span class="muted">收入</span><strong class="income">¥${money(summary.income)}</strong></div>
              <div class="mini-card"><span class="muted">支出</span><strong class="expense">¥${money(summary.expense)}</strong></div>
              <div class="mini-card"><span class="muted">结余</span><strong>¥${money(summary.balance)}</strong></div>
            </div>
            <div class="hero-budget budget-${budgetTone(summary)}">
              <div class="hero-budget-head">
                <span>预算使用情况</span>
                <strong>${budgetPercent(summary)}%</strong>
              </div>
              <div class="budget-progress"><span style="width:${budgetBarWidth(summary)}%"></span></div>
              <div class="hero-budget-meta">${budgetInlineText(summary)}</div>
            </div>
            <div class="hero-tip">${budgetTip(summary)}</div>
          </section>

          <section class="card view-section ${state.activeView === 'bills' ? 'active-view' : ''}" data-view="bills">
            <div class="section-title bill-title">
              <div class="title-tabs">
                ${['month', 'year'].map((period) => `<button class="${state.period === period ? 'active' : ''}" data-period="${period}">${periodName(period)}</button>`).join('')}
              </div>
              ${periodDateInput('monthInput')}
            </div>
            <div class="list">
              ${state.bills.length ? state.bills.map((bill) => `
                <div class="bill">
                  <div>
                    <strong>${bill.category}</strong>
                    <small>${bill.date}${bill.note ? ` · ${bill.note}` : ''}</small>
                  </div>
                  <div class="amount ${bill.type === 'income' ? 'income' : 'expense'}">
                    ${bill.type === 'income' ? '+' : '-'}¥${money(bill.amount)}
                    <br /><button class="btn secondary" data-delete="${bill.id}" style="min-height: 30px; padding: 0 10px; border-radius: 10px; margin-top: 6px;">删除</button>
                  </div>
                </div>
              `).join('') : '<p class="muted">这个月还没有账单，钱包暂时拥有神秘感。</p>'}
            </div>
          </section>
        </div>

        <aside class="stack">
          <section class="card view-section add-section ${state.activeView === 'add' ? 'active-view' : ''}" data-view="add">
            <form class="form" id="billForm">
              <div class="segmented">
                <button class="segment ${state.billType === 'expense' ? 'active' : ''}" type="button" data-type="expense">支出</button>
                <button class="segment ${state.billType === 'income' ? 'active' : ''}" type="button" data-type="income">收入</button>
              </div>
              <div class="amount-save-row">
                <div class="field">
                  <label>金额</label>
                  <input class="input amount-input" name="amount" type="number" min="0" step="0.01" placeholder="0.00" value="${escapeAttr(state.billDraft.amount)}" required />
                </div>
                <button class="btn save-inline" type="submit">保存</button>
              </div>
              <div class="compact-date-row">
                <div class="field">
                  <label>日期</label>
                  <input class="input date-compact" name="date" type="date" value="${escapeAttr(state.billDraft.date || beijingDateString())}" required />
                </div>
              </div>
              <div class="field">
                <label>分类</label>
                <div class="category-grid">
                  ${categories.map((item) => `
                    <button class="category-chip ${state.selectedCategory === item ? 'active' : ''} ${item === '保卫向日葵' ? 'category-chip-long' : ''}" type="button" data-category="${item}" aria-pressed="${state.selectedCategory === item ? 'true' : 'false'}">
                      <span class="category-icon">${categoryIcon(item)}</span>
                      <span class="category-name">${item}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
              <div class="field">
                <label>备注</label>
                <input class="input" name="note" placeholder="可不填，比如食堂、地铁、奶茶" value="${escapeAttr(state.billDraft.note)}" />
              </div>
            </form>
          </section>

          <section class="card view-section ${state.activeView === 'stats' ? 'active-view' : ''}" data-view="stats">
            <div class="period-tabs top-period-tabs">
              ${['month', 'year'].map((period) => `<button class="${state.period === period ? 'active' : ''}" data-period="${period}">${periodName(period)}</button>`).join('')}
            </div>
            <div class="stats-toolbar">
              ${periodDateInput('statsMonthInput')}
              <button class="btn secondary" id="shareBillBtn" type="button">分享账单</button>
            </div>
            <div class="stats-summary">
              <div class="stat-tile primary"><span>总支出</span><strong>¥${money(summary.expense)}</strong></div>
              <div class="stat-tile"><span>总收入</span><strong class="income">¥${money(summary.income)}</strong></div>
              <div class="stat-tile"><span>结余</span><strong class="${summary.balance >= 0 ? 'income' : 'expense'}">¥${money(summary.balance)}</strong></div>
              <div class="stat-tile"><span>${state.period === 'year' ? '月均支出' : '日均支出'}</span><strong>¥${money(summary.averageExpense)}</strong></div>
              <div class="stat-tile"><span>消费笔数</span><strong>${summary.billCount || 0}</strong></div>
              <div class="stat-tile"><span>最高单笔</span><strong>${summary.highestExpense ? `¥${money(summary.highestExpense.amount)}` : '暂无'}</strong></div>
            </div>
          </section>

          <section class="card view-section ${state.activeView === 'stats' ? 'active-view' : ''}" data-view="stats">
            <div class="section-title"><h3>支出排行</h3></div>
            <div class="rank">
              ${summary.ranking.length ? summary.ranking.map((item) => `
                <div class="rank-row">
                  <span>${item.category}</span>
                  <div class="bar"><span style="width:${Math.max(6, Math.round(item.amount / maxRank * 100))}%"></span></div>
                  <strong>¥${money(item.amount)}</strong>
                </div>
              `).join('') : '<p class="muted">暂无排行，豪豪暂时无瓜可吃。</p>'}
            </div>
          </section>

          ${renderProfileSection(summary)}
        </aside>
        `}
      </div>

      <nav class="mobile-tabbar ${isTravelBook() && !state.activeTripId ? 'travel-tabbar-hidden' : ''}">
        ${isTravelBook() ? `
          <button data-travel-home type="button"><span>⌂</span>首页</button>
          <button class="${state.activeTripTab === 'overview' ? 'active' : ''}" data-travel-tab="overview" type="button"><span>◇</span>总览</button>
          <button class="${state.activeTripTab === 'add' ? 'active' : ''}" data-travel-tab="add" type="button"><span>✎</span>记账</button>
          <button class="${state.activeTripTab === 'bills' ? 'active' : ''}" data-travel-tab="bills" type="button"><span>≡</span>账单</button>
          <button class="${state.activeTripTab === 'stats' ? 'active' : ''}" data-travel-tab="stats" type="button"><span>◔</span>统计</button>
        ` : `
          <button class="${state.activeView === 'home' ? 'active' : ''}" data-view-tab="home"><span>⌂</span>首页</button>
          <button class="${state.activeView === 'add' ? 'active' : ''}" data-view-tab="add"><span>＋</span>记账</button>
          <button class="${state.activeView === 'bills' ? 'active' : ''}" data-view-tab="bills"><span>≡</span>账单</button>
          <button class="${state.activeView === 'stats' ? 'active' : ''}" data-view-tab="stats"><span>◔</span>统计</button>
          <button class="${state.activeView === 'profile' ? 'active' : ''}" data-view-tab="profile"><span>◇</span>固定</button>
        `}
      </nav>

      ${renderTravelSheet()}

      ${state.accountMenuOpen ? `
        <div class="account-menu-sheet" role="dialog" aria-modal="true" aria-label="账户菜单">
          <div class="account-menu-card">
            <div class="book-switcher">
              <div class="book-switcher-head">
                <strong>账本切换</strong>
                <span>当前：${escapeAttr(activeBook.name)}</span>
              </div>
              <div class="book-options">
                ${state.books.map((book) => `
                  <button class="book-option ${state.activeBookId === book.id ? 'active' : ''} ${state.switchingBookId === book.id ? 'switching' : ''}" data-book-id="${escapeAttr(book.id)}" type="button" ${state.switchingBookId ? 'disabled' : ''}>
                    <span class="book-option-icon">${escapeAttr(book.icon || '📒')}</span>
                    <strong>${state.switchingBookId === book.id ? '切换中...' : escapeAttr(book.name)}</strong>
                  </button>
                `).join('')}
              </div>
            </div>
            <button class="account-menu-item" data-account-panel="detail" type="button">
              <strong>用户详情</strong>
              <span>${escapeAttr(state.user.nickname)} · 查看账号信息</span>
            </button>
            <button class="account-menu-item" data-account-panel="password" type="button">
              <strong>更改密码</strong>
              <span>更新登录密码，保护账本隐私</span>
            </button>
            <button class="account-menu-item" id="adminEntryBtn" type="button">
              <strong>后台管理</strong>
              <span>管理员入口，需要输入管理密码</span>
            </button>
          </div>
        </div>
      ` : ''}

      ${state.accountPanel ? `
        <div class="account-sheet" role="dialog" aria-modal="true" aria-label="用户详情">
          <div class="account-card">
            <div class="section-title">
              <div>
                <h3>${state.accountPanel === 'detail' ? '用户详情' : '更改密码'}</h3>
                <p class="muted">${state.accountPanel === 'detail' ? '豪豪知道是谁在认真记账。' : '换一把更稳的钥匙，账本更安心。'}</p>
              </div>
              <button class="btn secondary account-close" id="accountCloseBtn" type="button">关闭</button>
            </div>
            ${state.accountPanel === 'detail' ? `
              <div class="account-profile-card">
                <img class="account-profile-avatar" src="${escapeAttr(avatarSrc())}" alt="当前头像" />
                <div class="account-profile-copy">
                  <span>当前账户</span>
                  <strong>${escapeAttr(state.user.nickname)}</strong>
                  <small>${escapeAttr(state.user.email)}</small>
                </div>
              </div>
              <div class="avatar-actions account-avatar-actions">
                <label class="avatar-action">
                  更换图片
                  <input id="avatarInput" type="file" accept="image/png,image/jpeg,image/webp" />
                </label>
                <button class="avatar-action" id="avatarResetBtn" type="button">系统小熊</button>
              </div>
              <div class="account-details">
                <div><span>昵称</span><strong>${escapeAttr(state.user.nickname)}</strong></div>
                <div><span>邮箱</span><strong>${escapeAttr(state.user.email)}</strong></div>
                <div><span>注册时间（北京）</span><strong>${formatDateTime(state.user.createdAt)}</strong></div>
              </div>
              <form class="form account-form" id="profileForm">
                <label class="account-form-label">修改用户名</label>
                <input class="input" name="nickname" maxlength="24" placeholder="新的用户名" value="${escapeAttr(state.user.nickname)}" required />
                <button class="btn secondary" type="submit">保存用户名</button>
              </form>
            ` : `
              <form class="form account-form" id="passwordForm">
                <input class="input" name="currentPassword" type="password" placeholder="当前密码" required />
                <input class="input" name="newPassword" type="password" placeholder="新密码，至少 6 位" required />
                <input class="input" name="confirmPassword" type="password" placeholder="再次输入新密码" required />
                <button class="btn" type="submit">保存新密码</button>
              </form>
            `}
          </div>
        </div>
      ` : ''}

      ${state.sharePanelOpen ? `
        <div class="share-sheet" role="dialog" aria-modal="true" aria-label="分享账单">
          <div class="share-card">
            <div class="section-title">
              <div>
                <h3>分享账单</h3>
                <p class="muted">生成一张可爱账单图，适合保存或发给自己复盘。</p>
              </div>
              <button class="btn secondary account-close" id="shareCloseBtn" type="button">关闭</button>
            </div>
            ${state.shareImageUrl ? `
              <img class="share-preview" src="${state.shareImageUrl}" alt="豪豪账单分享图" />
              <p class="share-tip">网页不能静默写入相册。点“保存图片”后，优先唤起系统保存/分享；不支持时会打开大图，长按即可保存。</p>
            ` : '<div class="share-loading">豪豪正在排版账单...</div>'}
            <div class="share-actions">
              <button class="btn" id="shareSaveBtn" type="button">保存图片</button>
              <button class="btn secondary" id="shareNativeBtn" type="button">系统分享</button>
            </div>
          </div>
        </div>
      ` : ''}

      ${state.adminLoginOpen ? `
        <div class="admin-sheet" role="dialog" aria-modal="true" aria-label="管理员登录">
          <div class="admin-card">
            <div class="section-title">
              <div>
                <h3>管理员登录</h3>
                <p class="muted">请输入管理员密码进入后台。</p>
              </div>
              <button class="btn secondary account-close" id="adminCloseBtn" type="button">关闭</button>
            </div>
            <form class="form" id="adminLoginForm">
              <input class="input" name="password" type="password" placeholder="管理员密码" required />
              <button class="btn" type="submit">进入管理</button>
            </form>
          </div>
        </div>
      ` : ''}

      ${state.adminPanelOpen ? `
        <div class="admin-sheet" role="dialog" aria-modal="true" aria-label="管理员系统">
          <div class="admin-card admin-panel-card">
            <div class="section-title">
              <div>
                <h3>管理员系统</h3>
                <p class="muted">豪豪后台 · 用户增长概览</p>
              </div>
              <button class="btn secondary account-close" id="adminPanelCloseBtn" type="button">关闭</button>
            </div>
            <div class="admin-metrics">
              <div><span>用户</span><strong>${state.adminSummary?.totals?.users || 0}</strong></div>
              <div><span>14天新增</span><strong>${state.adminSummary?.totals?.newUsers14d || 0}</strong></div>
            </div>
            ${state.adminUserDetail ? renderAdminUserDetail(state.adminUserDetail) : `
              <div class="admin-users">
                ${(state.adminSummary?.users || []).map((user) => `
                  <button class="admin-user" data-admin-user="${escapeAttr(user.id)}" type="button">
                    <div>
                      <strong>${escapeAttr(user.nickname)}</strong>
                      <small>${escapeAttr(user.email)}</small>
                      <small>最近操作（北京）：${formatDateTime(user.lastActivityAt || user.createdAt)}</small>
                    </div>
                    <div>
                      <span>${user.billCount || 0} 笔</span>
                      <small>查看详情</small>
                    </div>
                  </button>
                `).join('') || '<p class="muted">暂无用户。</p>'}
              </div>
            `}
            <button class="btn secondary" id="adminLogoutBtn" type="button">退出管理员</button>
          </div>
        </div>
      ` : ''}
    </div>
  `

  bindAppEvents()
}

async function openAdminEntry() {
  try {
    const data = await api('/api/admin/summary')
    state.adminSummary = data
    state.adminUserDetail = null
    state.adminPanelOpen = true
    state.adminLoginOpen = false
  } catch (error) {
    state.adminLoginOpen = true
    state.adminPanelOpen = false
  }
  state.accountMenuOpen = false
  state.accountPanel = ''
  renderApp()
}

function bindAppEvents() {
  document.querySelector('#accountBtn').addEventListener('click', () => {
    state.accountMenuOpen = true
    renderApp()
  })

  document.querySelector('#accountCloseBtn')?.addEventListener('click', () => {
    state.accountPanel = ''
    renderApp()
  })

  document.querySelector('.account-menu-sheet')?.addEventListener('click', (event) => {
    if (event.target.classList.contains('account-menu-sheet')) {
      state.accountMenuOpen = false
      renderApp()
    }
  })

  document.querySelectorAll('[data-account-panel]').forEach((button) => {
    button.addEventListener('click', () => {
      state.accountMenuOpen = false
      state.accountPanel = button.dataset.accountPanel
      renderApp()
    })
  })

  document.querySelectorAll('[data-book-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const nextBookId = button.dataset.bookId
      if (!nextBookId || nextBookId === state.activeBookId) return
      const nextBook = state.books.find((book) => book.id === nextBookId)
      captureBillDraft()
      state.activeBookId = nextBookId
      state.switchingBookId = nextBookId
      localStorage.setItem('haohao-active-book', state.activeBookId)
      state.accountPanel = ''
      state.profileTool = ''
      state.activeView = 'home'
      toast(`正在切换到${nextBook?.name || '新账本'}...`)
      renderApp()
      try {
        await loadDashboard()
        state.switchingBookId = ''
        state.accountMenuOpen = false
        toast(`已切换到${currentBook().name}。`)
        renderApp()
      } catch (error) {
        state.switchingBookId = ''
        toast(error.message)
        renderApp()
      }
    })
  })

  document.querySelector('#adminEntryBtn')?.addEventListener('click', () => {
    openAdminEntry()
  })

  document.querySelector('.account-sheet')?.addEventListener('click', (event) => {
    if (event.target.classList.contains('account-sheet')) {
      state.accountPanel = ''
      renderApp()
    }
  })

  document.querySelector('#passwordForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get('currentPassword') || '')
    const newPassword = String(form.get('newPassword') || '')
    const confirmPassword = String(form.get('confirmPassword') || '')
    if (newPassword !== confirmPassword) {
      toast('两次新密码不一致。')
      return
    }

    try {
      await api('/api/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      })
      state.accountPanel = ''
      renderApp()
      toast('密码已更新。')
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelector('#profileForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const data = await api('/api/profile', {
        method: 'POST',
        body: JSON.stringify({ nickname: form.get('nickname') })
      })
      state.user = data.user
      state.accountPanel = ''
      renderApp()
      toast('用户名已更新。')
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelector('#avatarInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('请选择图片文件。')
      return
    }
    try {
      const avatarData = await avatarDataFromFile(file)
      const data = await api('/api/profile', {
        method: 'POST',
        body: JSON.stringify({ nickname: state.user.nickname, avatarData })
      })
      state.user = data.user
      renderApp()
      toast('头像已更新。')
    } catch (error) {
      toast(error.message || '头像更新失败。')
    }
  })

  document.querySelector('#avatarResetBtn')?.addEventListener('click', async () => {
    try {
      const data = await api('/api/profile', {
        method: 'POST',
        body: JSON.stringify({ nickname: state.user.nickname, avatarData: '' })
      })
      state.user = data.user
      renderApp()
      toast('已换回系统小熊。')
    } catch (error) {
      toast(error.message || '头像更新失败。')
    }
  })

  document.querySelector('#adminCloseBtn')?.addEventListener('click', () => {
    state.adminLoginOpen = false
    renderApp()
  })

  document.querySelector('#adminPanelCloseBtn')?.addEventListener('click', () => {
    state.adminPanelOpen = false
    state.adminUserDetail = null
    renderApp()
  })

  document.querySelector('.admin-sheet')?.addEventListener('click', (event) => {
    if (event.target.classList.contains('admin-sheet')) {
      state.adminLoginOpen = false
      state.adminPanelOpen = false
      state.adminUserDetail = null
      renderApp()
    }
  })

  document.querySelector('#adminBackBtn')?.addEventListener('click', () => {
    state.adminUserDetail = null
    renderApp()
  })

  document.querySelectorAll('[data-admin-user]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.adminUserDetail = null
        const detail = await api(`/api/admin/users/${encodeURIComponent(button.dataset.adminUser)}/detail?month=${encodeURIComponent(state.month)}&period=${encodeURIComponent(state.period)}`)
        state.adminUserDetail = detail
        renderApp()
      } catch (error) {
        toast(error.message)
      }
    })
  })

  document.querySelector('#adminLoginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: form.get('password') })
      })
      const data = await api('/api/admin/summary')
      state.adminSummary = data
      state.adminUserDetail = null
      state.adminLoginOpen = false
      state.adminPanelOpen = true
      renderApp()
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelector('#adminLogoutBtn')?.addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' })
    state.adminSummary = null
    state.adminUserDetail = null
    state.adminPanelOpen = false
    toast('已退出管理员。')
    renderApp()
  })

  document.querySelector('#shareBillBtn')?.addEventListener('click', async () => {
    try {
      state.shareImageUrl = ''
      state.sharePanelOpen = true
      renderApp()
      state.shareImageUrl = await createShareImage()
      renderApp()
    } catch (error) {
      state.sharePanelOpen = false
      renderApp()
      toast('账单图生成失败，请稍后再试。')
    }
  })

  document.querySelector('#shareCloseBtn')?.addEventListener('click', () => {
    state.sharePanelOpen = false
    renderApp()
  })

  document.querySelector('.share-sheet')?.addEventListener('click', (event) => {
    if (event.target.classList.contains('share-sheet')) {
      state.sharePanelOpen = false
      renderApp()
    }
  })

  document.querySelector('#shareSaveBtn')?.addEventListener('click', async () => {
    if (!state.shareImageUrl) return
    await saveShareImage()
  })

  document.querySelector('#shareNativeBtn')?.addEventListener('click', async () => {
    if (!state.shareImageUrl) return
    try {
      const file = await shareImageFile()
      const message = pickShareMessage()
      const payload = { title: '豪豪记账', text: `${summaryLabel()}，${message.text}` }
      if (navigator.canShare?.({ files: [file] })) {
        payload.files = [file]
      }
      await navigator.share(payload)
    } catch (error) {
      toast('当前浏览器不支持直接分享，可以先保存图片。')
    }
  })

  document.querySelector('#logoutBtn').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' })
    state.user = null
    state.books = fallbackBooks
    state.activeBookId = localStorage.getItem('haohao-active-book') || 'personal'
    state.switchingBookId = ''
    state.trips = []
    state.activeTripId = localStorage.getItem('haohao-active-trip') || ''
    state.travelDetail = null
    state.travelPanel = ''
    state.accountMenuOpen = false
    state.accountPanel = ''
    state.adminLoginOpen = false
    state.adminPanelOpen = false
    renderAuth()
  })

  document.querySelectorAll('[data-view-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      captureBillDraft()
      state.activeView = button.dataset.viewTab
      renderApp()
    })
  })

  document.querySelectorAll('[data-view-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      captureBillDraft()
      state.activeView = button.dataset.viewJump
      renderApp()
    })
  })

  document.querySelectorAll('[data-profile-tool]').forEach((button) => {
    button.addEventListener('click', () => {
      state.profileTool = button.dataset.profileTool
      renderApp()
    })
  })

  document.querySelectorAll('[data-profile-tool-close]').forEach((button) => {
    button.addEventListener('click', () => {
      state.profileTool = ''
      renderApp()
    })
  })

  document.querySelector('#tripNewBtn')?.addEventListener('click', () => {
    state.travelPanel = 'newTrip'
    state.activeTripId = ''
    state.travelDetail = null
    localStorage.removeItem('haohao-active-trip')
    renderApp()
  })

  document.querySelector('#tripFormCloseBtn')?.addEventListener('click', () => {
    state.travelPanel = ''
    renderApp()
  })

  document.querySelector('#tripBudgetCloseBtn')?.addEventListener('click', () => {
    state.travelPanel = ''
    renderApp()
  })

  document.querySelector('#tripCityCloseBtn')?.addEventListener('click', () => {
    state.travelPanel = ''
    renderApp()
  })

  document.querySelector('.travel-sheet')?.addEventListener('click', (event) => {
    if (event.target.classList.contains('travel-sheet')) {
      state.travelPanel = ''
      renderApp()
    }
  })

  document.querySelector('#tripForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      const data = await api('/api/trips', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form.entries()))
      })
      state.activeTripId = data.trip.id
      localStorage.setItem('haohao-active-trip', state.activeTripId)
      state.activeTripTab = 'overview'
      state.travelPanel = ''
      await loadDashboard()
      toast('旅行卡片已创建。')
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelectorAll('[data-trip-open]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.activeTripId = button.dataset.tripOpen
      localStorage.setItem('haohao-active-trip', state.activeTripId)
      state.activeTripTab = 'overview'
      state.travelPanel = ''
      state.tripStatusEditing = false
      state.tripStatusDraft = ''
      await loadDashboard()
    })
  })

  document.querySelector('#tripBackBtn')?.addEventListener('click', () => {
    state.activeTripId = ''
    state.travelDetail = null
    localStorage.removeItem('haohao-active-trip')
    renderApp()
  })

  document.querySelector('[data-trip-budget]')?.addEventListener('click', () => {
    state.travelPanel = 'budget'
    renderApp()
  })

  document.querySelector('[data-trip-cities]')?.addEventListener('click', () => {
    state.travelPanel = 'cities'
    renderApp()
  })

  document.querySelector('#tripBudgetForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!state.activeTripId) return
    const form = new FormData(event.currentTarget)
    try {
      await api(`/api/trips/${encodeURIComponent(state.activeTripId)}`, {
        method: 'PUT',
        body: JSON.stringify({ budget: form.get('budget') })
      })
      state.travelPanel = ''
      await loadDashboard()
      toast('旅行预算已更新。')
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelector('#tripCityForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!state.activeTripId) return
    const form = new FormData(event.currentTarget)
    try {
      await api(`/api/trips/${encodeURIComponent(state.activeTripId)}/cities`, {
        method: 'POST',
        body: JSON.stringify({ name: form.get('name') })
      })
      await loadDashboard()
      toast('城市节点已添加。')
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelectorAll('[data-delete-trip-city]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!state.activeTripId) return
      try {
        await api(`/api/trips/${encodeURIComponent(state.activeTripId)}/cities/${encodeURIComponent(button.dataset.deleteTripCity)}`, { method: 'DELETE' })
        await loadDashboard()
        toast('城市节点已删除。')
      } catch (error) {
        toast(error.message)
      }
    })
  })

  document.querySelector('[data-trip-status-toggle]')?.addEventListener('click', () => {
    state.tripStatusEditing = true
    state.tripStatusDraft = state.travelDetail?.trip?.status || 'planning'
    renderApp()
  })

  document.querySelectorAll('[data-trip-status-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      state.tripStatusDraft = button.dataset.tripStatusChoice
      renderApp()
    })
  })

  document.querySelector('#tripStatusForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!state.activeTripId) return
    const status = state.tripStatusDraft || state.travelDetail?.trip?.status || 'planning'
    try {
      await api(`/api/trips/${encodeURIComponent(state.activeTripId)}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      })
      state.tripStatusEditing = false
      state.tripStatusDraft = ''
      await loadDashboard()
      toast(`旅行状态已更新为${tripStatusText(status)}。`)
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelectorAll('[data-trip-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!state.activeTripId) {
        toast('先选择一张旅行卡片。')
        return
      }
      state.tripStatusEditing = false
      state.activeTripTab = button.dataset.tripTab
      renderApp()
    })
  })

  document.querySelectorAll('[data-travel-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!state.activeTripId) {
        toast('先选择一张旅行卡片。')
        return
      }
      state.tripStatusEditing = false
      state.activeTripTab = button.dataset.travelTab
      renderApp()
    })
  })

  document.querySelector('[data-travel-home]')?.addEventListener('click', () => {
    state.activeTripId = ''
    state.travelDetail = null
    state.tripStatusEditing = false
    state.tripStatusDraft = ''
    localStorage.removeItem('haohao-active-trip')
    renderApp()
  })

  document.querySelector('[data-travel-new]')?.addEventListener('click', () => {
    state.travelPanel = 'newTrip'
    state.activeTripId = ''
    state.travelDetail = null
    state.tripStatusEditing = false
    state.tripStatusDraft = ''
    localStorage.removeItem('haohao-active-trip')
    renderApp()
  })

  document.querySelectorAll('[data-trip-category]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedTripCategory = button.dataset.tripCategory
      document.querySelectorAll('[data-trip-category]').forEach((item) => {
        item.classList.toggle('active', item.dataset.tripCategory === state.selectedTripCategory)
        item.setAttribute('aria-pressed', item.dataset.tripCategory === state.selectedTripCategory ? 'true' : 'false')
      })
    })
  })

  document.querySelector('#tripBillForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!state.activeTripId) return
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    payload.type = 'expense'
    payload.category = state.selectedTripCategory
    try {
      await api(`/api/trips/${encodeURIComponent(state.activeTripId)}/bills`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      state.activeTripTab = 'bills'
      await loadDashboard()
      toast('旅行账单已保存。')
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelectorAll('[data-delete-trip-bill]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!state.activeTripId) return
      await api(`/api/trips/${encodeURIComponent(state.activeTripId)}/bills/${encodeURIComponent(button.dataset.deleteTripBill)}`, { method: 'DELETE' })
      toast('旅行账单已删除。')
      await loadDashboard()
    })
  })

  document.querySelector('#monthInput')?.addEventListener('change', async (event) => {
    state.month = state.period === 'year' ? `${event.target.value || selectedYear()}-01` : event.target.value
    await loadDashboard()
  })

  document.querySelector('#statsMonthInput')?.addEventListener('change', async (event) => {
    state.month = state.period === 'year' ? `${event.target.value || selectedYear()}-01` : event.target.value
    await loadDashboard()
  })

  document.querySelectorAll('[data-period]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.period = button.dataset.period
      await loadDashboard()
    })
  })

  document.querySelectorAll('[data-type]').forEach((button) => {
    button.addEventListener('click', () => {
      captureBillDraft()
      state.billType = button.dataset.type
      state.selectedCategory = state.billType === 'income' ? incomeCategories[0] : expenseCategories[0]
      renderApp()
    })
  })

  document.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedCategory = button.dataset.category
      document.querySelectorAll('[data-category]').forEach((item) => {
        item.classList.toggle('active', item.dataset.category === state.selectedCategory)
        item.setAttribute('aria-pressed', item.dataset.category === state.selectedCategory ? 'true' : 'false')
      })
    })
  })

  document.querySelector('#billForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    payload.type = state.billType
    payload.category = state.selectedCategory
    payload.bookId = state.activeBookId
    try {
      const data = await api('/api/bills', { method: 'POST', body: JSON.stringify(payload) })
      judge(bearComment(data.bill))
      state.month = data.bill.month
      state.activeView = 'bills'
      state.billDraft = {
        amount: '',
        date: beijingDateString(),
        note: ''
      }
      await loadDashboard()
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelector('#budgetForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/budget', { method: 'PUT', body: JSON.stringify({ month: state.month, total: form.get('total'), bookId: state.activeBookId }) })
      toast('预算已保存，豪豪开始盯线。')
      await loadDashboard()
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelector('#fixedForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const formEl = event.currentTarget
    const form = new FormData(formEl)
    const payload = Object.fromEntries(form.entries())
    payload.name = String(payload.name || '').trim() || String(payload.category || '').trim()
    payload.bookId = state.activeBookId
    if (Number(payload.defaultAmount) <= 0) {
      toast('请填写固定项目金额。')
      return
    }
    const previousIds = new Set(state.fixedItems.map((item) => item.id))
    const optimisticItem = {
      id: `pending-${Date.now()}`,
      name: payload.name,
      category: payload.category,
      defaultAmount: Number(payload.defaultAmount),
      note: String(payload.note || ''),
      enabled: true
    }
    try {
      const data = await api('/api/fixed-items', { method: 'POST', body: JSON.stringify(payload) })
      formEl.reset()
      state.activeView = 'profile'
      const savedItem = data.item || optimisticItem
      state.fixedItems = [savedItem, ...state.fixedItems.filter((item) => item.id !== savedItem.id)]
      renderApp()
      syncFixedItems().then(() => renderApp()).catch((syncError) => {
        console.error('fixed item sync after save failed', syncError)
      })
      toast('固定支出项目已保存。')
    } catch (error) {
      console.error('fixed item save failed', error)
      try {
        const items = await syncFixedItems()
        const hasNewItem = items.some((item) => !previousIds.has(item.id))
        if (hasNewItem) {
          formEl.reset()
          renderApp()
          toast('固定支出项目已保存。')
          return
        }
        renderApp()
      } catch (refreshError) {
        console.error('fixed item refresh after failed save failed', refreshError)
      }
      toast(error.message)
    }
  })

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      await api(`/api/bills/${encodeURIComponent(button.dataset.delete)}`, { method: 'DELETE' })
      toast('账单已删除。')
      await loadDashboard()
    })
  })

  document.querySelectorAll('[data-record-fixed]').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = state.fixedItems.find((target) => target.id === button.dataset.recordFixed)
      if (!item) return

      const today = beijingDateString()
      try {
        const data = await api('/api/bills', {
          method: 'POST',
          body: JSON.stringify({
            type: 'expense',
            amount: item.defaultAmount,
            category: item.category,
            date: today,
            note: item.name,
            isFixed: true,
            bookId: state.activeBookId
          })
        })
        judge(bearComment(data.bill))
        state.month = data.bill.month
        state.activeView = 'bills'
        await loadDashboard()
      } catch (error) {
        toast(error.message)
      }
    })
  })

  document.querySelectorAll('[data-delete-fixed]').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = state.fixedItems.find((target) => target.id === button.dataset.deleteFixed)
      if (!item) return
      if (!window.confirm(`删除固定支出「${item.name}」？`)) return

      try {
        await api(`/api/fixed-items/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
        toast('固定支出项目已删除。')
        await loadDashboard()
      } catch (error) {
        toast(error.message)
      }
    })
  })
}

async function shareImageFile() {
  const response = await fetch(state.shareImageUrl)
  const blob = await response.blob()
  return new File([blob], `haohao-ledger-${state.period}-${state.month}.png`, { type: 'image/png' })
}

function openShareImage() {
  const win = window.open()
  if (win) {
    win.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>${summaryLabel()}</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;background:#fffaf4;"><img src="${state.shareImageUrl}" style="display:block;width:100%;max-width:900px;margin:0 auto;" alt="豪豪账单分享图" /></body></html>`)
    win.document.close()
    return true
  }
  return false
}

async function saveShareImage() {
  try {
    const file = await shareImageFile()
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      const message = pickShareMessage()
      await navigator.share({ title: '豪豪记账', text: `${summaryLabel()}，${message.text}`, files: [file] })
      return
    }

    const link = document.createElement('a')
    link.href = state.shareImageUrl
    link.download = `haohao-ledger-${state.period}-${state.month}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    toast('如果没有自动保存，请打开大图后长按保存。')
  } catch (error) {
    if (!openShareImage()) {
      toast('请允许弹出窗口后再打开大图保存。')
    }
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

async function avatarDataFromFile(file) {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const size = 320
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height)
    const sx = ((image.naturalWidth || image.width) - sourceSize) / 2
    const sy = ((image.naturalHeight || image.height) - sourceSize) / 2
    ctx.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.86)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function drawText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const chars = String(text).split('')
  const noLineStart = '，。！？；：、,.!?;:)]）】》'
  let line = ''
  let lines = 0
  for (const char of chars) {
    const next = line + char
    if (ctx.measureText(next).width > maxWidth && line) {
      if (noLineStart.includes(char)) {
        line = next
        continue
      }
      ctx.fillText(line, x, y)
      y += lineHeight
      lines += 1
      line = char
      if (lines >= maxLines - 1) break
    } else {
      line = next
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y)
}

function pieChartData(ranking) {
  return (ranking || [])
    .filter((item) => Number(item.amount) > 0)
    .map((item) => ({ category: item.category, amount: Number(item.amount) }))
}

function drawPieChart(ctx, items, cx, cy, radius, legendStartY = 864) {
  const colors = ['#f5b94c', '#5b351c', '#327451', '#a44b35', '#d98b58', '#6d8f5b', '#e7a7a1', '#7b6fb0', '#d2a24c', '#4f8f8c', '#bc6c45', '#8f6d4e']
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const legendColumns = 2
  const legendColumnWidth = 184
  const legendRowGap = 66
  const legendX = 454
  let start = -Math.PI / 2
  items.forEach((item, index) => {
    const angle = (item.amount / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, start, start + angle)
    ctx.closePath()
    ctx.fillStyle = colors[index % colors.length]
    ctx.fill()
    start += angle
  })

  ctx.beginPath()
  ctx.arc(cx, cy, radius * 0.48, 0, Math.PI * 2)
  ctx.fillStyle = '#fffefd'
  ctx.fill()

  ctx.fillStyle = '#5b351c'
  ctx.font = `900 28px ${canvasFontFamily}`
  ctx.textAlign = 'center'
  ctx.fillText('支出', cx, cy - 4)
  ctx.fillStyle = '#987a58'
  ctx.font = `800 20px ${canvasFontFamily}`
  ctx.fillText('结构', cx, cy + 26)
  ctx.textAlign = 'left'

  items.forEach((item, index) => {
    const column = index % legendColumns
    const row = Math.floor(index / legendColumns)
    const x = legendX + column * legendColumnWidth
    const y = legendStartY + row * legendRowGap
    const percent = Math.round(item.amount / total * 100)
    roundedRect(ctx, x, y + 5, 24, 24, 8)
    ctx.fillStyle = colors[index % colors.length]
    ctx.fill()
    ctx.fillStyle = '#352417'
    ctx.font = `900 21px ${canvasFontFamily}`
    drawText(ctx, item.category, x + 34, y + 25, 132, 24, 1)
    ctx.fillStyle = '#987a58'
    ctx.font = `800 18px ${canvasFontFamily}`
    ctx.fillText(`${percent}% · ¥${money(item.amount)}`, x + 34, y + 52)
  })
}

function drawPill(ctx, x, y, text, fill, color) {
  ctx.font = `700 24px ${canvasFontFamily}`
  const width = ctx.measureText(text).width + 34
  roundedRect(ctx, x, y, width, 44, 16)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.fillStyle = color
  ctx.fillText(text, x + 17, y + 29)
  return width
}

function drawMetric(ctx, x, y, width, label, value, color) {
  roundedRect(ctx, x, y, width, 116, 22)
  ctx.fillStyle = 'rgba(255, 249, 241, 0.88)'
  ctx.fill()
  ctx.strokeStyle = '#f1e2cc'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#987a58'
  ctx.font = `700 22px ${canvasFontFamily}`
  ctx.fillText(label, x + 22, y + 34)
  ctx.fillStyle = color || '#352417'
  ctx.font = `900 34px ${canvasFontFamily}`
  ctx.fillText(value, x + 22, y + 84)
}

function drawSoftPanel(ctx, x, y, width, height, radius = 26) {
  roundedRect(ctx, x, y, width, height, radius)
  ctx.fillStyle = 'rgba(255, 254, 253, 0.72)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(241, 226, 204, 0.72)'
  ctx.lineWidth = 2
  ctx.stroke()
}

async function createShareImage() {
  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const summary = state.summary || { income: 0, expense: 0, balance: 0, budget: 0, budgetLeft: 0, usedRate: 0, ranking: [] }
  const shareMessage = pickShareMessage()
  const isYearShare = state.period === 'year'
  const structureTop = isYearShare ? 650 : 810
  const pieCenterY = isYearShare ? 850 : 976
  const legendStartY = isYearShare ? 738 : 864
  const pieItems = pieChartData(summary.ranking)
  const legendRows = Math.ceil(pieItems.length / 2)
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = Math.max(1280, pieItems.length ? legendStartY + legendRows * 66 + 110 : 1280)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#fffaf4'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const gradient = ctx.createRadialGradient(120, 40, 20, 120, 40, 680)
  gradient.addColorStop(0, 'rgba(245, 185, 76, 0.36)')
  gradient.addColorStop(1, 'rgba(245, 185, 76, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let bear = null
  try {
    bear = await loadImage(bearSrc)
  } catch (error) {
    bear = null
  }

  if (bear) {
    ctx.save()
    ctx.globalAlpha = 0.13
    ctx.beginPath()
    ctx.arc(450, 620, 310, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(bear, 140, 310, 620, 620)
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.arc(136, 140, 50, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(bear, 86, 90, 100, 100)
    ctx.restore()
  } else {
    ctx.beginPath()
    ctx.arc(136, 140, 50, 0, Math.PI * 2)
    ctx.fillStyle = '#fff0c8'
    ctx.fill()
    ctx.fillStyle = '#5b351c'
    ctx.font = `900 34px ${canvasFontFamily}`
    ctx.fillText('豪', 119, 153)
  }

  const nickname = state.user?.nickname || '豪豪用户'
  ctx.fillStyle = '#5b351c'
  ctx.font = `900 42px ${canvasFontFamily}`
  ctx.fillText('豪豪记账', 214, 130)
  ctx.fillStyle = '#987a58'
  ctx.font = `700 24px ${canvasFontFamily}`
  ctx.fillText(`${summaryLabel()} · ${shareMessage.title}`, 214, 170)
  ctx.fillStyle = '#6d5034'
  ctx.font = `800 22px ${canvasFontFamily}`
  ctx.fillText(`${nickname} 的账单`, 214, 204)

  drawPill(ctx, 86, 232, '本期概览', '#fff0c8', '#5b351c')
  ctx.fillStyle = '#352417'
  ctx.font = `900 56px ${canvasFontFamily}`
  ctx.fillText(shareMessage.title, 86, 326)
  ctx.fillStyle = '#6d5034'
  ctx.font = `700 26px ${canvasFontFamily}`
  drawText(ctx, shareMessage.text, 86, 374, 700, 36, 2)

  drawMetric(ctx, 86, 454, 228, '总收入', `¥${money(summary.income)}`, '#327451')
  drawMetric(ctx, 336, 454, 228, '总支出', `¥${money(summary.expense)}`, '#a44b35')
  drawMetric(ctx, 586, 454, 228, '结余', `¥${money(summary.balance)}`, summary.balance >= 0 ? '#327451' : '#a44b35')

  if (!isYearShare) {
    drawSoftPanel(ctx, 86, 616, 728, 118, 24)
    ctx.fillStyle = '#987a58'
    ctx.font = `800 22px ${canvasFontFamily}`
    ctx.fillText('预算使用', 112, 654)
    ctx.fillStyle = '#352417'
    ctx.font = `900 30px ${canvasFontFamily}`
    ctx.fillText(`${Math.round(summary.usedRate * 100)}%`, 682, 654)
    roundedRect(ctx, 112, 684, 650, 20, 10)
    ctx.fillStyle = '#f5eadc'
    ctx.fill()
    roundedRect(ctx, 112, 684, Math.min(650, Math.round(summary.usedRate * 650)), 20, 10)
    ctx.fillStyle = '#5b351c'
    ctx.fill()
  }

  ctx.fillStyle = '#5b351c'
  ctx.font = `900 32px ${canvasFontFamily}`
  ctx.fillText('支出结构', 86, structureTop)
  if (pieItems.length) {
    drawPieChart(ctx, pieItems, 246, pieCenterY, 128, legendStartY)
  } else {
    ctx.fillStyle = '#987a58'
    ctx.font = `700 26px ${canvasFontFamily}`
    drawText(ctx, '暂无支出结构，豪豪暂时还切不出扇形图。', 86, structureTop + 54, 700, 36, 2)
  }

  return canvas.toDataURL('image/png')
}

async function loadDashboard() {
  if (isTravelBook()) {
    await loadTravelDashboard()
    renderApp()
    return
  }
  const [summary, bills] = await Promise.all([
    api(`/api/summary?month=${encodeURIComponent(state.month)}&period=${encodeURIComponent(state.period)}&${bookQuery()}`),
    api(`/api/bills?month=${encodeURIComponent(state.month)}&period=${encodeURIComponent(state.period)}&${bookQuery()}`),
    syncFixedItems()
  ])
  state.summary = summary
  state.bills = bills.bills
  renderApp()
}

async function init() {
  try {
    const data = await api('/api/me')
    state.user = data.user
    if (state.user) {
      refreshHeroMessage()
      await syncBooks()
      await loadDashboard()
    } else {
      renderAuth()
    }
  } catch (error) {
    renderAuth()
  }
}

init()
