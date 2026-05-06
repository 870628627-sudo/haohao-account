Page({
  data: {
    cloudReady: false
  },

  onShow() {
    this.setData({
      cloudReady: Boolean(getApp().globalData.cloudReady)
    })
  },

  goBudget() {
    wx.navigateTo({ url: '/pages/budget/budget' })
  },

  goFixed() {
    wx.navigateTo({ url: '/pages/fixed/fixed' })
  },

  goBills() {
    wx.switchTab({ url: '/pages/bills/bills' })
  }
})
