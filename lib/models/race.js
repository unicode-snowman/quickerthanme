var ormnomnom   = require('ormnomnom')
  , models      = ormnomnom.models
  , functional  = require('../../utils/functional')

module.exports = function(Race, friends) {
  Race.schema({
      "started_by"    : models.ForeignKey(friends.User, {related_name:'initiated_race_set'})
    , "created_on"    : models.PositiveIntegerField({default:Date.now})
    , "started_on"    : models.PositiveIntegerField({default:0})
    , "ended_on"      : models.PositiveIntegerField({default:0})
    , "ghost_parent"  : models.IntegerField({nullable: true, default:null})
    , "type"          : models.CharField({max_length:12})
    , "min_players"   : models.IntegerField({default: 1})
    , "racers"        : models.ManyToMany(friends.User, {related_name:'participated_in'})
    , "questions"     : models.ManyToMany(friends.Question, {through:friends.QuestionOrder})
    , "answers"       : models.ManyToMany(friends.Answer)
    , "won_by"        : models.ForeignKey(friends.User, {related_name:'won_race_set', nullable: true})
  })

  Race.TYPE = [
      'multiplayer'
    , 'ghost'
    , 'timetrial'
  ]

  Race.prototype.get_absolute_url = function() {
    var routes = require('../routes')
    return routes.reverse('race', [this.pk])
  }

  Race.prototype.get_type_display = function() {
    return {
      'multiplayer' : 'Multiplayer'
    , 'ghost'       : 'Ghost'
    , 'timetrial'   : 'Time Trial'
    }[this.type]
  }

  Race.prototype.played_on = function() {
    var when = new Date(this.started_on)
    return when.toDateString() + ' @ ' + when.toTimeString()
  }

  Race.prototype.get_outcome = function(place_number, ready) {
    this.outcome_set.get({'place': place_number})(function(err, data) {
      ready(null, data || null)   
    })
  }

  Race.prototype.get_first_place  = Race.prototype.get_outcome.curry(1)
  Race.prototype.get_second_place = Race.prototype.get_outcome.curry(2)
  Race.prototype.get_third_place  = Race.prototype.get_outcome.curry(3)

  Race.prototype.results = function(ready) {
    this.outcome_set.all().order_by('place')(ready)
  }

}
