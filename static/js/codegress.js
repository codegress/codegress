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

	var qData = {};
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
		listQuestion += `<li class='solve' title='Solve'><a href='#' class='btn btn-primary btn-xs'>
						<span class='glyphicon glyphicon-edit'></span></a>
						</li>`;
		listQuestion += `<li class='comment' title='Comment'><a href='#' class='btn btn-primary btn-xs'>
						<span class='glyphicon glyphicon-option-horizontal'></span></a>
						</li>`;
		listQuestion += "<li class='title'><input type='hidden' value='"+title+"'></li>";
		listQuestion += "<li class='text'><input type='hidden' value='"+text+"'></li>";
		listQuestion += "<li class='comment-section hide'><input type='text'></li>";
		listQuestion += "</li></ul>";
		$('.questions').append(listQuestion);
		$('.feeds').addClass('hide');
	}

	var shortListed = {};
	$("#challenger-select").keyup(function(event){
		var selectedChallenger = $(this).val();

		if(((selectedChallenger.length == 1) || (shortListed && shortListed.length > 10)) && event.keyCode != 13){
			gapi.client.codegress.user.shortListed({name:selectedChallenger}).execute(function(resp){
				if(!resp.code)
					shortListed = resp.data;
				else
					console.log(resp.data);
			});
		}
		else if(!shortListed)
			console.log('No challenger found');
	});

	$('#challenger-select-form').submit(function(event){
		event.preventDefault();

	});

	$('#customize-challenge').click(function(event){
		event.preventDefault();
		console.log('Customize Challenge Page');
	});

	function isValidChallenger(selectedChallenger){
		if(selectedChallenger !== loggedUser){
			for(var i = 0; shortListed && i < shortListed.length;i++){
				if(selectedChallenger === shortListed[i]){
					return true;
				}
			}
		}
		return false;
	}

	$('.challenge').click(function(){
		var title = $(this).siblings('.title').children('input').val();
		var text = $(this).siblings('.text').children('input').val();
		qData = {'question_domain':domain, 'question_title':title, 'question_text':text};
	});
	
	var displayFeeds = function(){
		var feed = `<div class="panel panel-default feed">
					<div class="panel-heading feed-title"><span class='question-title'>(Feed Title)</span><span class="pull-right date">Date</span></div>
					<div class="panel-body">
						<span class='question-content'>(Feed Content)</span>
					</div>
					<ul class='list-inline challenge-options'>
						<li title='Like' class='like'><span class='glyphicon glyphicon-thumbs-up'></span>&nbsp;(<span class='like-count'>0</span>)</li>
						<li title='Challenge' class='challenge'>
							<span class='glyphicon glyphicon-fire' data-toggle='modal' data-target='#challenger-modal'></span>&nbsp;(<span class='challenge-count'>0</span>)
						</li>
						<li title='Solve' class='solve'><span class='glyphicon glyphicon-edit'></span>&nbsp;(<span class='solve-count'>0</span>)</li>
						<li title='Comment' class='comment'><span class='glyphicon glyphicon-option-horizontal'></span></li>
					</ul>
				</div>`;
		var ten = 10;
		while(--ten != 0) {
			$('.feeds > .panel-group').append(feed);
			$('.feed').css('marginBottom','5px');
			$('.feed-controls').css('paddingLeft','10px');
		}
		
	};

	function eventHandlers(){
		$('.like').click(function(){
			var likeButton = $(this).children('.glyphicon');
			var likeCount = $(this).children('.like-count');
			if(likeButton.hasClass('text-primary')){
				likeButton.removeClass('text-primary');
				likeButton.parent().attr('title','Like');
				likeCount.html(parseInt(likeCount.text())-1);
			}
			else{
				likeButton.addClass('text-primary');
				likeButton.parent().attr('title','Unlike');
				likeCount.html(parseInt(likeCount.text())+1);
			}
		});
		$('.challenge').click(function(){
			question = $(this).parent().siblings('div');
			qData.title = question.children('.question-title').text();
			qData.text = question.children('.question-content').text();
		});
		$('.solve').click(function(){
			var title = $(this).parent().siblings('.panel-heading').children('.question-title').text();
			var text = $(this).parent().siblings('.panel-body').children('.question-content').text();
			qData = {'question_domain':domain, 'question_title':title, 'question_text':text};
			ipcRenderer.send('load',{url:'compiler.html',qData:qData});
		});	
		$('.comment').click(function(){
			$(this).parent().siblings('.panel-footer').children('.comment-section').toggleClass('hide');
		});
		$('#challenger-select-form').submit(function(event){
			event.preventDefault();
			var challengee = $(this).children('div').children('input').val();
			console.log(challengee);
		});
	}

	$('#domain-select > li').click(function(event){
		event.preventDefault();
		domain = $(this).children('a').text();
		var questions = null;
		if(!$(this).hasClass('active')){
			activateDomain($(this));
			gapi.client.codegress.question.getQuestion({domain:domain}).execute(function(resp){
				if(!resp.code){
					loadSelectedDomain(resp.ques);
				}
				else console.log('Response code : '+resp.code);
			});
		}
		else console.log('User selected same domain again!');
	});

	function activateDomain(selectedDomain){
		var inactiveDomains = selectedDomain.siblings();
		inactiveDomains.each(function(){
			$(this).removeClass('active');
		});
		selectedDomain.addClass('active');
	}

	function loadSelectedDomain(questionsList){
		clearDomain();
		if(questionsList != null){
			for(var i = 0;i < questionsList.length;i++){
				var title = questionsList[i].title;
				var text = questionsList[i].text;
				var feed = `<div class="panel panel-default feed">
					<div class="panel-heading feed-title"><span class='question-title'>`+title+`</span><span class="pull-right date">Date</span></div>
					<div class="panel-body">
						<span class='question-content'>`+text+`</span>
					</div>
					<ul class='list-inline challenge-options'>
						<li title='Like' class='like'><span class='glyphicon glyphicon-thumbs-up'></span>&nbsp;(<span class='like-count'>0</span>)</li>
						<li title='Challenge' class='challenge'>
							<span class='glyphicon glyphicon-share' data-toggle='modal' data-target='#challenger-modal'></span>&nbsp;(<span class='challenge-count'>0</span>)
						</li>
						<li title='Solve' class='solve'><span class='glyphicon glyphicon-edit'></span>&nbsp;(<span class='solve-count'>0</span>)</li>
						<li title='Comment' class='comment'><span class='glyphicon glyphicon-option-horizontal'></span></li>
					</ul>
					<div class='panel-footer'>
						<form action='javascript:void(0)' role='form' class='comment-section hide'>
							<div class='form-group'>
								<input type='text' class='form-control comment-text'>
							</div>
							<div class='form-group'>
								<input type='submit' class='btn btn-primary btn-xs'>
							</div>
							<a href='#'>Show all comments</a>
						</form>
						<ul class='previous-comments hide'></ul>
					</div>
				</div>`;
				$('.feeds > .panel-group').append(feed);
				$('.feed').css('marginBottom','5px');
				$('.feed-controls').css('paddingLeft','10px');
			}
			eventHandlers();
		}
	}

	function clearDomain(){
		$('.feeds > .panel-group').html('');
	}
}