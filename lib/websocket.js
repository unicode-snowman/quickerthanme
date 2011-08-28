var RACES = {}

var RaceState = function(race, questions) {
  this.race       = race
  this.questions  = questions
  this.users      = [] 
  this.finished   = []
}

var NotReady  = {}
  , Ready     = {}
  , Finished  = {}

RaceState.prototype.add_user = function(user, socket) {
  var state
    , found = false
  this.users.forEach(function(state) {
    if(state.user.pk === user.pk) {
      state.socket = socket
      found = true
    }
  })

  if(!found)
    this.users.push(state={
        user    :user
      , socket  :socket
      , state   :NotReady
      , question:0
      , offset  :0
      , modifier:'normal'
    })

  var self    = this
    , quorum  = self.users.length >= self.race.min_players

  self.users.forEach(function(state) {
      state.socket.emit('challenger', {
          'screen_name' :user.screen_name
        , 'gravatar_id' :user.gravatar_id
        , 'is_me'       :user.pk === state.user.pk
      }, quorum)
  })

  //socket.on('disconnect', this.on_disconnect.bind(this, state))
  socket.on('ready',      this.on_ready.bind(this, state))
  socket.on('solution',   this.on_solution.bind(this, state))
}

RaceState.prototype.done = function() {
  var self = this
  self.race.constructor.objects.filter({pk:self.race.pk})
      .update({ended_on:+new Date, won_by:self.finished[0].user})(
      function(err, data) {
        RACES[self.race.pk] = undefined
      })
}

RaceState.prototype.on_disconnect = function(user_state) {
  var self = this
  user_state.user.outcome_set.create({
    status:(user_state.state === Finished) ? self.finished[0].user.pk === user_state.user.pk ? 'won' : 'lost' : 'quit'
  , ended_on:+new Date
  , race:self.race
  })(function(err, outcome) {
    self.users.splice(self.users.indexOf(user_state), 1)
    if(self.users.length === 0)
      self.done()
  })
}

RaceState.prototype.on_ready = function(user_state) {
  console.error('READY %s', user_state.user.screen_name)
  user_state.state = Ready
  var all_ready = this.users.filter(function(state) { return state.state === NotReady }).length === 0
    , self = this

  // let errybody know this user is ready.
  self.users.map(function(user_state) {
    user_state.socket.emit('challenger_ready', user_state.user.screen_name)
  })


  // bam, everybody's ready.
  if(all_ready) {
    console.error('ERRYBODYS READY')
    var started = +new Date
    self.race.constructor.objects.filter({pk:self.race.pk}).update({started_on:started})(function(err, data) {
      self.users.map(function(state) {
        state.socket.emit('start', self.questions[0].get_user_data())
        state.offset = started
      })
    })
  }
}

RaceState.prototype.on_solution = function(user_state, solution) {
  console.log('------------ solution ---------------')


  var now = +new Date
    , offset = now - user_state.offset
    , question = this.questions[user_state.question]
    , check_code = require('./views').check_code
    , self = this
  check_code(
      solution
    , question.input
    , question.output
    , question.comparison_type
    , user_state.modifier
    , function(is_okay) {
      if(is_okay) {
        user_state.offset = now
        ++user_state.question
        user_state.modifier = 'normal'

        if(offset < 30000) {
          var modifiers = ['no_recursion', 'no_loops', 'no_conditionals', 'stmt_limit']
            , mod = modifiers[~~(modifiers.length * Math.random())]

          if(mod)
            self.users.forEach(function(user) {
              user.state.modifier = mod
              user.socket.emit('modifier', mod)
            })
        }

        var answer = user_state.user.answer_set.create({
            question:self.questions[user_state.question-1]
          , order   :user_state.question-1
          , solution:solution
          , elapsed_ms:offset
          , ended_on  :now
        })

        if(user_state.solution === self.questions.length) {
          var place = self.finished.push(user_state)
          user_state.socket.emit('finished', place) 
        } else {
          user_state.socket.emit('correct',  self.questions[user_state.question].get_user_data())
        }
      } else {
        user_state.socket.emit('wrong')
      }
    })
}

module.exports = function(socket) {
  var models  = require('./models').models
    , User    = models.User
    , Race    = models.Race

  socket.emit('whois')
  socket.on('join', function(race_id, user_id) {
    var uhoh = function(message) {
      console.error('ERROR: '+message)
      if(socket.writeable) socket.emit('error', message)
    }

    Race.objects.get({pk:race_id})(function(err, race) {
      if(err) uhoh('Invalid race'); else {
        if(race.ended_on > 1) {
          uhoh('race already ended at '+race.ended_on)
        } else {
          User.objects.get({pk:user_id})(function(err, user) {
            if(err)
              return uhoh('can\'t get that user');
            var state = RACES[race.pk]
              , ready = function(state) {
                state.add_user(user, socket)
              }
            if(state)
              ready(state, users[0], socket)
            else {
              race.racers.all()(function(err, racers) {
                if(err) uhoh('racers error'); else {
                  race.racers.add(user)(function(err) {
                    if(err) uhoh('racers add error'); else {
                      race.questions.all()(function(err, questions) {
                        console.error(questions)
                        ready(RACES[race.pk] || new RaceState(race, questions))
                      })
                    }
                  })
                }
              })
            }
          })
        }
      }
    })



  })
}
