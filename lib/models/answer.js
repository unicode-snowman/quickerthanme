var ormnomnom   = require('ormnomnom')
  , models      = ormnomnom.models
  , functional  = require('../../utils/functional')

module.exports = function(Answer, friends) {
  Answer.schema({
      'user'            :models.ForeignKey(friends.User)
    , 'question_order'  :models.ForeignKey(friends.QuestionOrder)
    , 'order'           :models.PositiveIntegerField
    , 'solution'        :models.TextField
    , 'elapsed_ms'      :models.PositiveIntegerField
    , 'ended_on'        :models.PositiveIntegerField
  })

  Answer.prototype.time_taken = function() {
    return this.elapsed_ms / 1000
  }

}
