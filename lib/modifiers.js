var burrito = require('burrito')

var DoesntValidate = function() {}

// no function statements 
var no_recursion = exports.no_recursion = function(src) {
  return burrito(src, function(node) {
    if(node.name === 'function')
      throw new DoesntValidate
  })
}
no_recursion.description = "You can't define any functions!"
no_recursion.icon        = "img/icons/no_recursion.png"


// no loops -- can't use for / while / do
var no_loops = exports.no_loops = function(src) {
  return burrito(src, function(node) {
    if(['for', 'while', 'do'].indexOf(node.name) !== -1)
      throw new DoesntValidate
  })
}
no_loops.description    = "You can't use for or while loops!"
no_loops.icon           = "img/icons/no_loops.png"

// no conditionals, dude. just truthiness
var no_conditionals = exports.no_conditionals = function(src) {
  return burrito(src, function(node) {
    if(['if'].indexOf(node.name) !== -1)
      throw new DoesntValidate
  })
}
no_conditionals.description     = "You can't use if or else statements!"
no_conditionals.icon            = "img/icons/no_conditionals.png"

// maybe like two statements? three?
var stmt_limit = exports.stmt_limit = function(src) {
  var statements = 0
  return burrito(src, function(node) {
    if(['stmt'].indexOf(node.name) !== -1)
      ++statements
    if(statements > 1)
      throw new DoesntValidate
  })
}
stmt_limit.description      = "You can only use two statements. GOLF TIME"
stmt_limit.icon             = "img/icons/stmt_limit.png"

var normal = exports.normal = function(src) {
  return burrito(src, function(node) { })
}
normal.description        = "YOU ARE NORMAL"
normal.icon               = "img/icons/icon.png"
