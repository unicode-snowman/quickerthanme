var ormnomnom   = require('ormnomnom')
  , models      = ormnomnom.models
  , functional  = require('../../utils/functional')

module.exports = function(User, friends) {
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

}
