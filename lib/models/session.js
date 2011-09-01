var ormnomnom   = require('ormnomnom')
  , models      = ormnomnom.models
  , functional  = require('../../utils/functional')

module.exports = function(Session, friends) {
  Session.schema({
    'sid'             : models.CharField
  , 'session'         : models.TextField
  })
}
