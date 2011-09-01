var escaperoute = require('escaperoute')
  , routes      = escaperoute.routes
  , url         = escaperoute.surl
  , views       = require('./views')

module.exports = routes(''
  , url('^/favicon.ico$',               views[404],               '404')
  , url('^/media/(.*)',                 views.media,              'media')
  , url('^/rules/$',                    views.rules,              'rules')
  , url('^/about/$',                    views.about,              'about')
  , url('^/$',                          views.home,               'home')
  , url('^/races/',                     require('./apps/races/routes'))
  , url('^/questions/',                 require('./apps/questions/routes'))
  , url('^',                            require('./apps/users/routes'))
)
