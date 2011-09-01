var ormnomnom   = require('ormnomnom')
  , models      = ormnomnom.models
  , functional  = require('../utils/functional')

module.exports =
models.namespace('quickerthanme', function(ns) {
  var User          = ns.create('User')
    , Race          = ns.create('Race')
    , Question      = ns.create('Question')
    , QuestionOrder = ns.create('QuestionOrder')
    , Answer        = ns.create('Answer')
    , Session       = ns.create('Session')

  User.schema({
      access_token      : models.CharField
    , gravatar_id       : models.CharField
    , company           : models.CharField
    , name              : models.CharField
    , screen_name       : models.CharField({max_length:255, unique:true})
    , email             : models.CharField
  })

  User.prototype.__ident__ = 'screen_name'

  User.from_oauth = function(access, oauth, ready) {
    User.objects.filter({
      access_token:access
    })(function(err, data) {
      if(err || !data.length) {
        User.objects.create({
            access_token  : ''+access
          , gravatar_id   : ''+oauth.gravatar_id
          , company       : ''+oauth.company
          , name          : ''+oauth.name
          , screen_name   : ''+oauth.login
          , email         : ''+oauth.email
        })(ready)
      } else {
        ready(null, data[0])
      }
    })
  }

  User.prototype.get_absolute_url = function() {
    var routes = require('./routes')
    return routes.reverse('user', [this.screen_name])
  }

  User.prototype.total_races = function(ready) {
    this.outcome_set.all().count()(function(err, data) {
      ready(err, data || 0)
    })
  }

  User.prototype.races_won = function(ready) {
    this.outcome_set.filter({status: 'won'}).count()(function(err, data) {
      ready(err, data || 0)     
    })
  }

  User.prototype.questions_solved = function(ready) {
    this.answer_set.all().count()(function(err, data) {
      ready(err, data || 0)     
    })
  }

  User.prototype.avg_question_time = function(ready) {
    var query = "SELECT AVG(elapsed_ms) / 1000 AS avg_question_time FROM quickerthanme_answer WHERE user_id = $1"
      , self = this;

    ormnomnom.sql(query, [self.pk], function(err, rows) {
      ready(err, rows ? rows[0].avg_question_time || 0 : null)
    })
  }

  User.prototype.questions_created = function(ready) {
    this.question_set.all().count()(function(err, data) {
      ready(err, data || 0)    
    })
  }

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

  Question.prototype.get_user_data = function() {
    return {
        'input':      this.input
      , 'description':this.description
    }
  }

  QuestionOrder.schema({
      'race': models.ForeignKey(Race)
    , 'question': models.ForeignKey(Question)
    , 'order': models.PositiveIntegerField()
  })
  QuestionOrder.meta({
    order_by: ['order']
  })

  Question.prototype.human_comparison_type = function() {
    return Question.CHOICES[this.comparison_type]
  }

  Answer.schema({
      'user'            :models.ForeignKey(User)
    , 'question_order'        :models.ForeignKey(QuestionOrder)
    , 'order'           :models.PositiveIntegerField
    , 'solution'        :models.TextField
    , 'elapsed_ms'      :models.PositiveIntegerField
    , 'ended_on'        :models.PositiveIntegerField
  })

  Answer.prototype.time_taken = function() {
    return this.elapsed_ms / 1000
  }

  var Outcome = ns.create('Outcome')

  Outcome.STATUSES = {
      'won'   :'Won'
    , 'lost'  :'Lost'
    , 'quit'  :'Quit'
  }

  Outcome.schema({
      'user'        :models.ForeignKey(User)
    , 'status'      :models.CharField({max_length:10})
    , 'place'    :models.IntegerField
    , 'ended_on'    :models.PositiveIntegerField
    , 'race'        :models.ForeignKey(Race)
  })

  Outcome.meta({
    'order_by':['place']
  })

  Outcome.prototype.answers = function(ready) {
    var self = this

    var answers = 
        Answer.objects
        .filter({question_order__race:self.race, user:self.user})
        .order_by('question_order__order')
     
    answers(ready)
  }

  Race.schema({
      "started_by"    : models.ForeignKey(User, {related_name:'initiated_race_set'})
    , "created_on"    : models.PositiveIntegerField({default:Date.now})
    , "started_on"    : models.PositiveIntegerField({default:0})
    , "ended_on"      : models.PositiveIntegerField({default:0})
    , "ghost_parent"  : models.IntegerField({nullable: true, default:null})
    , "type"          : models.CharField({max_length:12})
    , "min_players"   : models.IntegerField({default: 1})
    , "racers"        : models.ManyToMany(User, {related_name:'participated_in'})
    , "questions"     : models.ManyToMany(Question, {through:QuestionOrder})
    , "answers"       : models.ManyToMany(Answer)
    , "won_by"        : models.ForeignKey(User, {related_name:'won_race_set', nullable: true})
  })

  Race.TYPE = [
      'multiplayer'
    , 'ghost'
    , 'timetrial'
  ]

  Race.prototype.get_absolute_url = function() {
    var routes = require('./routes')
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

  Session.schema({
    'sid'             : models.CharField
  , 'session'         : models.TextField
  })

})
