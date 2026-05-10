const bearSrc = '/assets/bear-ledger.jpg'
const canvasFontFamily = '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans SC", "Noto Sans CJK SC", "Source Han Sans SC", "WenQuanYi Micro Hei", "SimHei", sans-serif'
const expenseCategories = ['早餐', '午餐', '晚餐', '水果', '奶茶', '零食', '交通', '话费网费', '日用品', '医疗', '娱乐', '王者荣耀', '保卫向日葵', '旅游', '购物', '理发', '人情往来', '其他']
const incomeCategories = ['工资', '生活费', '零花钱', '兼职', '红包', '退款', '其他']
const fixedCategories = ['水电燃气', '房租', '物业费', '停车费', '话费网费', '会员订阅', '小荷包', '其他']

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
  profileTool: '',
  accountMenuOpen: false,
  accountPanel: '',
  adminLoginOpen: false,
  adminPanelOpen: false,
  adminSummary: null,
  sharePanelOpen: false,
  shareImageUrl: '',
  heroMessageIndex: Math.floor(Math.random() * 12),
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

function monthLabel(month) {
  const [year, monthNumber] = String(month || '').split('-')
  if (!year || !monthNumber) return '当前月份'
  return `${year}年${monthNumber}月`
}

function formatDateTime(value) {
  if (!value) return '暂无'
  return String(value).replace('T', ' ').slice(0, 16)
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
  const fixedItems = await api('/api/fixed-items')
  state.fixedItems = fixedItems.items || []
  return state.fixedItems
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

  if (['水果', '奶茶', '零食', '零食饮料'].includes(category)) {
    if (category === '奶茶') {
      if (amount <= 20) return pickComment(record, ['奶茶支出还算克制，豪豪允许一点甜。', '这杯奶茶没有太过分，钱包暂时不抗议。', '快乐加冰可以，预算别加太满。'])
      if (amount <= 50) return pickComment(record, ['奶茶有点活跃，豪豪建议明天喝水冷静一下。', '这杯快乐不便宜，钱包已经记住甜度了。', '奶茶到账，预算表轻轻皱眉。'])
      return pickComment(record, ['奶茶喝到这个数，豪豪建议它先退出本周群聊。', '这不是奶茶，是钱包的甜蜜负担。', '豪豪不反对快乐，但反对奶茶连续开会。'])
    }
    if (amount <= 20) return pickComment(record, ['小零食可以，豪豪允许快乐有一点预算。', '这笔嘴馋支出还算克制，钱包没报警。', '甜的可以有，但豪豪已经开始数次数了。'])
    if (amount <= 50) return pickComment(record, ['零食有点活跃，豪豪建议它明天低调。', '这笔快乐不算便宜，钱包正在小声记仇。', '嘴巴开心了，预算表开始皱眉。'])
    return pickComment(record, ['零食花到这个数，豪豪建议快乐先冷静两天。', '这不是嘴馋，这是预算的支线剧情。', '吃得很开心，钱包看起来不太开心。'])
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

  if (category === '理发') {
    if (amount <= 60) return pickComment(record, ['发型支出很稳，豪豪批准你精神一点。', '理发记上了，钱包和发际线都需要被认真对待。', '这笔形象管理还算克制，豪豪点头。'])
    return pickComment(record, ['这次理发有点高级，豪豪希望发型撑得起价格。', '形象管理可以，但钱包刚刚也被修剪了一下。', '理发支出偏高，豪豪建议帅气多维持几天。'])
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
      refreshHeroMessage()
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
  if (!categories.includes(state.selectedCategory)) {
    state.selectedCategory = categories[0]
  }

  app.innerHTML = `
    <div class="shell app-shell" data-active-view="${state.activeView}">
      <header class="topbar">
        <div class="brand">
          <button class="brand-bear-button" id="accountBtn" type="button" aria-label="账户详情">
            <img src="${escapeAttr(avatarSrc())}" alt="账户头像" />
          </button>
          <strong class="brand-username">${escapeAttr(state.user.nickname)}</strong>
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
              <div class="hero-meta">
                <div class="eyebrow">本月概览</div>
                <div class="hero-period">${monthLabel(state.month)}</div>
              </div>
              <h2>${heroMessage.title}</h2>
              <p class="hero-text">${heroMessage.text}</p>
            </div>
            <img class="hero-bear" src="${bearSrc}" alt="豪豪小熊" />
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
              ${summary.ranking.length ? summary.ranking.slice(0, 5).map((item) => `
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
      </div>

      <nav class="mobile-tabbar">
        <button class="${state.activeView === 'home' ? 'active' : ''}" data-view-tab="home"><span>⌂</span>首页</button>
        <button class="${state.activeView === 'add' ? 'active' : ''}" data-view-tab="add"><span>＋</span>记账</button>
        <button class="${state.activeView === 'bills' ? 'active' : ''}" data-view-tab="bills"><span>≡</span>账单</button>
        <button class="${state.activeView === 'stats' ? 'active' : ''}" data-view-tab="stats"><span>◔</span>统计</button>
        <button class="${state.activeView === 'profile' ? 'active' : ''}" data-view-tab="profile"><span>◇</span>固定</button>
      </nav>

      ${state.accountMenuOpen ? `
        <div class="account-menu-sheet" role="dialog" aria-modal="true" aria-label="账户菜单">
          <div class="account-menu-card">
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
              <div class="avatar-editor">
                <img src="${escapeAttr(avatarSrc())}" alt="当前头像" />
                <div>
                  <strong>头像</strong>
                  <div class="avatar-actions">
                    <label class="avatar-action">
                      更换图片
                      <input id="avatarInput" type="file" accept="image/png,image/jpeg,image/webp" />
                    </label>
                    <button class="avatar-action" id="avatarResetBtn" type="button">系统小熊</button>
                  </div>
                </div>
              </div>
              <div class="account-details">
                <div><span>昵称</span><strong>${escapeAttr(state.user.nickname)}</strong></div>
                <div><span>邮箱</span><strong>${escapeAttr(state.user.email)}</strong></div>
                <div><span>注册时间</span><strong>${formatDateTime(state.user.createdAt)}</strong></div>
              </div>
              <form class="form account-form" id="profileForm">
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
            <div class="admin-users">
              ${(state.adminSummary?.users || []).map((user) => `
                <div class="admin-user">
                  <div>
                    <strong>${escapeAttr(user.nickname)}</strong>
                    <small>${escapeAttr(user.email)}</small>
                    <small>最近操作：${formatDateTime(user.lastActivityAt || user.createdAt)}</small>
                  </div>
                  <div>
                    <span>${user.billCount || 0} 笔</span>
                    <small>账单数</small>
                  </div>
                </div>
              `).join('') || '<p class="muted">暂无用户。</p>'}
            </div>
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
    renderApp()
  })

  document.querySelector('.admin-sheet')?.addEventListener('click', (event) => {
    if (event.target.classList.contains('admin-sheet')) {
      state.adminLoginOpen = false
      state.adminPanelOpen = false
      renderApp()
    }
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

  document.querySelector('#budgetForm')?.addEventListener('submit', async (event) => {
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

  document.querySelector('#fixedForm')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const formEl = event.currentTarget
    const form = new FormData(formEl)
    const payload = Object.fromEntries(form.entries())
    payload.name = String(payload.name || '').trim() || String(payload.category || '').trim()
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
  const items = (ranking || []).filter((item) => Number(item.amount) > 0)
  const top = items.slice(0, 4).map((item) => ({ category: item.category, amount: Number(item.amount) }))
  const otherAmount = items.slice(4).reduce((total, item) => total + Number(item.amount || 0), 0)
  if (otherAmount > 0) {
    top.push({ category: '其他', amount: otherAmount })
  }
  return top
}

function drawPieChart(ctx, items, cx, cy, radius, legendStartY = 864) {
  const colors = ['#f5b94c', '#5b351c', '#327451', '#a44b35', '#d98b58']
  const total = items.reduce((sum, item) => sum + item.amount, 0)
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
    const y = legendStartY + index * 62
    const percent = Math.round(item.amount / total * 100)
    roundedRect(ctx, 454, y + 5, 26, 26, 8)
    ctx.fillStyle = colors[index % colors.length]
    ctx.fill()
    ctx.fillStyle = '#352417'
    ctx.font = `900 23px ${canvasFontFamily}`
    ctx.fillText(item.category, 494, y + 28)
    ctx.fillStyle = '#987a58'
    ctx.font = `800 20px ${canvasFontFamily}`
    ctx.fillText(`${percent}% · ¥${money(item.amount)}`, 494, y + 56)
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
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 1280
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
  const pieItems = pieChartData(summary.ranking)
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
  const [summary, bills] = await Promise.all([
    api(`/api/summary?month=${encodeURIComponent(state.month)}&period=${encodeURIComponent(state.period)}`),
    api(`/api/bills?month=${encodeURIComponent(state.month)}&period=${encodeURIComponent(state.period)}`)
  ])
  await syncFixedItems()
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
      await loadDashboard()
    } else {
      renderAuth()
    }
  } catch (error) {
    renderAuth()
  }
}

init()
