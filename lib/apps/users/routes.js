var escaperoute = require('escaperoute')
  , routes      = escaperoute.routes
  , url         = escaperoute.surl
  , views       = require('./views')

module.exports = routes(''
  , url('^/dashboard/$',                views.dashboard,          'dashboard')
  , url('^/logout/$',                   views.logout,             'logout')
  , url('^/([:w:d:-_]+)+/$',            views.user_detail,        'user')
)
