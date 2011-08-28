var burrito         = require('burrito')
  , connect         = require('connect')
  , spawn           = require('child_process').spawn
  , MAX_LIFE        = process.env.MAX_LIFE || 10000
  , modifiers       = require('./lib/modifiers')
  , comparisons     = require('./lib/comparisons')
  , validator_path  = require('path').join(__dirname, 'validator.js')

// expects!
//  - input       -- the input value to pass to the proposed solution
//  - solution    -- the proposed solution.
//  - comparison  -- what function to use to compare the result to the expected result one of [strict, float, set]
//  - output      -- the expected value (as a JSON encoded string)
//  - modifier    -- the current modifier for the proposed solution one of [no_recursion, no_loops, no_conditionals, stmt_limit, normal]
var app = connect.createServer(
    connect.bodyParser()
  , function(req, resp) {
    console.error('------------- GOT REQ --------------')
    var child     = spawn('node', [validator_path])
      , responded = false

    var errored = function(message) {
      console.error('errored:', message)
      responded = true
      resp.writeHead(400, {'Content-Type':'text/plain'})
      resp.end('bad')
    }

    try {
      child.stdin.end(
        JSON.stringify(
          {input:req.body.input, solution:modifiers[req.body.modifier]('(function() { '+req.body.solution+'; })()')}
        )
      )
      child.stdout.on('data', function(data) {
        try {
          data = data.toString('utf8')
          console.log("Comparing using ", req.body.comparison_type, ": ", JSON.parse(req.body.output), JSON.parse(data))
          if(comparisons[req.body.comparison_type](JSON.parse(req.body.output), JSON.parse(data))) {
            responded = true
            resp.writeHead(200, {'Content-Type':'text/plain'})
            resp.end('okay')
          } else {
            errored('not equal')
          }
        } catch(err) {
          errored(err.stack)
        }
      })

      child.stderr.on('data', function(data) {
        errored(''+data)
      })

      setTimeout(function() {
        if(!responded) {
          errored('died of too long of a life')
          child.kill()
        }
      }, MAX_LIFE)
    } catch(err) {
      errored(err.stack)      
    }
  }
)

app.listen(process.env.PORT || 8080)
