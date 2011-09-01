var paperboy      = require('paperboy')

var MEDIA_DIR     = require('path').join(__dirname, '../media')

var functional    = require('../utils/functional')
  , attr          = functional.attr
  , invoke        = functional.invoke

var websocket     = require('./websocket')
  , RACES         = websocket.RACES

var httpcycle       = require('../utils/httpcycle')
  , render          = httpcycle.render
  , redirect        = httpcycle.redirect
  , reverse         = httpcycle.reverse

var render          = require('./templates')
  , wrappers        = require('../utils/wrappers')
  , login           = wrappers.require_login
  , maybelogin      = wrappers.decorate_auth
  , get_race_or_404 = wrappers.require_race

exports.home  = maybelogin(render.curry('home.html', {RACES:RACES}))
exports.rules = maybelogin(render.curry('rules.html', {}))
exports.about = maybelogin(render.curry('about.html', {}))
exports.media = paperboy.deliver.curry(MEDIA_DIR)
exports['404'] = render.curry('404.html', {}).rbind({}, 404)
