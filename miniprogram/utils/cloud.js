function initCloud() {
  if (!wx.cloud) {
    return false
  }

  try {
    wx.cloud.init({
      traceUser: true
    })
  } catch (error) {
    console.warn('cloud init failed, app will use local cache', error)
    return false
  }

  return true
}

function getDb() {
  if (!wx.cloud) {
    return null
  }

  try {
    return wx.cloud.database()
  } catch (error) {
    console.warn('cloud database unavailable', error)
    return null
  }
}

module.exports = {
  initCloud,
  getDb
}
