var ormnomnom   = require('ormnomnom')
  , models      = ormnomnom.models
  , functional  = require('../../utils/functional')

module.exports =
models.namespace('quickerthanme', function(ns) {
  var User          = ns.create('User')
    , Race          = ns.create('Race')
    , Question      = ns.create('Question')
    , QuestionOrder = ns.create('QuestionOrder')
    , Answer        = ns.create('Answer')
    , Session       = ns.create('Session')
    , Outcome       = ns.create('Outcome')

  var models = 
  [ ['./user',            User]
  , ['./question',        Question]
  , ['./question_order',  QuestionOrder]
  , ['./answer',          Answer]
  , ['./outcome',         Outcome]
  , ['./race',            Race]
  , ['./session',         Session] ]
  
  
  models.map(function(pair) {
    var file  = pair[0]
      , model = pair[1]
    require(file)(model, ns.models)
  })

})
