var escaperoute = require('escaperoute')
  , routes      = escaperoute.routes
  , url         = escaperoute.surl
  , views       = require('./views')

module.exports = routes(''
  , url('^$',                    views.active_races,       'active_races')
  , url('^create/$',             views.race_create,        'race_create')
  , url('^([:d:w]+)/$',          views.race_detail,        'race')
  , url('^([:d:w]+)/ghost/$',    views.race_ghost,         'race_ghost')
  , url('^([:d:w]+)/solution/$', views.potential_solution, 'solution')
  , url('^([:d:w]+)/stats/$',    views.race_stats,         'race_stats')
)
