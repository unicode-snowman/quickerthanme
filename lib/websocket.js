var RACES = {}

var RaceState = function(race, questions, is_ghost) {
  this.race       = race
  this.questions  = questions
  this.users      = []
  this.finished   = []
  this.started    = false
  this.is_ghost   = !!is_ghost
}

var NotReady  = {}
  , Ready     = {}
  , Finished  = {}
  , EE = require('events').EventEmitter
  , FakeSocket = function(){EE.call(this)}

FakeSocket.prototype = new EE
FakeSocket.prototype.close = function() {}

RaceState.prototype.add_ghost = function(user, ready) {
  var models  = require('./models').models
    , Answer  = models.Answer
    , self    = this
    , ee      = new FakeSocket

  var answers = Answer.objects.filter({
      user:user
    , question_order__race__pk:self.race.ghost_parent
  })
  answers.order_by = ['order']


  answers(function(err, answers) {
    err && console.error('cant get answers', err, err.stack)
    if(err)
      return ready(err);

    user.screen_name = 'GHOST_'+user.screen_name
    var user_state
    self.users.push(user_state={
      state   :Ready
    , user    :user
    , socket  :ee
    , question:0
    , modifier:'normal'
    , modifiers:[]
    , timeout :null
    , is_ghost:true
    , offset  :0
    })
    ee.on('start', function() {
      console.error('STARTED GHOST RACE')
      if(answers.length) {
        console.error('SETTING UP ANSWER IN ', answers[user_state.question].elapsed_ms)
        setTimeout(function() {
          console.error('SENDING GHOST ANSWER')
          self.users.map(function(ustate) {
            ustate.socket.emit('progress', user_state.user.screen_name, ++user_state.question, self.questions.length)
          })

          var next = answers[user_state.question-1]
          if(next) {
            console.error('SETTING UP ANSWER IN '+next.elapsed_ms)
            setTimeout(arguments.callee, next.elapsed_ms)
          } else {
            user_state.state = Finished
            self.create_outcome(user_state)
          }

        }, answers[user_state.question].elapsed_ms) 

      } else {
        setTimeout(function() {
          console.error(answers, 'done')
          user_state.state = Finished
          self.create_outcome(user_state)
        })
      }
    })

    return ready(null, ee)
  })
}

