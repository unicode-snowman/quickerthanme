var escaperoute = require('escaperoute')
  , routes      = escaperoute.routes
  , url         = escaperoute.surl
  , views       = require('./views')

module.exports = routes(''
  , url('^/favicon.ico$',     views[404],       '404')
  , url('^/media/(.*)',       views.media,      'media')
  , url('^/dashboard/$',      views.dashboard,  'dashboard')
  , url('^/races/([:d:w]+)/$',views.race,       'race')
  , url('^/races/([:d:w]+)/question/([:d]+)/$', views.race_question, 'race_question')
  , url('^/races/([:d:w]+)/stats/$',views.race_stats,       'race_stats')
  , url('^/questions/add/$',views.question_add,       'question_add')
  , url('^/questions/add/thanks/$',views.question_thanks,       'question_thanks')
  , url('^/([:w:d:-_]+)+/$',  views.user,       'user')
  , url('^',                  views.home,       'home')
)
