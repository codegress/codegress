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
	var challengeFeeds = {};
	var nextPageIndex = 0;
	var loadLimit = 10;

	session.cookies.get({name:'email'},function(error,cookies){
		if(cookies){
			loggedUser = cookies[0].value;
			if(loggedUser)
				getChallengeFeeds();
		}
		else ipcRenderer.send('swap',{url:'index.html'});
	});

	function getChallengeFeeds(){
		gapi.client.codegress.challenge.getChallengeFeeds({name:loggedUser}).execute(function(resp){
			if(!resp.code && resp.feeds){
				var challengeFeedLength = Object.keys(challengeFeeds).length;
				var respFeedLength = Object.keys(resp.feeds).length;
				if(challengeFeedLength < respFeedLength){
					challengeFeeds = resp.feeds;
					clearFeed();
					loadChallengeFeeds();
				}
			}
			else console.log(resp);
		});
	}

	function loadChallengeFeeds(){
		if(challengeFeeds){
			var limit = loadLimit;
			for(;nextPageIndex < challengeFeeds.length && limit != 0;nextPageIndex++,limit--){
				var challengee = challengeFeeds[nextPageIndex].challengee;
				var challenger = challengeFeeds[nextPageIndex].challenger;
				var dateTime = new Date(challengeFeeds[nextPageIndex].datetime);
				var cFeed = challengeFeeds[nextPageIndex];
				var likeCount = 0, commentCount = 0, likedByLoggedUser = false;
				if(cFeed.likes){
					var likes = cFeed.likes
					likeCount = likes.length;
				}
				if(cFeed.comments)
					commentCount = cFeed.comments.length;
				var feed = `<div class="panel panel-default feed">
					<div class="panel-heading feed-title">
						<span class='question-title'>`+cFeed.ques.title+`</span>&nbsp;&nbsp;
						|<a href='#'>
							<span class='question-domain'>`+cFeed.ques.domain+`</span>
						</a>&nbsp;&nbsp;
						(<span class='challenger'>`+challenger+`</span>&nbsp;&nbsp;
						<span class='glyphicon glyphicon-arrow-right'></span>
						&nbsp;&nbsp;<span class='challengee'>`+challengee+`</span>)
						<span class="pull-right date">`+dateTime+`</span>
					</div>
					<div class="panel-body">
						<span class='question-content'>`+cFeed.ques.text+`</span>
					</div>
					<ul class='list-inline challenge-options'>
						<li title='Like' class='like'><span class='glyphicon glyphicon-thumbs-up`;
					if(cFeed.liked_by_user)
						feed += ' text-primary';
					feed += `'></span>&nbsp;(<span class='like-count'>`+likeCount+`</span>)</li>
						<li title='Challenge' class='challenge-this'>
							<span class='glyphicon glyphicon-share' data-toggle='modal' data-target='#challenger-modal'></span>&nbsp;(<span class='challenge-count'>0</span>)
						</li>
						<li title='Solve' class='solve'><span class='glyphicon glyphicon-edit'></span>&nbsp;(<span class='solve-count'>0</span>)</li>
						<li title='Comment' class='comment'><span class='glyphicon glyphicon-option-horizontal'></span></li>
					</ul>
					<div class='panel-footer hide'>
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
			if(nextPageIndex < challengeFeeds.length){
				$('#load-more').removeClass('hide');
			}
			else{
				$('#load-more').addClass('hide');	
			}
		}
	}

	function eventHandlers(){
		
		function selectedQuestionData(selectedElement){
			question = $(selectedElement).parent().siblings('div');
			qData.title = question.children('.question-title').text();
			qData.text = question.children('.question-content').text();
			qData.domain = question.children('a').children('.question-domain').text();
			$('.selected-question > .question-title').text(qData.title);
			$('.selected-question > .question-text').text(qData.text);
		}

		$('.like').click(function(){
			selectedQuestionData($(this));
			var likeButton = $(this).children('.glyphicon');
			var likeCount = $(this).children('.like-count');
			var questionElement = $(this).parent().siblings('.feed-title');
			var challengee = questionElement.children('.challengee').text();
			var challenger = questionElement.children('.challenger').text();
			var likes = {username:loggedUser};
			if(likeButton.hasClass('text-primary')){
				likeButton.removeClass('text-primary');
				likeButton.parent().attr('title','Like');
				likes.liked = false;
				likeCount.text(parseInt(likeCount.text())-1);
			}
			else{
				likeButton.addClass('text-primary');
				likeButton.parent().attr('title','Unlike');
				likes.liked = true;
				likeCount.text(parseInt(likeCount.text())+1);
			}
			if(likes.liked){
				var data = {
					ques:{
						title:qData.title, 
						domain:qData.domain
					},
					challengee:challengee,
					challenger:challenger,
					likes:[likes]
				};
				gapi.client.codegress.challenge.addLike(data).execute(function(resp){
					if(!resp.code) {
						console.log(resp);
					}
				});
			}
		});

		$('.challenge-this').click(function(){
			selectedQuestionData($(this));
		});

		$('.solve').click(function(){
			selectedQuestionData($(this));
			if(qData.title && qData.text){
				ipcRenderer.send('load',{url:'compiler.html',qData:qData});
			}
			else {
				selectedQuestionDataOverriden($(this));
				ipcRenderer.send('load',{url:'compiler.html',qData:qData});
			}
		});	
		
		$('.comment').click(function(){
			$(this).parent().siblings('.panel-footer').children('.comment-section').toggleClass('hide');
		});

		$('.challenge-options').click(function(){
			var solve = $(this).children('.solve');
			var challenge = $(this).children('.challenge-this');
			$(this).siblings('.feed-body').toggle(function(){
				if(solve.hasClass('hide') && challenge.hasClass('hide')){
					solve.removeClass('hide');
					challenge.removeClass('hide');
				}
				else{
					solve.addClass('hide');
					challenge.addClass('hide')	
				}
			});
		});

		$('#load-more').click(function(){
			loadChallengeFeeds();
		});

		$('#feeds').click(function(){
			getChallengeFeeds();
		});
	}

	$('#logout').click(function(event){
		session.cookies.remove('http://codegress.io/','email',function(){
			ipcRenderer.send('swap',{url:'index.html'});
		});
	});

	$('#domains').click(function(event){
		$('#domain-select').slideDown();
	});

	$('#challenger-modal').on('shown.bs.modal', function () {
  		$('#challenger-select').focus();
	});

	var qData = {}, shortListed = {};
	$("#challenger-select").keyup(function(event){
		var selectedChallenger = $(this).val();
		if(selectedChallenger && selectedChallenger.length >= 2){
			var feedback = $(this).siblings('span')
			if(isValidChallenger(selectedChallenger)){
				feedback.parent().addClass('has-success');
				feedback.removeClass('hide');
			}
			else{
				feedback.parent().removeClass('has-success');
				feedback.addClass('hide');
			}
		}
	});

	$('#challenges').click(function(event){
		clearFeed();
		gapi.client.codegress.challenge.getChallenges({challengee:loggedUser}).execute(function(resp){
			if(!resp.code) {
				loadChallenges(resp.items);
			}
			else 
				console.log(resp);
		});
	});

	function loadChallenges(challengeList){
		if(challengeList){
			$('.challenge-list').html('');
			for(var i = 0;i < challengeList.length;i++){
				var challenge = challengeList[i];
				var listElement = `<li>
					<div class='challenge'>
						<ul class='list-inline'>
							<li><a href='#' class='challenge-title'>`+challenge.ques.title+`</a></li>
							<li><a href='#' class='challengee'>`+challenge.challenger+`</a></li>
							<li class='pull-right'><a href='#' class='challenge-solve' title='Solve'>
								<span class='glyphicon glyphicon-edit'></span>
							</a></li>
							<li class='pull-right'><a href='#' class='challenge-view' title='View'>
								<span class='glyphicon glyphicon-eye-open'></span>
							</a></li>
						</ul>
					</div>
					<div class='challenge-content hide'>
						<div class='question-title'>`
						+challenge.ques.title+	
						`</div>
						<div class='question-text'>`
						+challenge.ques.text+	
						`</div>
					</div>
				</li>`;
				$('.challenge-list').append(listElement);
			}
		}
	}

	function addChallenge(challenger, challengee){
		if(qData.title && qData.domain && challengee !== loggedUser){
			var question = null;
			gapi.client.codegress.challenge.addChallenge({challenger:challenger,challengee:challengee,ques:{title:qData.title,domain:qData.domain}}).execute(function(resp){
				if(!resp.code){
					console.log(resp);
				}
				else console.log(resp.code);
			});
		}
		else console.log('Unable to challenge');
	}

	function isValidChallenger(selectedChallenger){
		gapi.client.codegress.user.shortListed({name:selectedChallenger}).execute(function(resp){
			if(!resp.code){
				shortListed = resp.data;
			}
		});
		return (shortListed && shortListed[0] === selectedChallenger && shortListed[0] !== loggedUser);
	}

	$('#customize-challenge').click(function(event){
		event.preventDefault();
		console.log('Customize Challenge Page');
	});

	$('.challenge-btn').click(function(event){
		event.preventDefault();
		addChallenge(loggedUser, shortListed[0]);
		$('challenger-modal').modal({show:false});
	});

	$('.discover-followers').click(function(event){
		event.preventDefault();
		gapi.client.codegress.user.getFollowSuggestions({name:loggedUser}).execute(function(resp){
			if(!resp.code){
				loadFollowSuggestions(resp.data);
			}
			console.log(resp);
		});
	});

	function loadFollowSuggestions(followList){
		clearFeed();
		if(followList){
			$('.feeds').addClass('hide');
			$('.challenge-wrapper').addClass('hide');
			$('.follow-suggestions > ul').html('');
			$('.follow-suggestions').removeClass('hide');
			for(var i = 0;i < followList.length;i++){
				var user = `<li class='follower'>
					<div class='profile-image'>
						<img src="../static/images/codegress/default-handle-img.png">
					</div>
					<div class='username'>`+followList[i]+`</div>
					<div class='follow-btn'><button class='btn btn-primary btn-xs'>Follow</button></div>
				</li>`;
				$('.follow-suggestions > ul').append(user);
			}
		}
	}

	$('#domain-select > li').click(function(event){
		event.preventDefault();
		clearFeed();
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
		if($('.feeds').hasClass('hide')){
			$('.feeds').removeClass('hide');
		}
	});

	function activateDomain(selectedDomain){
		var inactiveDomains = selectedDomain.siblings();
		inactiveDomains.each(function(){
			$(this).removeClass('active');
		});
		selectedDomain.addClass('active');
	}

	function loadSelectedDomain(questionsList){
		clearFeed();
		if(questionsList != null){
			for(var i = 0;i < questionsList.length;i++){
				var title = questionsList[i].title;
				var text = questionsList[i].text;
				var domain = questionsList[i].domain;
				var likeCount = 0;
				if(questionsList[i].likes){
					likeCount = questionsList[i].likes.length;
				}
				var questionElement = `
					<div class="question">
						<div class="panel-heading feed-title">
							<span class='question-title'>`+title+`</span>&nbsp;&nbsp;
							|<a href='#'>
								<span class='question-domain'>`+domain+`</span>
							</a>
						</div>
						<div title='Challenge' class='pull-right'>
							<button class='btn btn-primary btn-xs challenge-this' data-toggle='modal' data-target='#challenger-modal'>Challenge</button>
						</div>
						<div title='Solve' class='pull-right'>
							<button class='btn btn-primary btn-xs solve'>Solve</button>
						</div>
						<div class="panel-body">
							<span class='question-content'>`+text+`</span>
						</div>
					</div>
				`;
				$('.feeds > .domain-questions').append(questionElement);
				$('.feed').css('marginBottom','5px');
				$('.feed-controls').css('paddingLeft','10px');
			}
			eventHandlers();
		}
	}

	function clearFeed(){
		$('.feeds > .domain-questions').html('');
		$('.feeds > .panel-group').html('');
		$('.follow-suggestions > ul').html('');
		$('.challenge-wrapper > ol').html('');
	}

	function hideFeed(){
		$('.feeds > .domain-questions').addClass('hide');
		$('.feeds > .panel-group').addClass('hide');
	}
}