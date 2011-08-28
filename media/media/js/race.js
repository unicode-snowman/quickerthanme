;(function(exports) {
  var Racer = function(screen_name, is_me) {
    this.screen_name = screen_name
    this.is_me = is_me
    this.position = 0
  }

  var Race = function(id, user, form) {
    this.form = form
    this.textarea = form.find('[name=answer]')
    this.id = id
    this.user = user
    this.racers = []
    this.placed = []
    this.socket = io.connect()
    var self = this

    this.socket.on('whois', function(ev) {
      console.log('WHOIS', ev)
      self.socket.emit('join', self.id, self.user)
    })

    this.socket.on('progress', function(screen_name, question_no, total) {
      var target = $('#track-'+screen_name)
        , current = ~~((question_no / total)*100)

      target.animate({'bottom':current+'%'})
    }) 

    var asking = false
    this.form.submit(function(ev) {
      ev.preventDefault()

      var val = $('form').find('textarea').val()
        , sliced = val.slice()
      try {
        new Function('input', val)

        console.error('--------- SENDING ------------')
        self.socket.emit('solution', val, +new Date)
        asking = true
      } catch(err) {
        console.log(err)
      }
      console.log(val)
    })


    var desc  = $('#question .description')
      , input = $('#question .input')
      , right = $('#right')
      , wrong = $('#wrong')

    this.socket.on('challenger_ready', function(screen_name) {
      $('#lobby-'+screen_name+' button').text('Ready').addClass('ready')
    })

    this.socket.on('challenger', function(user, quorum) {
      $('body').removeClass('loading')
      // a new user joined the fray.
      console.error('challenger', user, quorum)
      if(!$('#track-'+user.screen_name).length) {
        self.add_racer(new Racer(user.screen_name), user.is_me)
        $('#track').append(
          '<div id="track-'+user.screen_name+'" class="racer gravatar">'+
          '<img src="http://www.gravatar.com/avatar/'+user.gravatar_id+'" />'+
          '</div>'
        )

        $('#lobby').append(
          '<div id="lobby-'+user.screen_name+'" class="lobby">'+
          '<img src="http://www.gravatar.com/avatar/'+user.gravatar_id+'" />'+
          '<button id="'+(user.is_me?'my-button':'')+'">Not ready</button>'+
          '</div>'
        )

        var ready = false
        $('#my-button').click(function(ev) {
          console.error(ready)
          ev.preventDefault()
          if(!ready) {
            ready = true
            $(this).text('Ready').addClass('ready')
            self.socket.emit('ready')
          }
        })
      }
    })

    this.socket.on('start', function(question) {
      console.error('STARTING', question)

      desc.fadeOut('fast', function() {
        desc.text(question.description)
        desc.fadeIn('fast')
      }) 

      var timeout;
      document.addEventListener('keyup', function() {
        setTimeout(function() {
          if(!timeout) {
            console.error('setting timeout')
            timeout = setTimeout(function() {
              console.error('timeout called')
              form.submit()
            }, 1000)
          }
        }, 0)
      }, true)
      document.addEventListener('keydown', function() {
        if(timeout) { clearTimeout(timeout); timeout = null; } 
      }, true)
    })

    this.socket.on('finished', function(place) {
      // trigger confetti!  
    })

    this.socket.on('correct', function(question) {
      console.error('RIGHT', question)
      asking = false
      wrong.hide()
      right.show()
      setTimeout(function() { right.fadeOut('fast') }, 1000) 
      desc.fadeOut('fast', function() {
        desc.text(question.description)
        desc.fadeIn('fast')
      }) 
    })

    this.socket.on('wrong', function() {
      console.error('WRONG')
      asking = false
      wrong.show()
      right.fadeOut('fast') 
    })
  }

  Race.prototype.add_racer = function(racer) {
    this.racers.push(racer)
  }

  exports.Race   = Race
  exports.Racer  = Racer
})(window.QKR = {})
