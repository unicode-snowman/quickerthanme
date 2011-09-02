module.exports = function(db) {



  var env = process.env.NODE_ENV || 'local'
    , DB = require('../settings')[env].DB

  DB.library = require('pg')

  db.models.configure('default', DB)
}
