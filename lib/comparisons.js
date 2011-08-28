var assert = require('assert')

exports.float = function(lhs, rhs) {
  return parseFloat(lhs).toFixed(6) === parseFloat(rhs).toFixed(6)
}

exports.strict = function(lhs, rhs) {
  assert.deepEqual(lhs, rhs)
  return true
}

exports.set = function(lhs, rhs) {
  if((typeof lhs === 'string' || Array.isArray(lhs)) &&
     (typeof rhs === 'string' || Array.isArray(rhs))) {
    lhs = [].slice.call(lhs)
    rhs = [].slice.call(rhs)
    if(lhs.length !== rhs.length)
      return false
    
    for(var i = 0, len = lhs.length; i < len; ++i) {
      if(rhs.indexOf(lhs[i]) === -1)
        return false
    }
    return true
  } else {
    return false
  } 
}
