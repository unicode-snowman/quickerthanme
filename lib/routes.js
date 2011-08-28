var escaperoute = require('escaperoute')
  , routes      = escaperoute.routes
  , url         = escaperoute.surl
  , views       = require('./views')

module.exports = routes(''
  , url('^/favicon.ico$',     views[404],       '404')
  , url('^/media/(.*)',       views.media,      'media')
  , url('^/rules/$',      views.rules,  'rules')
  , url('^/about/$',      views.about,  'about')
  , url('^/dashboard/$',      views.dashboard,  'dashboard')
  , url('^/logout/$',      views.logout,  'logout')
  , url('^/races/$',views.active_races,       'active_races')
  , url('^/races/create/$',views.race_create,       'race_create')
  , url('^/races/([:d:w]+)/$',views.race,       'race')
  , url('^/races/([:d:w]+)/ghost/$',views.race_ghost,       'race_ghost')
  , url('^/races/([:d:w]+)/solution/$',views.potential_solution,       'solution')
  , url('^/races/([:d:w]+)/stats/$',views.race_stats,       'race_stats')
  , url('^/questions/add/$',views.question_add,       'question_add')
  , url('^/questions/add/thanks/$',views.question_thanks,       'question_thanks')
  , url('^/([:w:d:-_]+)+/$',  views.user,       'user')
  , url('^',                  views.home,       'home')
)
