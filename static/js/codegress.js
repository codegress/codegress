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

	var qData = {}, shortListed = {};
	$("#challenger-select").keyup(function(event){
		var selectedChallenger = $(this).val();
		if(selectedChallenger && selectedChallenger.length >= 2 && event.keyCode != 13){
			isValidChallenger(selectedChallenger);
		}
	});

	$('#challenger-select-form').submit(function(event){
		event.preventDefault();
		var challengee = $(this).children('div').children('input').val();
		if(shortListed && shortListed.length == 1 && shortListed[0] != loggedUser){
			addChallenge(loggedUser, challengee, qData.title);
		}	
		else alert('Invalid username');
	});

	function addChallenge(challenger, challengee, questionTitle){
		if(questionTitle != null){
			gapi.client.codegress.challenge.addChallenge({challenger:challenger,challengee:challengee,ques_title:questionTitle}).execute(function(resp){
				if(!resp.code){
					console.log(resp);
				}
				else console.log(resp.code);
			});
		}
		else console.log('No question selected');
	}

	function isValidChallenger(selectedChallenger){
		console.log('Hitting Database');
		gapi.client.codegress.user.shortListed({name:selectedChallenger}).execute(function(resp){
			if(!resp.code){
				shortListed = resp.data;
			}
			console.log(shortListed);
		});
		return (shortListed && shortListed.length != 0);
	}

	$('#customize-challenge').click(function(event){
		event.preventDefault();
		console.log('Customize Challenge Page');
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
		
		function selectedQuestionData(selectedElement){
			question = $(selectedElement).parent().siblings('div');
			qData.title = question.children('.question-title').text();
			qData.text = question.children('.question-content').text();
			// console.log(qData);
		}

		$('.like').click(function(){
			selectedQuestionData($(this));
			var likeButton = $(this).children('.glyphicon');
			var likeCount = $(this).children('.like-count');
			var likes = {username:loggedUser};
			if(likeButton.hasClass('text-primary')){
				likeButton.removeClass('text-primary');
				likeButton.parent().attr('title','Like');
				likes.liked = false;
			}
			else{
				likeButton.addClass('text-primary');
				likeButton.parent().attr('title','Unlike');
				likes.liked = true;
			}
			if(likes.liked){
				gapi.client.codegress.question.addQuestionLike({title:qData.title, domain:qData.domain,likes:[likes]}).execute(function(resp){
					if(resp.code) {
						console.log(resp);
					}
				});
			}
		});

		$('.challenge').click(function(){
			selectedQuestionData($(this));
		});
		
		$('.solve').click(function(){
			selectedQuestionData($(this));
			ipcRenderer.send('load',{url:'compiler.html',qData:qData});
		});	
		
		$('.comment').click(function(){
			$(this).parent().siblings('.panel-footer').children('.comment-section').toggleClass('hide');
		});
	}

	$('#domain-select > li').click(function(event){
		event.preventDefault();
		domain = $(this).children('a').text();
		qData.domain = domain;
		var questions = null;
		if(!$(this).hasClass('active')){
			activateDomain($(this));
			gapi.client.codegress.question.getDomain({domain:domain}).execute(function(resp){
				if(!resp.code){
					loadSelectedDomain(resp.items);
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
				var likeCount = 0;
				if(questionsList[i].likes){
					likeCount = questionsList[i].likes.length;
				}
				var feed = `<div class="panel panel-default feed">
					<div class="panel-heading feed-title"><span class='question-title'>`+title+`</span><span class="pull-right date">Date</span></div>
					<div class="panel-body">
						<span class='question-content'>`+text+`</span>
					</div>
					<ul class='list-inline challenge-options'>
						<li title='Like' class='like'><span class='glyphicon glyphicon-thumbs-up'></span>&nbsp;(<span class='like-count'>`+likeCount+`</span>)</li>
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