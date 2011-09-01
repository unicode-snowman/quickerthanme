var app = require('./config/app')
  , nko = require('nko')('UO1b95S1RWINAw2i')
  , spawn = require('child_process').spawn
  , worker_path = require('path').join(__dirname, 'worker.js')
  , env = process.env.NODE_ENV || 'local'
  , PORT = require('./settings')[env].PORT

var create_validator_server = function(port) {
  var child_env = Object.create(process.env)
  child_env.PORT = port

  var server = spawn('node', [worker_path], {
      cwd:process.cwd()
    , env:child_env
  })

  console.error('STARTING CHILD SERVER')

  server.stdout.on('data', function(data) {
    process.stdout.write('CHILD[out] - '+data)
  })

  server.stderr.on('data', function(data) {
    process.stderr.write('CHILD[err] - '+data)
  })

  server.on('exit', function(code) {
    if(code === 0)
    setTimeout(function() {
      create_validator_server(port)
    }, 0)
  })
}

app.listen(PORT, function() {
  console.log('Ready');

  if(false)
    create_validator_server(8080)
  // if run as root, downgrade to the owner of this file
  if (process.getuid() === 0)
    require('fs').stat(__filename, function(err, stats) {
      if (err) return console.log(err)
      process.setuid(stats.uid);
    });
});
