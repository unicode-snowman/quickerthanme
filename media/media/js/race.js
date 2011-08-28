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
      , make_form = function() {
        var form = $('<form method="POST" action="./solution/"></form>')
        form.append('<textarea name="answer">return input;</textarea>')
        form.append('<input type="submit" value="Submit" />')
        form.submit(function(ev) {
          ev.preventDefault()
          $.post('./solution/', form.serialize())
        })
        form.find('textarea').css({position:'relative', width:'600px', height:'400px'})
        return function(to) {
          to.html('')
          to.append(form)
        }
      }

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
          '<div class="track">'+
          '<div id="track-'+user.screen_name+'" class="racer gravatar">'+
          '<img src="http://www.gravatar.com/avatar/'+user.gravatar_id+'" />'+
          '</div>'+
          '</div>'
        )

        $('#lobby').append(
          '<div id="lobby-'+user.screen_name+'" class="lobby gravatar">'+
          '<img src="http://www.gravatar.com/avatar/'+user.gravatar_id+'" />'+
          '<button id="'+(user.is_me?'my-button':'')+'">'+(user.ready ? 'Ready' : 'Not ready')+'</button>'+
          '</div>'
        )

        var ready = false
        $('#my-button').click(function(ev) {
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
      $('body').removeClass('lobby').addClass('racing')
      make_form()($('#answer'))
      desc.fadeOut('fast', function() {
        desc.text(question.description)
        desc.fadeIn('fast')
      }) 
    })

    this.socket.on('finished', function(place, screen_name) {
      // trigger confetti!
      var target = $('#track-'+screen_name)
        , current = 100
      target.animate({'bottom':current+'%'})

      console.error(place)
      if(place === 0) {
        $('#answer').html(
          '<h1>You won!</h1>'
        )
        $('body').addClass('confetti')
        setTimeout(function() {
          var win = $('<p class="win"><a href="/questions/add/">We invite you to add a question!</a><p>')
          win.hide()
          $('#answer').append(win)
          win.fadeIn('slow')
          self.socket.emit('close')
        })
      }
    })

    this.socket.on('correct', function(question, question_no, total, screen_name) {
      console.error('RIGHT')
      var target = $('#track-'+screen_name)
        , current = ~~((question_no / total)*100)

      target.animate({'bottom':current+'%'})
      asking = false
      wrong.hide()
      right.show()
      setTimeout(function() { right.fadeOut('fast') }, 1000) 
      desc.fadeOut('fast', function() {
        desc.text(question.description)
        desc.fadeIn('fast')
        make_form()($('#answer'))
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
