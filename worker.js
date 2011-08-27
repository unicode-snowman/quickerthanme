var burrito         = require('burrito')
  , connect         = require('connect')
  , spawn           = require('child_process').spawn
  , MAX_LIFE        = process.env.MAX_LIFE || 10000
  , modifiers       = require('./lib/modifiers')
  , comparisons     = require('./lib/comparisons') 

// expects!
//  - input       -- the input value to pass to the proposed solution
//  - solution    -- the proposed solution.
//  - comparison  -- what function to use to compare the result to the expected result one of [strict, float, set]
//  - expected    -- the expected value (as a JSON encoded string)
//  - modifier    -- the current modifier for the proposed solution one of [no_recursion, no_loops, no_conditionals, stmt_limit, normal] 
var app = connect.createServer(
    connect.bodyParser()
  , function(req, resp) {
    var child     = spawn('node', ['validator.js'])
      , responded = false
    try {
      child.stdin.write(
        JSON.stringify(
          {input:req.body.input, solution:modifiers[req.body.modifier](req.body.solution)}
        )
      )
    } catch(err) {
      responded = true
      resp.writeHead(400, {'Content-Type':'text/plain'})
      resp.end('bad')
      return false;
    }
    child.stdout.on('data', function(data) {
      data = data.toString('utf8')
      try {
        if(comparisons[req.body.comparison](JSON.parse(req.body.expected), JSON.parse(data))) {
          responded = true
          resp.writeHead(200, {'Content-Type':'text/plain'})
          resp.end('okay')
        } else {
          responded = true
          resp.writeHead(400, {'Content-Type':'text/plain'})
          resp.end('bad')
        }
      } catch(err) {
        responded = true
        resp.writeHead(400, {'Content-Type':'text/plain'})
        resp.end('bad')
      }
    })
    setTimeout(function() {
      if(!responded) {
        responded = true
        resp.writeHead(400, {'Content-Type':'text/plain'})
        resp.end('bad')
        child.kill()
      } 
    }, MAX_LIFE)
  }
)

app.listen(process.env.PORT)
