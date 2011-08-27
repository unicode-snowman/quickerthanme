;(function() {
  var Racer = function(screen_name, is_me) {
    this.screen_name = screen_name
    this.is_me = is_me
  }

  var Race = function(id) {
    this.id = id
    this.racers = []
    this.placed = []
  }

  Race.prototype.add_racer = function(racer) {
    this.racers.push(racer)
  }

})()
