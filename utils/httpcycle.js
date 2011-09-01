exports.render    = require('../lib/templates')
exports.reverse   = function(what, args) {
  return require('../lib/routes').reverse(what, args || [])
} 
exports.redirect  = function(resp, loc) {
  resp.writeHead(302, {'Location':loc})
  resp.end()
}
