var render    = require('./templates')
  , paperboy  = require('paperboy') 
  , MEDIA_DIR = require('path').join(__dirname, '../media')
  , DEBUG     = process.env.NODE_ENV !== 'production'

exports.home = function(req, resp) {
  render('home.html', {}, req, resp)
}

exports.user = function(req, resp, screen_name) {
  render('user.html', {}, req, resp)
}

exports.race = function(req, resp, race) {
  render('race.html', {}, req, resp)
}

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
