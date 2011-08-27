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

  User.prototype.total_races = function() {
    console.log('In total races');
    this.outcome_set.count().on('data', function(count) {
      console.log("Total races: ", count)
      return count
    }).on('error', function(err) {
      console.log("Total races errored: ", err, err.stack)
      return 0
    })
  }
  User.prototype.races_won = function() {
    this.outcome_set.filter({status: 'won'}).count().on('data', function(count) {
      return count
    }).on('error', function(err) {
      return 0
    })
  }
  User.prototype.questions_solved = function() {
    this.answer_set.count().on('data', function(count) {
      return count
    }).on('error', function(err) {
      return 0
    })
  }
  User.prototype.avg_question_time = function() {
    var connection = conn.get_connection('default')
    var query = "SELECT AVG(elapsed_ms) / 1000 AS avg_question_time FROM quickerthanme_answer WHERE user_id = $1"
    connection.client(function(client) {
      client.execute(query, [this.pk], {}, {}, function(err, rowData) {
        if(err) {
          console.error("avg_question_time for user ", this.pk, " failed:", err)
        }
        return rowData.rows[0].avg_question_time || 0
      })
    })
  }
  User.prototype.questions_created = function() {
    this.question_set.count().on('data', function(count) {
      return count
    }).on('error', function(err) {
      return 0
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

  QuestionOrder.schema({
      'race': models.ForeignKey(Race)
    , 'question': models.ForeignKey(Question)
    , 'order': models.IntegerField({default: 0})
  })
  QuestionOrder.meta({
    ordering: ['order']
  })

  Question.prototype.human_comparison_type = function() {
    return Question.CHOICES[this.comparison_type]
  }

  Answer.schema({
      'user'            :models.ForeignKey(User)
    , 'question'        :models.ForeignKey(Question)
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
    , 'ended_on'    :models.PositiveIntegerField
    , 'race'        :models.ForeignKey(Race)
  })

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

  Session.schema({
    'sid'             : models.CharField
  , 'session'         : models.TextField
  })

})
