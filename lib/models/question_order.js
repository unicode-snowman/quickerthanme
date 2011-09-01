var ormnomnom   = require('ormnomnom')
  , models      = ormnomnom.models
  , functional  = require('../../utils/functional')

module.exports = function(QuestionOrder, friends) {
  QuestionOrder.schema({
      'race': models.ForeignKey(friends.Race)
    , 'question': models.ForeignKey(friends.Question)
    , 'order': models.PositiveIntegerField()
  })
  QuestionOrder.meta({
    order_by: ['order']
  })
}
