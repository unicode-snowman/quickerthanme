module.exports = function(auth) {
  var KEY, SECRET
  var User = require('../lib/models').models.User
    , env = process.env.NODE_ENV || 'local'
    , keys = require('../settings')[env].AUTH

  auth.github
    .appId(keys.KEY)
    .appSecret(keys.SECRET)
    .findOrCreateUser( function (info, accessToken, type, meta, reqres) {
      var promise = this.Promise()
      User.from_oauth(accessToken, meta, function(err, data) { 
        if(err)
          promise.fail(err)
        else
          promise.fulfill(data)  
      })
      return promise
    })
    .entryPath('/auth/github')
    .callbackPath('/auth/github/callback')
    .redirectPath('/');
}
