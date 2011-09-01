var httpcycle       = require('../../../utils/httpcycle')
  , render          = httpcycle.render
  , redirect        = httpcycle.redirect
  , reverse         = httpcycle.reverse

var models          = require('../../models')
  , User            = models.models.User

var wrappers        = require('../../../utils/wrappers')
  , login           = wrappers.require_login
  , maybelogin      = wrappers.decorate_auth

exports.dashboard = login(function(req, resp) {
  render('dashboard.html', {
    target_user: req.user
  }, req, resp)
})

exports.user_detail = maybelogin(function(req, resp, screen_name) {
  User.objects.get({screen_name:screen_name})(function(err, user) {
    if(err instanceof User.DoesNotExist) {
      render('404.html', {}, req, resp, 404)
    } else {
      render('user.html', {target_user:user}, req, resp)
    }
  })
})

exports.logout = function(req, resp) {
  req.session.destroy(function() {
    return redirect(resp, reverse('home'))
  })
}
