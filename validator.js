var vm = require('vm')

process.stdin.on('data', function(data) {
  data = data.toString('utf8')
  var packet  = JSON.parse(data)
    , input   = packet.input
    , solution= packet.solution

  var result = vm.runInNewContext(solution, {'input':JSON.parse(input)}, 'test')
  result = JSON.stringify(result)

  // give this bitch a drain event. bitches love drain events.
  if(!process.stdout.write(result)) {
    process.stdout.on('drain', process.exit.bind(process))
  }
})

process.stdin.resume()
