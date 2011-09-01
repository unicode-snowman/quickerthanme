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

exports.question_add = login(function(req, resp) {
  var errors = []
  var context = {
      'errors'  : errors
    , 'form'    : req.body
  }

  if(req.method === 'POST') {
    if(!req.body.description || !req.body.reference || !req.body.input || !req.body.output || !req.body.comparison_type) {
      errors.push("All fields are required.")
    }

    if(!(req.body.comparison_type in Question.CHOICES)) {
      errors.push("Invalid 'comparison_type' chosen.")
    }

    try {
      JSON.parse(req.body.input)
    } catch(err) {
      errors.push("The 'input' field is not valid JSON.")
    }

    try {
      JSON.parse(req.body.output)
    } catch(err) {
      errors.push("The 'output' field is not valid JSON.")
    }

    if(! errors.length) {
      check_solution(req.body.reference, req.body.input, req.body.output, req.body.comparison_type, 'normal', function(valid) {
        if(valid === true) {
          Question.objects.create({
            'created_by': req.user
          , 'input': req.body.input
          , 'output': req.body.output
          , 'comparison_type': req.body.comparison_type
          , 'created_on': +new Date
          , 'description': req.body.description
          , 'reference': req.body.reference
          }).on('data', function(question) {
            return redirect(resp, reverse('question_thanks'))
          }).on('error', function(err) {
            errors.push("Failed to create new question.")
            render('question_add.html', context, req, resp)
          })
        } else {
          errors.push('Failed to validate');
          render('question_add.html', context, req, resp)
        }
      })
    } else {
      Object.keys(req.body || {}).forEach(function(key) { context[key] = req.body[key] })
      render('question_add.html', context, req, resp)
    }
    return;
  }
  Object.keys(req.body || {}).forEach(function(key) { context[key] = req.body[key] })
  render('question_add.html', context, req, resp)
})

exports.question_thanks = login(render.bind({}, 'question_thanks.html', {}))

