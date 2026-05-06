const bearSrc = '/assets/bear-ledger.jpg'
const expenseCategories = ['早餐', '午餐', '晚餐', '零食饮料', '交通', '水电燃气', '房租', '话费网费', '日用品', '医疗', '娱乐', '王者荣耀', '保卫向日葵', '购物', '人情往来', '其他']
const incomeCategories = ['工资', '生活费', '零花钱', '兼职', '红包', '退款', '其他']
const fixedCategories = ['水电燃气', '房租', '话费网费', '日用品', '会员订阅', '其他']

const state = {
  user: null,
  month: new Date().toISOString().slice(0, 7),
  period: 'month',
  billType: 'expense',
  selectedCategory: '午餐',
  activeView: 'home',
  bills: [],
  summary: null,
  fixedItems: []
}

const app = document.querySelector('#app')

function money(value) {
  return Number(value || 0).toFixed(2)
}

function periodName(period) {
  return ({ month: '月度账单', year: '年度账单' })[period] || '月度账单'
}

function periodTabs() {
  return `
    <div class="period-tabs compact">
      ${['month', 'year'].map((period) => `<button class="${state.period === period ? 'active' : ''}" data-period="${period}">${periodName(period)}</button>`).join('')}
    </div>
  `
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

function bearComment(record) {
  if (record.type === 'income') return '收入到账，钱包终于等到一点尊重。'
  if (record.amount >= 100 && !['交通', '水电燃气', '房租', '话费网费', '医疗'].includes(record.category)) {
    return '这笔花得挺猛，钱包刚才好像翻了个白眼。'
  }
  if (record.amount <= 20) return '这笔很克制，豪豪今天允许你夸自己一句。'
  return '记下来了，至少你没有让钱消失得不明不白。'
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
  if (!categories.includes(state.selectedCategory)) {
    state.selectedCategory = categories[0]
  }

  app.innerHTML = `
    <div class="shell app-shell" data-active-view="${state.activeView}">
      <header class="topbar">
        <div class="brand">
          <img src="${bearSrc}" alt="豪豪小熊" />
          <div>
            <h1>豪豪记账</h1>
            <p>个人账本 · ${state.month}</p>
          </div>
        </div>
        <div class="userbar">
          <span>${state.user.nickname} · ${state.user.email}</span>
          <button class="btn secondary" id="logoutBtn">退出</button>
        </div>
      </header>

      <div class="layout">
        <div class="stack">
          <section class="card hero view-section ${state.activeView === 'home' ? 'active-view' : ''}" data-view="home">
            <div class="hero-copy">
              <div class="eyebrow">本月概览</div>
              <h2>钱包还站得住吗？</h2>
              <p class="hero-text">${summary.usedRate >= 1 ? '预算已经花穿，豪豪建议今天先别和支付软件见面。' : '记账不是抠门，是给钱安排一个明白的去处。'}</p>
            </div>
            <img class="hero-bear" src="${bearSrc}" alt="豪豪小熊" />
            <div class="hero-stats">
              <div class="mini-card"><span class="muted">收入</span><strong class="income">¥${money(summary.income)}</strong></div>
              <div class="mini-card"><span class="muted">支出</span><strong class="expense">¥${money(summary.expense)}</strong></div>
              <div class="mini-card"><span class="muted">结余</span><strong>¥${money(summary.balance)}</strong></div>
            </div>
          </section>

          <section class="card view-section ${state.activeView === 'bills' ? 'active-view' : ''}" data-view="bills">
            <div class="section-title">
              <h3>${periodName(state.period)}</h3>
              <input class="input" id="monthInput" type="month" value="${state.month}" style="max-width: 170px" />
            </div>
            ${periodTabs()}
            <div class="list">
              ${state.bills.length ? state.bills.slice(0, 12).map((bill) => `
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
          <section class="card view-section ${state.activeView === 'add' ? 'active-view' : ''}" data-view="add">
            <div class="section-title"><h3>记一笔</h3></div>
            <form class="form" id="billForm">
              <div class="segmented">
                <button class="segment ${state.billType === 'expense' ? 'active' : ''}" type="button" data-type="expense">支出</button>
                <button class="segment ${state.billType === 'income' ? 'active' : ''}" type="button" data-type="income">收入</button>
              </div>
              <div class="grid-2">
                <div class="field">
                  <label>金额</label>
                  <input class="input" name="amount" type="number" min="0" step="0.01" placeholder="0.00" required />
                </div>
                <div class="field">
                  <label>日期</label>
                  <input class="input" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required />
                </div>
              </div>
              <div class="field">
                <label>分类</label>
                <div class="category-grid">
                  ${categories.map((item) => `
                    <button class="category-chip ${state.selectedCategory === item ? 'active' : ''}" type="button" data-category="${item}">
                      ${item}
                    </button>
                  `).join('')}
                </div>
              </div>
              <div class="field">
                <label>备注</label>
                <input class="input" name="note" placeholder="可不填，比如食堂、地铁、奶茶" />
              </div>
              <button class="btn" type="submit">保存并接受豪豪审判</button>
            </form>
          </section>

          <section class="card view-section ${state.activeView === 'stats' ? 'active-view' : ''}" data-view="stats">
            <div class="section-title">
              <div>
                <h3>${periodName(state.period)}</h3>
                <p class="muted">${summary.label || state.month} · 豪豪替你把账算明白了</p>
              </div>
              <input class="input" id="statsMonthInput" type="month" value="${state.month}" style="max-width: 170px" />
            </div>
            ${periodTabs()}
            <div class="stats-summary">
              <div class="stat-tile primary"><span>总支出</span><strong>¥${money(summary.expense)}</strong></div>
              <div class="stat-tile"><span>总收入</span><strong class="income">¥${money(summary.income)}</strong></div>
              <div class="stat-tile"><span>结余</span><strong class="${summary.balance >= 0 ? 'income' : 'expense'}">¥${money(summary.balance)}</strong></div>
              <div class="stat-tile"><span>${state.period === 'year' ? '月均支出' : '日均支出'}</span><strong>¥${money(summary.averageExpense)}</strong></div>
              <div class="stat-tile"><span>记账笔数</span><strong>${summary.billCount || 0}</strong></div>
              <div class="stat-tile"><span>最高单笔</span><strong>${summary.highestExpense ? `¥${money(summary.highestExpense.amount)}` : '暂无'}</strong></div>
            </div>
          </section>

          <section class="card view-section ${state.activeView === 'stats' ? 'active-view' : ''}" data-view="stats">
            <div class="section-title"><h3>支出排行</h3></div>
            <div class="rank">
              ${summary.ranking.length ? summary.ranking.slice(0, 5).map((item) => `
                <div class="rank-row">
                  <span>${item.category}</span>
                  <div class="bar"><span style="width:${Math.max(6, Math.round(item.amount / maxRank * 100))}%"></span></div>
                  <strong>¥${money(item.amount)}</strong>
                </div>
              `).join('') : '<p class="muted">暂无排行，豪豪暂时无瓜可吃。</p>'}
            </div>
          </section>

          <section class="card view-section ${state.activeView === 'profile' ? 'active-view' : ''}" data-view="profile">
            <div class="section-title"><h3>月度预算</h3><strong>${Math.round(summary.usedRate * 100)}%</strong></div>
            <div class="bar"><span style="width:${Math.min(100, Math.round(summary.usedRate * 100))}%"></span></div>
            <p class="muted">预算 ¥${money(summary.budget)}，剩余 ¥${money(summary.budgetLeft)}</p>
            <form class="form budget-form" id="budgetForm">
              <input class="input" name="total" type="number" min="0" step="0.01" placeholder="设置本月总预算" value="${summary.budget || ''}" />
              <button class="btn secondary" type="submit">保存预算</button>
            </form>
          </section>

          <section class="card view-section ${state.activeView === 'profile' ? 'active-view' : ''}" data-view="profile">
            <div class="section-title"><h3>固定支出</h3></div>
            <form class="form" id="fixedForm">
              <input class="input" name="name" placeholder="项目名，例如电费" />
              <div class="grid-2">
                <input class="input" name="defaultAmount" type="number" min="0" step="0.01" placeholder="金额" />
                <select class="select" name="category">${fixedCategories.map((item) => `<option>${item}</option>`).join('')}</select>
              </div>
              <button class="btn secondary" type="submit">保存项目</button>
            </form>
            <div class="list">
              ${state.fixedItems.length ? state.fixedItems.map((item) => `
                <div class="bill">
                  <div><strong>${item.name}</strong><small>${item.category}</small></div>
                  <strong>¥${money(item.defaultAmount)}</strong>
                </div>
              `).join('') : '<p class="muted">还没有固定支出项目。</p>'}
            </div>
          </section>
        </aside>
      </div>

      <nav class="mobile-tabbar">
        <button class="${state.activeView === 'home' ? 'active' : ''}" data-view-tab="home"><span>⌂</span>首页</button>
        <button class="${state.activeView === 'add' ? 'active' : ''}" data-view-tab="add"><span>＋</span>记账</button>
        <button class="${state.activeView === 'bills' ? 'active' : ''}" data-view-tab="bills"><span>≡</span>账单</button>
        <button class="${state.activeView === 'stats' ? 'active' : ''}" data-view-tab="stats"><span>◔</span>统计</button>
        <button class="${state.activeView === 'profile' ? 'active' : ''}" data-view-tab="profile"><span>◇</span>固定</button>
      </nav>
    </div>
  `

  bindAppEvents()
}

function bindAppEvents() {
  document.querySelector('#logoutBtn').addEventListener('click', async () => {
    await api('/api/logout', { method: 'POST' })
    state.user = null
    renderAuth()
  })

  document.querySelectorAll('[data-view-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activeView = button.dataset.viewTab
      renderApp()
    })
  })

  document.querySelector('#monthInput').addEventListener('change', async (event) => {
    state.month = event.target.value
    await loadDashboard()
  })

  document.querySelector('#statsMonthInput').addEventListener('change', async (event) => {
    state.month = event.target.value
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
      state.billType = button.dataset.type
      state.selectedCategory = state.billType === 'income' ? incomeCategories[0] : expenseCategories[0]
      renderApp()
    })
  })

  document.querySelectorAll('[data-category]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedCategory = button.dataset.category
      renderApp()
    })
  })

  document.querySelector('#billForm').addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    payload.type = state.billType
    payload.category = state.selectedCategory
    try {
      const data = await api('/api/bills', { method: 'POST', body: JSON.stringify(payload) })
      judge(bearComment(data.bill))
      state.month = data.bill.month
      state.activeView = 'bills'
      await loadDashboard()
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelector('#budgetForm').addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/budget', { method: 'PUT', body: JSON.stringify({ month: state.month, total: form.get('total') }) })
      toast('预算已保存，豪豪开始盯线。')
      await loadDashboard()
    } catch (error) {
      toast(error.message)
    }
  })

  document.querySelector('#fixedForm').addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      await api('/api/fixed-items', { method: 'POST', body: JSON.stringify(Object.fromEntries(form.entries())) })
      toast('固定支出项目已保存。')
      await loadDashboard()
    } catch (error) {
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
}

async function loadDashboard() {
  const [summary, bills, fixedItems] = await Promise.all([
    api(`/api/summary?month=${encodeURIComponent(state.month)}&period=${encodeURIComponent(state.period)}`),
    api(`/api/bills?month=${encodeURIComponent(state.month)}&period=${encodeURIComponent(state.period)}`),
    api('/api/fixed-items')
  ])
  state.summary = summary
  state.bills = bills.bills
  state.fixedItems = fixedItems.items
  renderApp()
}

async function init() {
  try {
    const data = await api('/api/me')
    state.user = data.user
    if (state.user) {
      await loadDashboard()
    } else {
      renderAuth()
    }
  } catch (error) {
    renderAuth()
  }
}

init()
