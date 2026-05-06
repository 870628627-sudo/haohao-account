const sharpComments = [
  '这笔花得挺猛，钱包刚才好像翻了个白眼。',
  '刚记完这笔，豪豪建议你和购物欲分居两天。',
  '这价格很有野心，你的钱包明显没有。',
  '不是不让花，是你这笔确实有点放飞。'
]

const praiseComments = [
  '这笔很克制，豪豪今天允许你夸自己一句。',
  '不错，钱包没有发出求救信号。',
  '会过日子的人，连数字都显得顺眼。',
  '这笔很稳，豪豪给你盖个省钱章。'
]

const normalComments = [
  '记下来了，至少你没有让钱消失得不明不白。',
  '这笔正常，钱包暂时还能站起来。',
  '必要支出逃不掉，记账这步已经赢了。',
  '豪豪已记录，月底复盘别装不认识它。'
]

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function getBearComment(record, budgetStatus) {
  const amount = Number(record.amount || 0)
  const category = record.category || ''
  const necessary = ['交通', '水电燃气', '房租', '话费网费', '医疗'].includes(category)

  if (record.type === 'income') {
    return '收入到账，钱包终于等到一点尊重。'
  }

  if (budgetStatus && budgetStatus.usedRate >= 1) {
    return '预算已经被你花穿了，豪豪建议今天先别和支付软件见面。'
  }

  if (!necessary && amount >= 100) {
    return pick(sharpComments)
  }

  if (amount <= 20) {
    return pick(praiseComments)
  }

  return pick(normalComments)
}

module.exports = {
  getBearComment
}
