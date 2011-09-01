var httpcycle       = require('../../../utils/httpcycle')
  , render          = httpcycle.render
  , redirect        = httpcycle.redirect
  , reverse         = httpcycle.reverse

var ormnomnom       = require('ormnomnom')

var websocket       = require('../../websocket')
  , RACES           = websocket.RACES
  , RaceState       = websocket.RaceState

var models          = require('../../models')
  , User            = models.models.User
  , Race            = models.models.Race
  , Question        = models.models.Question
  , QuestionOrder   = models.models.QuestionOrder

var wrappers        = require('../../../utils/wrappers')
  , login           = wrappers.require_login
  , maybelogin      = wrappers.decorate_auth
  , get_race_or_404 = wrappers.require_race

var functional      = require('../../../utils/functional')
  , attr            = functional.attr
  , invoke          = functional.invoke

exports.active_races = maybelogin(function(req, resp) {
  var qs = Race.objects.filter({'started_on__gt': 1, 'ended_on__lte': 1}).order_by('-started_on')
    , ctxt = {}
    , rendered = render.bind({}, 'active_races.html', ctxt, req, resp)

  qs(function(err, races) {
    ctxt.races = races || []
    rendered()
  })
})

exports.race_create = login(function(req, resp) {
  var errors = []
    , min_players = 1

  if(req.method !== 'POST') {
    return render('race_create.html', {
      'errors': errors
    }, req, resp)
  }

  if(!req.body.type || Race.TYPE.indexOf(req.body.type) === -1) {
    errors.push("Race type is required or invalid.")
  }

  if(req.body.type == 'multiplayer') {
    min_players = parseInt(req.body.min_players, 10)
    isNaN(req.body.min_players) &&
      errors.push("Minimum players is required.")

    (min_players > 4 || min_players < 2) &&
      errors.push("You must pick a minimum number of players between 2-4 (inclusive).")
  }

  if(errors.length) {
    return render('race_create.html', {
      'errors': errors
    }, req, resp)
  }

  var race = Race.objects.create({
    "started_by"    : req.user
  , "type"          : req.body.type
  , "min_players"   : min_players
  })
  
  race.on('data', function(race) {
    var query = "SELECT id FROM quickerthanme_question ORDER BY RANDOM() LIMIT 5"
    ormnomnom.sql(query, [], function(err, rows) {
      if(err) return redirect(resp, '/')
      var i = 0
      Question.objects.filter({pk__in: rows.map(attr('id'))}).each(function(question) {
        QuestionOrder.objects.create({
            race      :race
          , question  :question
          , order     :++i
        })
      })
    })
    return redirect(resp, race.get_absolute_url())
  })
  
  race.on('error', function(err) {
    errors.push("Failed to create new race.")
    render('race_create.html', {
      'errors': errors
    }, req, resp)
  })
})

exports.race_detail = login(get_race_or_404(function(req, resp, race) {
  var user        = req.user
    , race_state  = RACES[race.pk]
    , user_state  = race_state ? race_state.state_for_user(user) : null

  if(race.ended_on > 1) {
    return redirect(resp, race.get_absolute_url() + 'stats/')
  }

  if(race.started_on > 1 || (race_state && (race_state.users.length >= 4 || race_state.started))) {
    if(race_state === undefined) {
      // Fake a full-up game. This can happen if someone hits a race link right
      // after a restart.
      race_state = new RaceState(race, [])
      race_state.users = [1, 2, 3, 4]
    }
    return render('race_full.html', {
      'race':race
    , 'reason':race_state.users.length >= 4 ? 'full' : 'started'
    }, req, resp)
  }

  render('race.html', {
    'race'              : race
  , 'racers'            : function(ready) { race.racers.all()(ready) }
  , 'question_template' : function(ready) { render.get_template('question_detail.html', function(err, tpl) {
      if(err) ready(err); else {
        ready(null, tpl.raw)
      }
    })}
  }, req, resp)
}))

exports.race_ghost = login(get_race_or_404(function(req, resp, race) {
  if(race.ghost_parent) {
    // can't ghost a ghost, dawg
    return redirect(resp, '/')
  }

  var ghost_race = Race.objects.create({
    "started_by"    : req.user
  , "ghost_parent"  : race.pk
  , "type"          : race.type
  , "min_players"   : race.min_players
  }) 
  ghost_race.on('error', redirect.bind({}, resp, '/'))

  ghost_race.on('data', function(ghost_race) {
    Question.objects.filter({questionorder_set__race__pk:race.pk})(function(err, questions) {
      if(err || !questions.length) return redirect(resp, '/')
     
      User.objects.filter({participated_in__pk:race.pk})(function(err, racers) {
        if(err) return redirect(resp, '/')

        var race_state = RACES[ghost_race.pk] = new RaceState(ghost_race, questions, true)
          , ready      = function(err) {
              if(err) {
                RACES[ghost_race.pk] = null
                return redirect(resp, '/')
              }
              // everything's okay, send us off to the race track.
              return redirect(resp, ghost_race.get_absolute_url())
            };

        var idx = 0
          , error
          , len = Math.min(racers.length, 3)
        for(var i = 0; i < len; ++i)
          race_state.add_ghost(racers[i], function(err, data) {
            error = err || error  
            ++idx
            if(idx === len) {
              ready(error)
            }
          })
      })
    })
  })
}))

exports.potential_solution = login(get_race_or_404(function(req, resp, race) {
  if(req.method !== 'POST')
    return redirect(resp, '/')

  var solution    = req.body.answer
    , question    = req.body.question
    , user        = req.user
    , race_state  = RACES[race.pk]
    , user_state  = race_state ? race_state.state_for_user(user) : null

  if(!race_state || !user_state) {
    resp.writeHead(404, {'Content-Type':'text/plain'})
    resp.end('no.')
  } else {
    race_state.on_solution(user_state, solution)
    resp.writeHead(200, {'Content-Type':'text/plain'})
    resp.end('okay.')
  }
}))

exports.race_stats = login(get_race_or_404(function(req, resp, race) {
  render('race_stats.html', {
    'race': race
  }, req, resp)
}))
