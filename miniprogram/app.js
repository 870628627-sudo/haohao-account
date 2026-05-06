const { initCloud } = require('./utils/cloud')

App({
  globalData: {
    bookId: 'personal',
    cloudReady: false
  },

  onLaunch() {
    this.globalData.cloudReady = initCloud()
  }
})
