var ormnomnom = require('ormnomnom')
  , models    = ormnomnom.models
  , conn = ormnomnom.connection.Connection

module.exports =
models.namespace('quickerthanme', function(ns) {
  var User = ns.create('User')
    , Race = ns.create('Race')
    , Question = ns.create('Question')
    , QuestionOrder = ns.create('QuestionOrder')
    , Answer = ns.create('Answer')
    , Session = ns.create('Session')

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

  User.prototype.total_races = function(ready) {
    this.outcome_set.all().count().on('data', function(count) {
      return ready(null, count)
    }).on('error', function(err) {
      return ready(null, 0)
    })
  }
  User.prototype.races_won = function(ready) {
    this.outcome_set.filter({status: 'won'}).count().on('data', function(count) {
      return ready(null, count)
    }).on('error', function(err) {
      return ready(null, 0)
    })
  }
  User.prototype.questions_solved = function(ready) {
    this.answer_set.all().count().on('data', function(count) {
      return ready(null, count)
    }).on('error', function(err) {
      return ready(null, 0)
    })
  }
  User.prototype.avg_question_time = function(ready) {
    var connection = conn.get_connection('default')
    var query = "SELECT AVG(elapsed_ms) / 1000 AS avg_question_time FROM quickerthanme_answer WHERE user_id = $1"
    var self = this;
    connection.client(function(client) {
      client.execute(query, [self.pk], {}, {}, function(err, rowData) {
        if(err) {
          console.error("avg_question_time for user ", self.pk, " failed:", err)
        }
        return ready(null, rowData.rows[0].avg_question_time || 0)
      })
    })
  }
  User.prototype.questions_created = function(ready) {
    this.question_set.all().count().on('data', function(count) {
      return ready(null, count)
    }).on('error', function(err) {
      return ready(null, 0)
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
    ordering: ['order']
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

  Outcome.prototype.answers = function(ready) {
    var self = this
    var answers_qs = Answer.objects.filter({'question_order__race': self.race, 'user': self.user})
    answers_qs.order_by = ['question_order__order']
    answers_qs.on('data', function(answers) {
      return ready(null, answers)
    }).on('error', function(err) {
      return ready(null, [])
    })
  }

  var NotDone = 0
  var NotStarted = 0
  Race.TYPE = [
      'multiplayer'
    , 'ghost'
    , 'timetrial'
  ]
  Race.schema({
      "started_by"    : models.ForeignKey(User, {related_name:'initiated_race_set'})
    , "created_on"    : models.PositiveIntegerField
    , "started_on"    : models.PositiveIntegerField
    , "ended_on"      : models.PositiveIntegerField
    , "ghost_parent"  : models.IntegerField({nullable: true})
    , "type"          : models.CharField({max_length:12})
    , "min_players"   : models.IntegerField({default: 1})
    , "racers"        : models.ManyToMany(User, {related_name:'participated_in'})
    , "questions"     : models.ManyToMany(Question, {through:QuestionOrder})
    , "answers"       : models.ManyToMany(Answer)
    , "won_by"        : models.ForeignKey(User, {related_name:'won_race_set', nullable: true})
  })

  Race.prototype.get_absolute_url = function() {
    var routes = require('./routes')
    return routes.reverse('race', [this.pk])
  }

  Race.prototype.get_outcome = function(place_number, ready) {
    this.outcome_set.get({'place': place_number}).on('data', function(outcome) {
      return ready(null, outcome)
    }).on('error', function(err) {
      return ready(null, null)
    })
  }

  Race.prototype.get_first_place = function(ready) {
    return this.get_outcome(1, ready)
  }

  Race.prototype.get_second_place = function(ready) {
    return this.get_outcome(2, ready)
  }

  Race.prototype.get_third_place = function(ready) {
    return this.get_outcome(3, ready)
  }

  Race.prototype.results = function(ready) {
    var outcomes_qs = this.outcome_set.all()
    outcomes_qs.order_by = ['place']
    outcomes_qs.on('data', function(outcomes) {
      return ready(null, outcomes)
    }).on('error', function(err) {
      return ready(null, [])
    })
  }

  Session.schema({
    'sid'             : models.CharField
  , 'session'         : models.TextField
  })

})
