
exports.decorate_auth = function(fn) {
  var User = require('../lib/models').models.User

  return function(req, res) {
    var args = [].slice.call(arguments)
      , self = this
    if(req.user) {
      fn.apply(self, args)
    } else if(req.session.auth && req.session.auth.github && req.session.auth.github.accessToken) {
      User.objects.get({access_token:req.session.auth.github.accessToken})(function(err, data) {
        if(!err)
          req.user = data
        fn.apply(self, args) 
      }) 
    } else {
      fn.apply(self, args)
    }
  }
}

exports.require_login = function(fn) {
  var User = require('../lib/models').models.User

  return exports.decorate_auth(function(req, res) {
    var redirect = function() {
      res.writeHead(302, {'Location':'/auth/github/'})
      res.end('')
    };

    var args = [].slice.call(arguments)
      , self = this
 
    if(req.user)
      fn.apply(self, args)
    else
      redirect()
  })
}
