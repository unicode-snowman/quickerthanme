var render = require('./templates')

exports.home = function(req, resp) {
  render('home.html', {}, req, resp)
}

exports.user = function(req, resp, screen_name) {
  render('user.html', {}, req, resp)
}

exports.race = function(req, resp, race) {
  render('race.html', {}, req, resp)
}

exports['404'] = function(req, resp) {
  resp.writeHead(404, {'Content-Type':'text/html'})
  resp.end('<h1>Not found</h1><pre>'+req.url+'</pre>')
}
