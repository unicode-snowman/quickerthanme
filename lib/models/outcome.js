var ormnomnom   = require('ormnomnom')
  , models      = ormnomnom.models
  , functional  = require('../../utils/functional')

module.exports = function(Outcome, friends) {
  Outcome.schema({
      'user'        :models.ForeignKey(friends.User)
    , 'status'      :models.CharField({max_length:10})
    , 'place'       :models.IntegerField
    , 'ended_on'    :models.PositiveIntegerField
    , 'race'        :models.ForeignKey(friends.Race)
  })

  Outcome.STATUSES = {
      'won'   :'Won'
    , 'lost'  :'Lost'
    , 'quit'  :'Quit'
  }

  Outcome.meta({
    'order_by':['place']
  })

  Outcome.prototype.answers = function(ready) {
    var self = this

    var answers = 
        friends.Answer.objects
        .filter({question_order__race:self.race, user:self.user})
        .order_by('question_order__order')
     
    answers(ready)
  }
}

