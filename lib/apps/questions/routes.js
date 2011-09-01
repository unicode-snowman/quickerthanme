var escaperoute = require('escaperoute')
  , routes      = escaperoute.routes
  , url         = escaperoute.surl
  , views       = require('./views')

module.exports = routes(''
  , url('^add/$',            views.question_add,       'question_add')
  , url('^add/thanks/$',     views.question_thanks,    'question_thanks')
)
