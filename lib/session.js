var Session   = require('./models').models.Session
  , Store     = require('connect').session.Store
  , SessionStore

module.exports = SessionStore = function() {

}

SessionStore.prototype.__proto__ = Store.prototype

SessionStore.prototype.get = function(sid, ready) {
  Session.objects.get({sid:sid})
    .on('data',   function(session) { ready(null, JSON.parse(session.session)) })
    .on('error',  function(err)     { if(err instanceof Session.DoesNotExist) ready(null, null); else ready(err) })
}

SessionStore.prototype.set = function(sid, session, ready) {
  var session_data = JSON.stringify(session)
  Session.objects.get({sid:sid})
    .on('data',   function(session) { session.session = session_data; session.save()(ready) })
    .on('error',  function(err)     { Session.objects.create({sid:sid, session:session_data})(ready) })
}

SessionStore.prototype.destroy = function(sid, ready) {
  Session.objects.filter({sid:sid}).delete()(function(err, data) {
    ready(err, data)
  })
}
