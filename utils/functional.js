exports.attr = function(name, default_value) {
  return function(obj) {
    return obj[name] === undefined ? default_value : obj[name]
  }
}

exports.invoke = function(name) {
  var args = [].slice.call(arguments, 1)
  return function(obj) {
    return obj[name].apply(obj, args.concat([].slice.call(arguments)))
  }
}

Function.prototype.rbind = function(to) {
  var args = [].slice.call(arguments, 1)
    , fn = this
  return function() {
    return fn.apply(this, [].slice.call(arguments).concat(args))
  }
}

Function.prototype.curry = function() {
  var args  = [].slice.call(arguments)
    , fn    = this
  return function() {
    return fn.apply(this, args.concat([].slice.call(arguments))) 
  }
}
