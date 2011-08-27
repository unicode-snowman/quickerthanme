var ormnomnom = require('ormnomnom')
  , models    = ormnomnom.models

module.exports =
models.namespace('quickerthanme', function(ns) {
  var User = ns.create('User')

  User.schema({
      access_token      : models.CharField
    , gravatar_id       : models.CharField
    , company           : models.CharField
    , name              : models.CharField
    , screen_name       : models.CharField
    , email             : models.CharField 
  })

  User.prototype.get_absolute_url = function() {
    var routes = require('./routes')
    return routes.reverse('user', [this.screen_name])
  }

  User.from_oauth = function(access, oauth, ready) {
    User.objects.get({
      access_token:access
    })(function(err, data) {
      if(err || !data) {
        User.objects.create({
            access_token  : ''+access
          , gravatar_id   : ''+oauth.gravatar_id
          , company       : ''+oauth.company
          , name          : ''+oauth.name
          , screen_name   : ''+oauth.login
          , email         : ''+oauth.email
        })(ready)
      } else {
        ready(null, data)
      }
    })
  }

})
