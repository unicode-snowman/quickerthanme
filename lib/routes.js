var escaperoute = require('escaperoute')
  , routes      = escaperoute.routes
  , url         = escaperoute.surl
  , views       = require('./views')

module.exports = routes(''
  , url('^/favicon.ico$',     views[404],       '404')
  , url('^/media/(.*)',       views.media,      'media')
  , url('^/dashboard/$',      views.dashboard,  'dashboard')
  , url('^/races/([:d:w]+)/$',views.race,       'race')
  , url('^/([:w:d:-_]+)+/$',  views.user,       'user')
  , url('^',                  views.home,       'home')
)