RaceState.prototype.add_user = function(user, socket) {
  var state
    , found = false
  this.users.forEach(function(ustate) {
    if(ustate.user.pk === user.pk) {
      state = ustate
      state.socket = socket
      if(state.timeout) {
        console.error('clearing timeout for '+user.screen_name)
        clearTimeout(state.timeout)
        state.timeout = null
      }
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
      , timeout :null
      , modifiers:[]
      , is_ghost:false
    })

  var self    = this
    , quorum  = self.users.length >= self.race.min_players

  self.users.forEach(function(ustate) {
      ustate.socket.emit('challenger', {
          'screen_name' :user.screen_name
        , 'gravatar_id' :user.gravatar_id
        , 'is_me'       :user.pk === ustate.user.pk && !ustate.is_ghost
        , 'ready'       :state.state === Ready
        , 'is_ghost'    :false
      }, quorum)

      if(ustate.user.pk !== user.pk)
        state.socket.emit('challenger', {
            'screen_name' :ustate.user.screen_name
          , 'gravatar_id' :ustate.user.gravatar_id
          , 'is_me'       :false
          , 'ready'       :ustate.state === Ready
          , 'is_ghost'    :ustate.is_ghost
        }, quorum)
  })

  socket.on('close',      this.on_disconnect.bind(this, state))
  socket.on('disconnect', this.on_disconnect.bind(this, state))
  socket.on('ready',      this.on_ready.bind(this, state))
  socket.on('solution',   this.on_solution.bind(this, state))
  socket.on('say',        this.on_say.bind(this, state))
}

RaceState.prototype.on_say = function(user_state, what) {
  var self = this
  self.users.forEach(function(ustate) {
    ustate.socket.emit('say', user_state.user.screen_name, what, ustate.user.pk === user_state.user.pk)
  })
}

RaceState.prototype.done = function() {
  var self = this
  self.race.constructor.objects.filter({pk:self.race.pk})
      .update({ended_on:+new Date, won_by:self.finished.length ? self.finished[0].user : null})(
      function(err, data) {
        RACES[self.race.pk] = undefined
      })
}

RaceState.prototype.create_outcome = function(user_state) {
  var self = this
    , place = self.finished.map(function(state, idx) { return user_state.user.pk === state.user.pk ? idx : null}).filter(function(x) { return x !== null })[0]

  if(!user_state.is_ghost) {
    place = place === undefined ? 4 : place+1
    user_state.user.outcome_set.create({
      status:(user_state.state === Finished) ? self.finished[0].user.pk === user_state.user.pk ? 'won' : 'lost' : 'quit'
    , place: place
    , ended_on:+new Date
    , race:self.race
    })(function(err, outcome) {
      self.users.splice(self.users.indexOf(user_state), 1)
      console.error(self.users.length + ' left')
      if(self.users.length === 0)
        self.done()
    })
  } else {
    self.users.splice(self.users.indexOf(user_state), 1)
    if(self.users.length === 0)
      self.done()
  }
}

RaceState.prototype.on_disconnect = function(user_state) {
  var self = this
  console.error('setting timeout for disconnecting '+user_state.user.screen_name)
  user_state.timeout = setTimeout(function() {
    self.create_outcome(user_state)
  }, 60000)
}

RaceState.prototype.on_ready = function(user_state) {
  console.error('READY %s', user_state.user.screen_name)
  user_state.state = Ready
  var all_ready = this.users.filter(function(state) { return state.state === NotReady }).length === 0
    , self = this

  // let errybody know this user is ready.
  self.users.map(function(ustate) {
    ustate.socket.emit('challenger_ready', user_state.user.screen_name)
  })

  var quorum  = self.users.length >= self.race.min_players

  // bam, everybody's ready.
  if(all_ready && quorum) {
    self.started = true
    console.error('ERRYBODYS READY')
    var started = +new Date
    self.race.constructor.objects.filter({pk:self.race.pk}).update({started_on:started})(function(err, data) {
      self.users.map(function(state) {
        state.socket.emit('start', self.questions[0].get_user_data(), self.questions.length, started, started+10000)
        state.offset = started
      })
    })
  }
}

RaceState.prototype.state_for_user = function(user) {
  return this.users.filter(function(state) { return state.user.pk === user.pk })[0]
}

RaceState.prototype.on_solution = function(user_state, solution) {
  console.log('------------ solution '+user_state.user.screen_name+' ---------------')


  var now = +new Date
    , offset = now - user_state.offset
    , question = this.questions[user_state.question]
    , check_code = require('./views').check_code
    , self = this

  if(!question)
    return

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

        var place = self.users.slice().sort(function(lhs, rhs) {
          if(lhs.question < rhs.question) return -1
          if(lhs.question > rhs.question) return 1
          return 0 
        }).indexOf(user_state)

        var prob = [0.8, 0.4, 0.2, 0.1][place] || 0
        if(Math.random() < prob) {
          var modifiers = ['no_recursion', 'no_loops', 'no_conditionals']
            , mod = modifiers[~~(modifiers.length * Math.random())]

          if(mod)
            self.users.forEach(function(user) {
              if(user.user.pk !== user_state.user.pk) {
                user.modifiers.push(mod)
                user.socket.emit('modifier', mod, user_state.user.screen_name)
              }
            })
            user_state.socket.emit('sent_modifier', mod)
        }

        var models        = require('./models').models
          , QuestionOrder = models.QuestionOrder
          , Answer        = models.Answer

        if(!self.race.ghost_parent) {
          var answer = Answer.objects.create({
              user            :user_state.user
            , question_order  :
              QuestionOrder.objects.get({
                race    :self.race
              , question:self.questions[user_state.question-1]
              })
            , order           :user_state.question
            , solution        :solution
            , elapsed_ms      :offset
            , ended_on        :now
          })

          answer.on('data', function(ans) { console.log('created answer'); })
          answer.on('error',function(err) { console.log('error: '+err+' '+err.stack, err); })
        }

        if(user_state.question >= self.questions.length) {
          var place = self.finished.push(user_state)
          user_state.state = Finished
          user_state.socket.emit('finished', place, user_state.user.screen_name, self.questions.length)
          self.create_outcome(user_state)
        } else {
          user_state.modifier = user_state.modifiers.shift() || 'normal'
          user_state.socket.emit('correct',  self.questions[user_state.question].get_user_data(), user_state.question, self.questions.length, user_state.user.screen_name, user_state.modifier)
        }
        self.users.forEach(function(ustate) {
          if(ustate.user.pk !== user_state.user.pk) {
            ustate.socket.emit('progress', user_state.user.screen_name, user_state.question, self.questions.length)
          }
        })
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

            console.log(Object.keys(RACES), race.pk)
            if(state) {
              console.error('REUSING OLD RACE', user.pk)
              ready(state, user, socket)
            } else {
              race.racers.all()(function(err, racers) {
                if(err) uhoh('racers error'); else {
                  race.racers.add(user)(function(err) {
                    if(err) uhoh('racers add error'); else {
                      race.questions.all()(function(err, questions) {
                        console.error('CREATED NEW RACE', user.pk)
                        ready(RACES[race.pk] || (RACES[race.pk] = new RaceState(race, questions)))
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

module.exports.RACES = RACES
module.exports.RaceState = RaceState
