const { formatMonth, money } = require('../../utils/format')
const { listBills, getBudget, summarizeBills } = require('../../services/store')

Page({
  data: {
    month: formatMonth(),
    summary: {},
    ranking: []
  },

  onShow() {
    this.load()
  },

  async load() {
    const month = formatMonth()
    const [bills, budget] = await Promise.all([listBills(month), getBudget(month)])
    const summary = summarizeBills(bills, budget)
    const rankMap = {}

    bills.filter((bill) => bill.type === 'expense').forEach((bill) => {
      rankMap[bill.category] = (rankMap[bill.category] || 0) + Number(bill.amount)
    })

    const ranking = Object.keys(rankMap)
      .map((category) => ({ category, amount: rankMap[category], amountText: money(rankMap[category]) }))
      .sort((a, b) => b.amount - a.amount)

    this.setData({
      month,
      summary: {
        ...summary,
        incomeText: money(summary.income),
        expenseText: money(summary.expense),
        balanceText: money(summary.balance),
        budgetText: money(summary.budget),
        budgetLeftText: money(summary.budgetLeft),
        usedPercent: Math.round(summary.usedRate * 100),
        barPercent: Math.min(100, Math.round(summary.usedRate * 100))
      },
      ranking
    })
  }
})
