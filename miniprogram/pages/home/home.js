const { formatMonth, money } = require('../../utils/format')
const { listBills, getBudget, summarizeBills } = require('../../services/store')

Page({
  data: {
    month: formatMonth(),
    recentBills: [],
    bearComment: '豪豪在线盯账，别让钱跑得太潇洒。',
    summary: {
      incomeText: '0.00',
      expenseText: '0.00',
      balanceText: '0.00',
      usedPercent: 0,
      usedRate: 0
    }
  },

  onShow() {
    this.load()
  },

  async load() {
    const month = formatMonth()
    const [bills, budget] = await Promise.all([listBills(month), getBudget(month)])
    const summary = summarizeBills(bills, budget)

    this.setData({
      month,
      recentBills: bills.slice(0, 5).map((bill) => ({ ...bill, amountText: money(bill.amount) })),
      summary: {
        ...summary,
        incomeText: money(summary.income),
        expenseText: money(summary.expense),
        balanceText: money(summary.balance),
        usedPercent: Math.round(summary.usedRate * 100)
      },
      bearComment: summary.usedRate >= 1
        ? '预算已经被你花穿了，豪豪建议今天先别和支付软件见面。'
        : '今天也要记账，别让钱消失得像没来过。'
    })
  },

  goAdd() {
    wx.switchTab({ url: '/pages/add/add' })
  },

  goBills() {
    wx.switchTab({ url: '/pages/bills/bills' })
  },

  goFixed() {
    wx.navigateTo({ url: '/pages/fixed/fixed' })
  }
})
