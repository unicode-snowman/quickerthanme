var ormnomnom = require('ormnomnom')
  , models    = ormnomnom.models

module.exports =
models.namespace('quickerthanme', function(ns) {
  var User = ns.create('User')

  User.schema({
      access_token      : models.CharField
    , gravatar_id       : models.CharField
    , company           : models.CharField
    , name              : models.CharField
    , screen_name       : models.CharField
    , email             : models.CharField
  })

  User.prototype.get_absolute_url = function() {
    var routes = require('./routes')
    return routes.reverse('user', [this.screen_name])
  }

  User.from_oauth = function(access, oauth, ready) {
    User.objects.get({
      access_token:access
    })(function(err, data) {
      if(err || !data) {
        User.objects.create({
            access_token  : ''+access
          , gravatar_id   : ''+oauth.gravatar_id
          , company       : ''+oauth.company
          , name          : ''+oauth.name
          , screen_name   : ''+oauth.login
          , email         : ''+oauth.email
        })(ready)
      } else {
        ready(null, data)
      }
    })
  }

  var Question = ns.create('Question')
  Question.CHOICES =  {
      "strict": "Strictly Equal",
      "set": "Contained In Set",
      "float": "Float (to 6 decimal places"
  }

  Question.schema({
      'input'             :models.TextField
    , 'output'            :models.TextField
    , 'comparison_type'   :models.CharField({max_length:6})
    , 'created_by'        :models.ForeignKey(User)
    , 'created_on'        :models.PositiveIntegerField
    , 'description'       :models.CharField
    , 'reference'         :models.TextField
  })

  Question.prototype.human_comparison_type = function() {
    return Question.CHOICES[this.comparison_type]
  }

  var Answer = ns.create('Answer')
  Answer.schema({
      'user'            :models.ForeignKey(User)
    , 'question'        :models.ForeignKey(Question)
    , 'order'           :models.PositiveIntegerField
    , 'solution'        :models.TextField
    , 'elapsed_ms'      :models.PositiveIntegerField
    , 'ended_on'        :models.PositiveIntegerField
  })

  var Outcome = ns.create('Outcome')
    , Race = ns.create('Race')

  Outcome.STATUSES = {
      'won'   :'Won'
    , 'lost'  :'Lost'
    , 'quit'  :'Quit'
  }

  Outcome.schema({
      'user'        :models.ForeignKey(User)
    , 'status'      :models.CharField({max_length:10})
    , 'ended_on'    :models.PositiveIntegerField
    , 'race' :models.ForeignKey(Race)
  })

  var NotDone = 0
  Race.TYPE = [
      'multiplayer'
    , 'ghost'
    , 'timetrial'
  ]
  Race.schema({
      "started_by"    : models.ForeignKey(User, {related_name:'initiated_race_set'})
    , "created_on"    : models.PositiveIntegerField
    , "started_on"    : models.PositiveIntegerField
    , "ended_on"      : models.PositiveIntegerField({default:NotDone})
    , "type"          : models.CharField({max_length:10})
    , "racers"        : models.ManyToMany(User, {related_name:'participated_in'})
    , "answers"       : models.ManyToMany(Answer)
    , "won_by"        : models.ForeignKey(User, {related_name:'won_race_set'})
  })



})
