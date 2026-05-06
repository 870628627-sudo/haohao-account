const { formatDate, formatMonth, money } = require('../../utils/format')
const { addBill, listFixedItems, saveFixedItem } = require('../../services/store')

const categories = ['水电燃气', '房租', '话费网费', '日用品', '会员订阅', '其他']

Page({
  data: {
    categories,
    categoryIndex: 0,
    form: {
      name: '',
      defaultAmount: '',
      category: categories[0],
      note: ''
    },
    items: []
  },

  onShow() {
    this.load()
  },

  async load() {
    const items = await listFixedItems()
    this.setData({
      items: items.map((item) => ({ ...item, amountText: money(item.defaultAmount) }))
    })
  },

  setName(event) {
    this.setData({ 'form.name': event.detail.value })
  },

  setAmount(event) {
    this.setData({ 'form.defaultAmount': event.detail.value })
  },

  setCategory(event) {
    const categoryIndex = Number(event.detail.value)
    this.setData({
      categoryIndex,
      'form.category': categories[categoryIndex]
    })
  },

  setNote(event) {
    this.setData({ 'form.note': event.detail.value })
  },

  async saveItem() {
    if (!this.data.form.name) {
      wx.showToast({ title: '先填项目名', icon: 'none' })
      return
    }

    if (!Number(this.data.form.defaultAmount)) {
      wx.showToast({ title: '先填默认金额', icon: 'none' })
      return
    }

    await saveFixedItem(this.data.form)
    this.setData({
      form: {
        name: '',
        defaultAmount: '',
        category: categories[0],
        note: ''
      },
      categoryIndex: 0
    })
    wx.showToast({ title: '已保存' })
    this.load()
  },

  async recordThisMonth(event) {
    const id = event.currentTarget.dataset.id
    const item = this.data.items.find((target) => target.id === id)
    if (!item) {
      return
    }

    if (!Number(item.defaultAmount)) {
      wx.showToast({ title: '金额不能为 0', icon: 'none' })
      return
    }

    await addBill({
      type: 'expense',
      amount: Number(item.defaultAmount || 0),
      category: item.category,
      date: formatDate(),
      month: formatMonth(),
      note: item.name,
      fixedItemId: item.id,
      isFixed: true
    })

    wx.showToast({ title: '已记入本月' })
  }
})
