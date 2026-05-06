const { formatDate, formatMonth } = require('../../utils/format')
const { addBill, listBills, getBudget, summarizeBills } = require('../../services/store')
const { getBearComment } = require('../../utils/bear')

const expenseCategories = ['早餐', '午餐', '晚餐', '零食饮料', '交通', '水电燃气', '房租', '话费网费', '日用品', '医疗', '娱乐', '购物', '人情往来', '其他']
const incomeCategories = ['工资', '生活费', '零花钱', '兼职', '红包', '退款', '其他']

Page({
  data: {
    form: {
      type: 'expense',
      amount: '',
      category: '午餐',
      date: formatDate(),
      note: ''
    },
    categories: expenseCategories.map((name) => ({ name }))
  },

  onShow() {
    this.resetDate()
  },

  resetDate() {
    this.setData({ 'form.date': formatDate() })
  },

  setType(event) {
    const type = event.currentTarget.dataset.type
    const source = type === 'income' ? incomeCategories : expenseCategories
    this.setData({
      'form.type': type,
      'form.category': source[0],
      categories: source.map((name) => ({ name }))
    })
  },

  setAmount(event) {
    this.setData({ 'form.amount': event.detail.value })
  },

  setCategory(event) {
    this.setData({ 'form.category': event.currentTarget.dataset.name })
  },

  setDate(event) {
    this.setData({ 'form.date': event.detail.value })
  },

  setNote(event) {
    this.setData({ 'form.note': event.detail.value })
  },

  async submit() {
    const amount = Number(this.data.form.amount)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '先填金额', icon: 'none' })
      return
    }

    const record = await addBill({
      ...this.data.form,
      amount,
      month: formatMonth(new Date(this.data.form.date.replace(/-/g, '/')))
    })

    const [bills, budget] = await Promise.all([listBills(record.month), getBudget(record.month)])
    const comment = getBearComment(record, summarizeBills(bills, budget))

    wx.showModal({
      title: '豪豪点评',
      content: comment,
      showCancel: false,
      success: () => {
        this.setData({
          form: {
            type: 'expense',
            amount: '',
            category: '午餐',
            date: formatDate(),
            note: ''
          },
          categories: expenseCategories.map((name) => ({ name }))
        })
      }
    })
  }
})
