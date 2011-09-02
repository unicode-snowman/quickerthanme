var connect         = require('connect')
  , routes          = require('../lib/routes')
  , everyauth       = require('everyauth')
  , ormnomnom       = require('ormnomnom')
  , io              = require('socket.io')
  , Store           = require('../lib/session')
  , env             = process.env.NODE_ENV || 'local'
  , SESSION_SECRET  = require('../settings')[env].SESSION_SECRET

require('./auth')(everyauth)
require('./db')(ormnomnom)

module.exports = connect.createServer(
      connect.bodyParser()
    , function(req, resp, next) { console.log(req.method + ' - ' + req.url); next() }
    , connect.cookieParser()
    , connect.session({secret: SESSION_SECRET, store:new Store})
    , everyauth.middleware()
    , routes.root(function(req, resp, err) {
        resp.writeHead(404, {'Content-Type':'text/html'})
        resp.end('<h1>Not found</h1><pre>'+err.stack+'</pre>')
      })
)

var io = io.listen(module.exports)

io.set('transports', ['xhr-polling', 'forever-iframe'])

io.sockets.on('connection', function(client, req, res) {
  require('../lib/websocket').apply(this, arguments)
})
