const ipcRenderer = require('electron').ipcRenderer;
const remoteSession = require('electron').remote.session;
function actualInit(apiRoot){
	var apisToLoad;
    var callback = function(){
        if(--apisToLoad == 0){
            loadEverything();
        }
    };
  apisToLoad = 1;
  gapi.client.load('codegress', 'v1', callback, apiRoot); 
};

function loadEverything(){
	$('body').removeClass('hide');

	var session = remoteSession.fromPartition('persist:codegress'); 

	session.cookies.get({name:'email'},function(error,cookies){
		if(cookies.length > 0) $('#header').html(cookies[0].value); 
	});

	$('#logout').click(function(event){
		session.cookies.remove('http://codegress.io/','email',function(){
			ipcRenderer.send('swap',{url:'index.html'});
		});
	});

	gapi.client.codegress.question.getQuestion({}).execute(function(resp){
		if(!resp.code){
			var questions = resp.ques;
			loadQuestions(questions);	
		}
		else console.log(resp);
	});

	function clearFeed(){
		$('.feed').html('');	
	}

	var domain = null;
	function loadQuestions(questions){
		clearFeed();
		for(var index = 0; index < questions.length;index++){
			var currentQuestion = questions[index];
			domain = currentQuestion.domain;
			var title = currentQuestion.title;
			var text = currentQuestion.text;
			addQuestion(title, text);
		}
		addEventHandlers();
	}

	function addEventHandlers(){
		$('.solve').click(function(){
			var title = $(this).siblings('.title').children('input').val();
			var text = $(this).siblings('.text').children('input').val();
			var qData = {'qDomain':domain, 'qTitle':title, 'qText':text};
			ipcRenderer.send('load',{url:'compiler.html',qData:qData});
		});
		
		$('.challenge').click(function(){
			console.log('Select a challenger');
			$('#challenger-modal').on('show-bs-modal',function(){
				$('#challenger').attr('autofocus',true);
			});
		});

		$('.comment').click(function(){
			$(this).siblings('.comment-section').toggleClass('hide');
		});
	}

	function addQuestion(title, text){
		var listQuestion = "<li><h4>"+title+"</h4>";
		listQuestion += "<h5>"+text+"</h5><ul class='list-inline'>";
		listQuestion += "<li class='solve'><a href='#' class='btn btn-primary btn-xs'>Solve</a></li>"
		listQuestion += "<li class='challenge'><a href='#' class='btn btn-primary btn-xs' data-toggle='modal' data-target='#challenger-modal'>Challenge</a></li>"
		listQuestion += "<li class='comment'><a href='#' class='btn btn-primary btn-xs'>Comment</a></li>";
		listQuestion += "<li class='title'><input type='hidden' value='"+title+"'></li>";
		listQuestion += "<li class='text'><input type='hidden' value='"+text+"'></li>";
		listQuestion += "<li class='comment-section hide'><input type='text'></li>";
		listQuestion += "</li></ul>";
		$('.feed').append(listQuestion);
	}

	$('#challenger-select-form').submit(function(event){
		event.preventDefault();
		var selectedChallenger = $('#challenger').val();
		console.log(selectedChallenger);
	});
}