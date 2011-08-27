var render    = require('./templates')
  , paperboy  = require('paperboy') 
  , MEDIA_DIR = require('path').join(__dirname, '../media')
  , DEBUG     = process.env.NODE_ENV !== 'production'
  , wrappers  = require('../utils/wrappers')
  , login     = wrappers.require_login
  , maybelogin= wrappers.decorate_auth
  , models    = require('./models')
  , User      = models.models.User

exports.home = maybelogin(function(req, resp) {
  render('home.html', {}, req, resp)
})

exports.user = maybelogin(function(req, resp, screen_name) {
  User.objects.get({screen_name:screen_name}).on('data', function(user) {
    render('user.html', {target_user:user}, req, resp)
  }).on('error', function() {
    resp.writeHead(404, {'Content-Type':'text/html'})
    resp.end('<h1>'+screen_name+' ain&rsquo;t registered dawg</h1>')
  })
})

exports.dashboard = login(function(req, resp, race) {
  render('dashboard.html', {}, req, resp)
})

exports.race = login(function(req, resp, race) {
  render('race.html', {}, req, resp)
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
  resp.writeHead(404, {'Content-Type':'text/html'})
  resp.end('<h1>Not found</h1><pre>'+req.url+'</pre>')
}
