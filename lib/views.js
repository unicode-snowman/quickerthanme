var render    = require('./templates')
  , paperboy  = require('paperboy')
  , MEDIA_DIR = require('path').join(__dirname, '../media')
  , DEBUG     = process.env.NODE_ENV !== 'production'
  , wrappers  = require('../utils/wrappers')
  , login     = wrappers.require_login
  , maybelogin= wrappers.decorate_auth
  , get_race_or_404 = wrappers.require_race
  , models    = require('./models')
  , User      = models.models.User
  , Question  = models.models.Question
  , Answer    = models.models.Answer
  , Race = models.models.Race
  , Outcome   = models.models.Outcome
  , conn = require('ormnomnom').connection.Connection

var reverse = function(what, args) {
  var routes = require('./routes')
  return routes.reverse(what, args || [])
}

var redirect = function(resp, location) {
  resp.writeHead(302, {'Location': location})
  resp.end()
}

exports.home = maybelogin(function(req, resp) {
  if(req.user) {
    redirect(resp, reverse('dashboard'))
  } else render('home.html', {}, req, resp)
})

exports.logout = function(req, resp) {
  if(req.session) {
    req.session.destroy(function(err) {
      console.error("Logout failed: ", err, err.stack)
    })
    return redirect(resp, reverse('home'))
  }
}

exports.user = maybelogin(function(req, resp, screen_name) {
  User.objects.get({screen_name:screen_name}).on('data', function(user) {
    render('user.html', {target_user:user}, req, resp)
  }).on('error', function() {
    render('404.html', {}, req, resp, 404)
  })
})

exports.dashboard = login(function(req, resp) {
  var recent_races = req.user.participated_in.filter({ended_on__gt: 1}).limit(0, 5)
  recent_races.order_by = ['-ended_on']
  render('dashboard.html', {
    target_user: req.user,
    recent_races: recent_races
  }, req, resp)
})

exports.race_create = login(function(req, resp) {
  var errors = []
  var min_players = 1

  if(req.method === 'POST') {
    if(!req.body.type || Race.TYPE.indexOf(req.body.type) === -1) {
      errors.push("Race type is required or invalid.")
    }

    if(req.body.type == 'multiplayer') {
      if(!req.body.min_players) {
        errors.push("Minimum players is required.")
      }
      else if(parseInt(req.body.min_players, 10) < 1 || parseInt(req.body.min_players, 10) > 4) {
        errors.push("You must pick a minimum number of players between 1-4 (inclusive).")
      }
      else {
        min_players = parseInt(req.body.min_players, 10)
      }
    }

    if(! errors.length) {
      Race.objects.create({
        "started_by"    : req.user
      , "created_on"    : +new Date
      , "started_on"    : 1
      , "ended_on"      : 1
      , "type"          : req.body.type
      , "min_players"   : min_players
      }).on('data', function(race) {
        // The Django way. Which doesn't work.
        // Question.objects.order_by('?').on('data', function(rows) {
        //   race.question_set.add(rows[0])
        // })
        var connection = conn.get_connection('default')
        var query = "SELECT id FROM quickerthanme_question ORDER BY RANDOM() LIMIT 10"
        connection.client(function(client) {
          client.execute(query, [], {}, {}, function(err, rowData) {
            var i = 0
            Question.objects.filter({pk__in: rowData.rows.map(function(obj) { return obj.id })}).on('data', function(question) {
              race.questions.create({
                  question: question
                , order: i++
              })
            })
          })
        })
        return redirect(resp, race.get_absolute_url())
      }).on('error', function(err) {
        console.log("Race save failed: ", err, err.stack)
        errors.push("Failed to create new race.")
        render('race_create.html', {
          'errors': errors
        }, req, resp)
      })
    }
    else {
      render('race_create.html', {
        'errors': errors
      }, req, resp)
    }
  }
  else {
    render('race_create.html', {
      'errors': errors
    }, req, resp)
  }
})

exports.race = login(get_race_or_404(function(req, resp, race) {
  if(race.ended_on > 1) {
    return redirect(resp, race.get_absolute_url() + 'stats/')
  }

  if(req.method === 'POST') {
    race.started_on = +new Date
    race.save()
    return redirect(resp, race.get_absolute_url() + 'question/0/')
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

exports.race_question = login(get_race_or_404(function(req, resp, race, question_order) {
  render('race_question.html', {
    'race': race
  }, req, resp)
}))

exports.race_stats = login(get_race_or_404(function(req, resp, race) {
  render('race_stats.html', {
    'race': race
  }, req, resp)
}))

exports.question_add = login(function(req, resp) {
  var errors = []
  var context = {
    'errors': errors,
  }

  if(req.method === 'POST') {
    if(!req.body.description || !req.body.reference || !req.body.input || !req.body.output || !req.body.comparison_type) {
      errors.push("All fields are required.")
    }

    if(! (req.body.comparison_type in Question.CHOICES)) {
      errors.push("Invalid 'comparison_type' chosen.")
    }

    if(! errors.length) {
      // FIXME: Will need to validate.
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
        console.log("Question save failed: ", err, err.stack)
        errors.push("Failed to create new question.")
        render('question_add.html', context, req, resp)
      })
    } else {
      render('question_add.html', context, req, resp)
    }
    return;
  }
  Object.keys(req.body || {}).forEach(function(key) { context[key] = req.body[key] })
  render('question_add.html', context, req, resp)
})

exports.question_thanks = login(function(req, resp) {
  render('question_thanks.html', {}, req, resp)
})

if(true)
  exports.media = function(req, resp, path) {
    paperboy.deliver(MEDIA_DIR, req, resp)
  }
else
  exports.media = function(req, resp, path) {
    exports['404'](req, resp)
  }


exports['404'] = function(req, resp) {
  render('404.html', {}, req, resp, 404)
}
