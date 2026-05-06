const { formatMonth, money } = require('../../utils/format')
const { listBills, removeBill } = require('../../services/store')

Page({
  data: {
    month: formatMonth(),
    bills: []
  },

  onShow() {
    this.load()
  },

  async load() {
    const bills = await listBills(this.data.month)
    this.setData({
      bills: bills.map((bill) => ({ ...bill, amountText: money(bill.amount) }))
    })
  },

  setMonth(event) {
    this.setData({ month: event.detail.value }, () => this.load())
  },

  deleteBill(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({
      title: '删除账单',
      content: '删了就真没了，豪豪不会替你背锅。',
      success: async (res) => {
        if (res.confirm) {
          await removeBill(id)
          this.load()
        }
      }
    })
  },

  exportCsv() {
    if (this.data.bills.length === 0) {
      wx.showToast({ title: '没有可导出的账单', icon: 'none' })
      return
    }

    const header = '日期,类型,分类,金额,备注,创建时间'
    const rows = this.data.bills.map((bill) => [
      bill.date,
      bill.type === 'income' ? '收入' : '支出',
      bill.category,
      bill.amount,
      bill.note || '',
      bill.createdAt || ''
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))

    const filePath = `${wx.env.USER_DATA_PATH}/豪豪记账-${this.data.month}.csv`
    const fs = wx.getFileSystemManager()
    fs.writeFile({
      filePath,
      data: [header, ...rows].join('\n'),
      encoding: 'utf8',
      success: () => {
        wx.openDocument({
          filePath,
          fileType: 'csv',
          showMenu: true
        })
      },
      fail: () => {
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  }
})
