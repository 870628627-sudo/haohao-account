const bearSrc = '/assets/bear-ledger.jpg'
const expenseCategories = ['早餐', '午餐', '晚餐', '水果', '零食饮料', '交通', '话费网费', '日用品', '医疗', '娱乐', '王者荣耀', '保卫向日葵', '旅游', '购物', '人情往来', '其他']
const incomeCategories = ['工资', '生活费', '零花钱', '兼职', '红包', '退款', '其他']
const fixedCategories = ['水电燃气', '房租', '物业费', '停车费', '话费网费', '会员订阅', '其他']

const state = {
  user: null,
  month: new Date().toISOString().slice(0, 7),
  period: 'month',
  billType: 'expense',
  selectedCategory: '午餐',
  activeView: 'home',
  bills: [],
  summary: null,
  fixedItems: [],
  billDraft: {
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: ''
  }
}

const app = document.querySelector('#app')

function money(value) {
  return Number(value || 0).toFixed(2)
}

function monthLabel(month) {
  const [year, monthNumber] = String(month || '').split('-')
  if (!year || !monthNumber) return '当前月份'
  return `${year}年${monthNumber}月`
}

function escapeAttr(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function captureBillDraft() {
  const form = document.querySelector('#billForm')
  if (!form) return
  const data = new FormData(form)
  state.billDraft = {
    amount: String(data.get('amount') || ''),
    date: String(data.get('date') || new Date().toISOString().slice(0, 10)),
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
  const currentYear = new Date().getFullYear()
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
  const necessaryCategories = ['交通', '水电燃气', '房租', '话费网费', '医疗', '日用品']

  if (record.type === 'income') {
    if (amount >= 3000) return pickComment(record, ['大额收入到账，豪豪宣布钱包今天恢复编制。', '这笔收入很顶，先别急着奖励自己，豪豪已经盯住购物车了。', '钱包突然精神了，但豪豪建议先把预算排个队。'])
    if (amount >= 500) return pickComment(record, ['收入到账，钱包终于等到一点尊重。', '这笔进账不错，豪豪建议先存一口，再花一口。', '钱来了，豪豪提醒你别让它刚进门就下班。'])
    return pickComment(record, ['小收入也要记，豪豪给认真生活加一分。', '这笔进账不大，但它很清白，记上就赢。', '零钱入账也值得有姓名，豪豪已登记。'])
  }

  if (necessaryCategories.includes(category)) {
    if (amount >= 1000) return pickComment(record, ['必要支出也挺重，豪豪建议月底给它单独开个会。', '这笔是刚需，但金额不小，钱包需要深呼吸。', '逃不掉的支出已记录，豪豪先不吐槽你，吐槽账单。'])
    if (amount >= 200) return pickComment(record, ['刚需支出通过，豪豪只提醒一句：记得看本月结余。', '这类钱花得有理由，但也别让它悄悄长胖。', '必要项目已归档，钱包没有喊冤，只是有点沉默。'])
    return pickComment(record, ['这笔刚需很正常，记下来就已经赢一半。', '必要支出别内耗，豪豪批准通过。', '这钱花得明白，钱包暂时没有意见。'])
  }

  if (['早餐', '午餐', '晚餐'].includes(category)) {
    if (amount <= 15) return pickComment(record, ['这顿饭很克制，豪豪怀疑你偷偷会过日子。', '餐饮控制得不错，钱包今天没被油烟熏晕。', '这一餐很稳，豪豪给你盖个省钱章。'])
    if (amount <= 40) return pickComment(record, ['这顿饭价格正常，豪豪暂时放下计算器。', '吃饭是正事，这笔看起来还算讲道理。', '这餐没有离谱，钱包保持冷静。'])
    if (amount <= 100) return pickComment(record, ['这顿饭有点豪华，豪豪已经开始翻本月预算了。', '餐饮支出抬头了，豪豪建议下一餐朴素一点。', '吃得不错，钱包也确实瘦了一点。'])
    return pickComment(record, ['这顿饭是镶金边了吗？豪豪替钱包沉默三秒。', '餐饮单笔破百，豪豪建议把它列入重点观察。', '这顿饭很有排面，但预算可能没这么爱面子。'])
  }

  if (['水果', '零食饮料'].includes(category)) {
    if (amount <= 20) return pickComment(record, ['小零食可以，豪豪允许快乐有一点预算。', '这笔嘴馋支出还算克制，钱包没报警。', '甜的可以有，但豪豪已经开始数次数了。'])
    if (amount <= 50) return pickComment(record, ['零食饮料有点活跃，豪豪建议它明天低调。', '这笔快乐不算便宜，钱包正在小声记仇。', '嘴巴开心了，预算表开始皱眉。'])
    return pickComment(record, ['零食饮料花到这个数，豪豪建议快乐先冷静两天。', '这不是嘴馋，这是预算的支线剧情。', '喝的吃的很开心，钱包看起来不太开心。'])
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

  if (category === '旅游') {
    if (amount <= 200) return pickComment(record, ['旅行支出已记录，开心可以，预算也要带上。', '这笔旅游还算温和，豪豪祝你玩得明白。', '出去看看挺好，回来也记得看看账。'])
    return pickComment(record, ['旅游支出不小，豪豪建议把快乐和预算一起打包。', '这趟体验感应该不错，钱包的参与感也很强。', '旅行可以治愈心情，但豪豪负责照看余额。'])
  }

  if (category === '人情往来') {
    if (amount <= 100) return pickComment(record, ['人情往来已记，豪豪理解这笔社会性支出。', '这笔花得有人情味，预算也闻到了。', '关系要维护，账也要记清。'])
    return pickComment(record, ['人情支出有点重，豪豪建议月底单独复盘。', '这笔不是乱花，但金额确实有存在感。', '面子照顾到了，钱包也需要被照顾一下。'])
  }

  if (amount <= 20) return pickComment(record, ['这笔很克制，豪豪今天允许你夸自己一句。', '小额支出稳稳落地，钱包没有受惊。', '这笔钱走得很安静，豪豪表示满意。'])
  if (amount >= 300) return pickComment(record, ['这笔花得挺猛，豪豪已经把它圈出来了。', '单笔金额偏大，钱包刚才明显顿了一下。', '豪豪建议这笔进本月复盘重点名单。'])
  if (amount >= 100) return pickComment(record, ['这笔有点份量，豪豪建议接下来两天收一收。', '钱包被轻轻拍了一下，不疼但记得。', '金额不算小，豪豪已经开始盯本月节奏。'])
  return pickComment(record, ['记下来了，至少你没有让钱消失得不明不白。', '这笔普通消费已归档，豪豪继续盯账。', '账记清了，钱包少一点神秘失踪案。'])
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
              <div class="hero-date">
                <span>当前账期</span>
                <strong>${monthLabel(state.month)}</strong>
              </div>
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
            <div class="section-title bill-title">
              <div class="title-tabs">
                ${['month', 'year'].map((period) => `<button class="${state.period === period ? 'active' : ''}" data-period="${period}">${periodName(period)}</button>`).join('')}
              </div>
              ${periodDateInput('monthInput')}
            </div>
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
                  <input class="input date-compact" name="date" type="date" value="${escapeAttr(state.billDraft.date || new Date().toISOString().slice(0, 10))}" required />
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
                <input class="input" name="note" placeholder="可不填，比如食堂、地铁、奶茶" value="${escapeAttr(state.billDraft.note)}" />
              </div>
            </form>
          </section>

          <section class="card view-section ${state.activeView === 'stats' ? 'active-view' : ''}" data-view="stats">
            <div class="period-tabs top-period-tabs">
              ${['month', 'year'].map((period) => `<button class="${state.period === period ? 'active' : ''}" data-period="${period}">${periodName(period)}</button>`).join('')}
            </div>
            <div class="section-title">
              <div>
                <h3>${periodName(state.period)}</h3>
                <p class="muted">${summary.label || state.month} · 豪豪替你把账算明白了</p>
              </div>
              ${periodDateInput('statsMonthInput')}
            </div>
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
                  <div class="amount">
                    <strong>¥${money(item.defaultAmount)}</strong>
                    <div class="bill-actions">
                      <button class="btn secondary" data-record-fixed="${item.id}" type="button">记本月</button>
                      <button class="btn danger" data-delete-fixed="${item.id}" type="button">删除</button>
                    </div>
                  </div>
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
      captureBillDraft()
      state.activeView = button.dataset.viewTab
      renderApp()
    })
  })

  document.querySelector('#monthInput').addEventListener('change', async (event) => {
    state.month = state.period === 'year' ? `${event.target.value || selectedYear()}-01` : event.target.value
    await loadDashboard()
  })

  document.querySelector('#statsMonthInput').addEventListener('change', async (event) => {
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
      })
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
      state.billDraft = {
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        note: ''
      }
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

  document.querySelectorAll('[data-record-fixed]').forEach((button) => {
    button.addEventListener('click', async () => {
      const item = state.fixedItems.find((target) => target.id === button.dataset.recordFixed)
      if (!item) return

      const today = new Date().toISOString().slice(0, 10)
      try {
        const data = await api('/api/bills', {
          method: 'POST',
          body: JSON.stringify({
            type: 'expense',
            amount: item.defaultAmount,
            category: item.category,
            date: today,
            note: item.name,
            isFixed: true
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
