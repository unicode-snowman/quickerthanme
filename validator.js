var vm = require('vm')

process.stdin.on('data', function(data) {
  data = data.toString('utf8')
  var packet  = JSON.parse(data)
    , input   = packet.input
    , solution= packet.solution

  var exp = {}
  vm.runInNewContext('exp.___x = '+solution, {'input':JSON.parse(input), 'exp':exp}, 'test')
  var result = exp.___x
  result = JSON.stringify(result, input)

  // give this bitch a drain event. bitches love drain events.
  if(result !== undefined) {
    if(!process.stdout.write(result)) 
      process.stdout.on('drain', process.exit.bind(process))
  } else {
    process.stderr.write('got undefined from '+data+', y\'all screwed up')
  }
})

process.stdin.resume()
