var ormnomnom   = require('ormnomnom')
  , models      = ormnomnom.models
  , functional  = require('../../utils/functional')

module.exports = function(Question, friends) {
  Question.schema({
      'input'             :models.TextField
    , 'output'            :models.TextField
    , 'comparison_type'   :models.CharField({max_length:6})
    , 'created_by'        :models.ForeignKey(friends.User)
    , 'created_on'        :models.PositiveIntegerField
    , 'description'       :models.CharField
    , 'reference'         :models.TextField
  })

  Question.CHOICES =  {
      "strict": "Strictly Equal",
      "set": "Contained In Set",
      "float": "Float (to 6 decimal places"
  }

  Question.prototype.human_comparison_type = function() {
    return Question.CHOICES[this.comparison_type]
  }

  Question.prototype.get_user_data = function() {
    return {
        'input':      this.input
      , 'description':this.description
    }
  }
}
