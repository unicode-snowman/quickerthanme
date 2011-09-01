var httpcycle       = require('../../../utils/httpcycle')
  , render          = httpcycle.render
  , redirect        = httpcycle.redirect
  , reverse         = httpcycle.reverse

var models          = require('../../models')
  , Question        = models.models.Question

var wrappers        = require('../../../utils/wrappers')
  , login           = wrappers.require_login
  , maybelogin      = wrappers.decorate_auth

var check_solution      = require('../../../utils/solution')
  , functional          = require('../../../utils/functional')


var v, validator = v = function(item, message, fn) {
  return function(body, errors) {
    if(!fn(body[item], body)) {
      errors[item] = errors[item] || []
      errors[item].push(message.replace('%s', item)) 
    }
  }
}

var doesnotthrow = function(fn) {
  return function() {
    try {
      fn.apply(this, arguments)
      return true 
    } catch(err) {
      return false
    }
  }
}

var required = function(x) { return !!x }
  , VALIDATORS = 
  [ v('description',    '%s is required', required)
  , v('reference',      '%s is required', required)
  , v('input',          '%s is required', required)
  , v('output',         '%s is required', required)
  , v('comparison_type','%s is required', required)
  , v('comparison_type','Invalid %s chosen',              function(type) { return type in Question.CHOICES })
  , v('input',          'The %s field is not valid JSON', doesnotthrow(JSON.parse))
  , v('output',         'The %s field is not valid JSON', doesnotthrow(JSON.parse))
  ]

exports.question_add = login(function(req, resp) {
  var errors = {} 
    , context = {
        'errors'  : errors
      , 'form'    : req.body
    }

  if(req.method !== 'POST') {
    return render('question_add.html', context, req, resp)
  }

  VALIDATORS.forEach(function(validator) {
    validator(req.body, errors)
  })


  if(Object.keys(errors).length) {
    return render('question_add.html', context, req, resp)
  }

  check_solution(req.body.reference, req.body.input, req.body.output, req.body.comparison_type, 'normal', function(valid) {
    if(valid === false) {
      errors.all = ['Failed to validate']
      return render('question_add.html', context, req, resp)
    }

    var qs = 
    Question.objects.create({
      'created_by':       req.user
    , 'input':            req.body.input
    , 'output':           req.body.output
    , 'comparison_type':  req.body.comparison_type
    , 'description':      req.body.description
    , 'reference':        req.body.reference
    })
    
    qs.on('data', redirect.curry(resp, reverse('question_thanks')))
    
    qs.on('error', function(err) {
      errors.all = ["Failed to create new question."]
      render('question_add.html', context, req, resp)
    })
  })
})

exports.question_thanks = login(render.curry('question_thanks.html', {}))

