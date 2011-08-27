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

exports.home = maybelogin(function(req, resp) {
  render('home.html', {}, req, resp)
})

exports.user = maybelogin(function(req, resp, screen_name) {
  User.objects.get({screen_name:screen_name}).on('data', function(user) {
    render('user.html', {target_user:user}, req, resp)
  }).on('error', function() {
    render('404.html', {}, req, resp, 404)
  })
})

exports.dashboard = login(function(req, resp) {
  render('dashboard.html', {}, req, resp)
})

exports.race = login(get_race_or_404(function(req, resp, race) {
  render('race.html', {
    'race': race
  }, req, resp)
}))

exports.race_question = login(get_race_or_404(function(req, resp, race, question_id) {
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
  //console.log(request.method)
  render('question_add.html', {}, req, resp)
})

exports.question_thanks = login(function(req, resp) {
  render('question_thanks.html', {}, req, resp)
})

if(DEBUG)
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
