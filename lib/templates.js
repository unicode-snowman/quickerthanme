var plate = require('plate')
  , Loader = require('plate/lib/plugins/loaders/filesystem').Loader
  , path = require('path')

var plugin;

plugin = new Loader([
    path.resolve(path.join(__dirname, '../templates'))
]).getPlugin()

plate.Template.Meta.registerPlugin('loader', plugin)

module.exports = function(tpl, ctxt, req, resp, headers) {
  headers = headers || {'Content-Type':'text/html'}
  plugin(tpl, function(err, template) {
    if(err) {
      resp.writeHead(500, headers)
      resp.end('<pre>'+err+'</pre>')
    } else {
      template.render(ctxt, function(err, data) {
        if(err) {
          resp.writeHead(500, headers)
          resp.end('<pre>'+err+'</pre>')
        } else {
          resp.writeHead(200, headers)
          resp.end(data)
        }
      })
    }
  })
} 
