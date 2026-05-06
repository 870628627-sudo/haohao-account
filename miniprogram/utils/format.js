function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatMonth(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function money(value) {
  return Number(value || 0).toFixed(2)
}

module.exports = {
  formatDate,
  formatMonth,
  money
}
