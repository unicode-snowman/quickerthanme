var http = require('http')

module.exports = function(solution, input, output, comparison_type, modifier, callback) {
  body = JSON.stringify({
    'solution': solution,
    'input': input,
    'output': output,
    'comparison_type': comparison_type,
    'modifier': modifier
  })

  var request = http.request({
    host: 'localhost',
    port: '8080',
    method: 'POST',
    path: '/',
    headers: {
      'Content-Type': 'application/json'
    }
  }, function(res) {
    var output = ''
    res.on('data', function(chunk) {
      output += chunk
    })
    res.on('end', function() {
      return callback(res.statusCode == 200)
    })
  })

  request.write(body)
  request.end()
}

