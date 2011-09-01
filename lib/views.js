var paperboy      = require('paperboy')
  , http          = require('http')
  , ormnomnom     = require('ormnomnom')

var MEDIA_DIR     = require('path').join(__dirname, '../media')
  , DEBUG         = process.env.NODE_ENV !== 'production'

var models        = require('./models')
  , User          = models.models.User
  , Question      = models.models.Question
  , QuestionOrder = models.models.QuestionOrder
  , Answer        = models.models.Answer
  , Race          = models.models.Race
  , Outcome       = models.models.Outcome

var functional    = require('../utils/functional')
  , attr          = functional.attr
  , invoke        = functional.invoke

var websocket     = require('./websocket')
  , RACES         = websocket.RACES
  , RaceState     = websocket.RaceState

var render          = require('./templates')
  , wrappers        = require('../utils/wrappers')
  , login           = wrappers.require_login
  , maybelogin      = wrappers.decorate_auth
  , get_race_or_404 = wrappers.require_race

var reverse = function(what, args) {
  var routes = require('./routes')
  return routes.reverse(what, args || [])
}

var redirect = function(resp, location) {
  resp.writeHead(302, {'Location': location})
  resp.end()
}

var check_code = exports.check_code = function(solution, input, output, comparison_type, modifier, callback) {
  body = JSON.stringify({
    'solution': solution,
    'input': input,
    'output': output,
    'comparison_type': comparison_type,
    'modifier': modifier
  })

  var request = http.request({
    host: 'localhost',
    port: '8080',
    method: 'POST',
    path: '/',
    headers: {
      'Content-Type': 'application/json'
    }
  }, function(res) {
    var output = ''
    res.on('data', function(chunk) {
      output += chunk
    })
    res.on('end', function() {
      return callback(res.statusCode == 200)
    })
  })

  request.write(body)
  request.end()
}

exports.home  = maybelogin(render.bind({}, 'home.html', {RACES:RACES}))
exports.rules = maybelogin(render.bind({}, 'rules.html', {}))
exports.about = maybelogin(render.bind({}, 'about.html', {}))
exports.logout = function(req, resp) {
  req.session.destroy(function() {
    return redirect(resp, reverse('home'))
  })
}

exports.user = maybelogin(function(req, resp, screen_name) {
  User.objects.get({screen_name:screen_name})(function(err, user) {
    if(err instanceof User.DoesNotExist) {
      render('404.html', {}, req, resp, 404)
    } else {
      render('user.html', {target_user:user}, req, resp)
    }
  })
})

exports.dashboard = login(function(req, resp) {
  render('dashboard.html', {
    target_user: req.user
  }, req, resp)
})

exports.active_races = maybelogin(function(req, resp) {
  var qs = Race.objects.filter({'started_on__gt': 1, 'ended_on__lte': 1}).order_by('-started_on')
    , ctxt = {}
    , rendered = render.bind({}, 'active_races.html', ctxt, req, resp)

  qs(function(err, races) {
    ctxt.races = races || []
    rendered()
  })
})

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

exports.race = login(get_race_or_404(function(req, resp, race) {
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

exports.race_stats = login(get_race_or_404(function(req, resp, race) {
  render('race_stats.html', {
    'race': race
  }, req, resp)
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

exports.question_add = login(function(req, resp) {
  var errors = []
  var context = {
      'errors'  : errors
    , 'form'    : req.body
  }

  if(req.method === 'POST') {
    if(!req.body.description || !req.body.reference || !req.body.input || !req.body.output || !req.body.comparison_type) {
      errors.push("All fields are required.")
    }

    if(! (req.body.comparison_type in Question.CHOICES)) {
      errors.push("Invalid 'comparison_type' chosen.")
    }

    try {
      JSON.parse(req.body.input)
    }
    catch(err) {
      errors.push("The 'input' field is not valid JSON.")
    }

    try {
      JSON.parse(req.body.output)
    }
    catch(err) {
      errors.push("The 'output' field is not valid JSON.")
    }

    if(! errors.length) {
      check_code(req.body.reference, req.body.input, req.body.output, req.body.comparison_type, 'normal', function(valid) {
        if(valid === true) {
          Question.objects.create({
            'created_by': req.user
          , 'input': req.body.input
          , 'output': req.body.output
          , 'comparison_type': req.body.comparison_type
          , 'created_on': +new Date
          , 'description': req.body.description
          , 'reference': req.body.reference
          }).on('data', function(question) {
            return redirect(resp, reverse('question_thanks'))
          }).on('error', function(err) {
            errors.push("Failed to create new question.")
            render('question_add.html', context, req, resp)
          })
        } else {
          errors.push('Failed to validate');
          render('question_add.html', context, req, resp)
        }
      })
    } else {
      Object.keys(req.body || {}).forEach(function(key) { context[key] = req.body[key] })
      render('question_add.html', context, req, resp)
    }
    return;
  }
  Object.keys(req.body || {}).forEach(function(key) { context[key] = req.body[key] })
  render('question_add.html', context, req, resp)
})

exports.question_thanks = login(render.bind({}, 'question_thanks.html', {}))
exports.media = paperboy.deliver.bind(paperboy, MEDIA_DIR)
exports['404'] = render.bind({}, '404.html', {}).rbind({}, 404)
