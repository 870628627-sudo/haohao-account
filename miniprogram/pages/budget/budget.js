const { formatMonth } = require('../../utils/format')
const { getBudget, saveBudget } = require('../../services/store')

Page({
  data: {
    month: formatMonth(),
    total: ''
  },

  onLoad() {
    this.load()
  },

  async load() {
    const budget = await getBudget(this.data.month)
    this.setData({ total: budget.total ? String(budget.total) : '' })
  },

  setMonth(event) {
    this.setData({ month: event.detail.value }, () => this.load())
  },

  setTotal(event) {
    this.setData({ total: event.detail.value })
  },

  async save() {
    await saveBudget({
      month: this.data.month,
      total: Number(this.data.total || 0)
    })
    wx.showToast({ title: '预算已保存' })
  }
})
