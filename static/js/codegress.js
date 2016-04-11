const ipcRenderer = require('electron').ipcRenderer;
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
	const remoteSession = require('electron').remote.session;
	var session = remoteSession.fromPartition('persist:codegress'); 
	var loggedUser = null;

	session.cookies.get({name:'email'},function(error,cookies){
		loggedUser = cookies[0].value;
		if(cookies.length > 0) $('#header').html(loggedUser); 
	});

	$('#logout').click(function(event){
		session.cookies.remove('http://codegress.io/','email',function(){
			ipcRenderer.send('swap',{url:'index.html'});
		});
	});

	gapi.client.codegress.question.getQuestion({}).execute(function(resp){
		if(!resp.code){
			var questions = resp.ques;
			$('#questions').click(function(event){
				event.preventDefault();
				loadQuestions(questions);
				hideGraph();
			});
		}
		else console.log(resp);
	});

	function hideGraph(){
		$('.graphs').addClass('hide');
	}

	function clearPage(){
		$('.feed').html('');	
		$('.questions').html('');	
	}

	var domain = null;
	function loadQuestions(questions){
		clearPage();
		for(var index = 0; index < questions.length;index++){
			var currentQuestion = questions[index];
			domain = currentQuestion.domain;
			var title = currentQuestion.title;
			var text = currentQuestion.text;
			addQuestion(title, text);
		}
		addEventHandlers();
	}

	var qData = null;
	function addEventHandlers(){
		$('.solve').click(function(){
			var title = $(this).siblings('.title').children('input').val();
			var text = $(this).siblings('.text').children('input').val();
			qData = {'question_domain':domain, 'question_title':title, 'question_text':text};
			ipcRenderer.send('load',{url:'compiler.html',qData:qData});
		});

		$('.comment').click(function(){
			$(this).siblings('.comment-section').toggleClass('hide');
		});
	}

	function addQuestion(title, text){
		var listQuestion = "<li><h4>"+title+"</h4>";
		listQuestion += "<h5>"+text+"</h5><ul class='list-inline'>";
		listQuestion += "<li class='solve'><a href='#' class='btn btn-primary btn-xs'>Solve</a></li>"
		listQuestion += "<li class='comment'><a href='#' class='btn btn-primary btn-xs'>Comment</a></li>";
		listQuestion += "<li class='title'><input type='hidden' value='"+title+"'></li>";
		listQuestion += "<li class='text'><input type='hidden' value='"+text+"'></li>";
		listQuestion += "<li class='comment-section hide'><input type='text'></li>";
		listQuestion += "</li></ul>";
		$('.questions').append(listQuestion);
		$('.feeds').addClass('hide');
	}

	var shortListed = null;
	$("#challenger-select").keyup(function(){
		var selectedChallenger = $(this).val();
		if(selectedChallenger){
			gapi.client.codegress.user.shortListed({name:selectedChallenger}).execute(function(resp){
				if(!resp.code){
					shortListed = resp.data;
				}
				else console.log(resp.code);
			});
		}
	})

	$('#challenger-select-form').submit(function(event){
		event.preventDefault();
		var selectedChallenger = $('#challenger-select').val();
		if(shortListed != null && shortListed.length == 1){
			if(selectedChallenger == shortListed[0]){
				qData.selected_challenger = selectedChallenger;
				var data = {url:'challenge.html',qData:qData};
				ipcRenderer.send('load',data);
			}
			else console.log('Selected user is not registered');
		}
		else console.log('Cannot find user');
	});

	$('.challenge').click(function(){
		console.log('Select a challenger');
		var title = $(this).siblings('.title').children('input').val();
		var text = $(this).siblings('.text').children('input').val();
		qData = {'question_domain':domain, 'question_title':title, 'question_text':text};
	});
	
	var displayFeeds = function(){
		var feed = `<div class="panel panel-default feed">
					<div class="panel-heading feed-title">(Feed Title)<span class="pull-right">Date</span></div>
					<div class="panel-body">
						(Feed Content)
					</div>
				</div>`;
		var ten = 10;
		while(--ten != 0) {
			$('.feeds > .panel-group').append(feed);
			$('.feed').css('marginBottom','5px');
			$('.feed-controls').css('paddingLeft','10px');
		}
	}();
}