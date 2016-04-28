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
	const remoteSession = require('electron').remote.session;
	var session = remoteSession.fromPartition('persist:codegress'); 
	var loggedUser = null;

	session.cookies.get({name:'email'},function(error,cookies){
		loggedUser = cookies[0].value;
		console.log("HEY THERE,\nDO YOU LIKE WHAT WE ARE DOING\nTHIS PROJECT IS OPEN SOURCED\nFEEL FREE TO CONTRIBUTE\nhttps://github.com/codegress");
		gapi.client.codegress.challenge.getChallengeFeeds({name:loggedUser}).execute(function(resp){
			if(!resp.code){
				// console.log(resp.feeds);
				loadChallengeFeeds(resp.feeds);
				$('body').removeClass('hide');
			}
		});
	});

	function loadChallengeFeeds(feedList){
		clearFeed();
		if(feedList){
			for(var i = 0;i < feedList.length;i++){
				var challengee = feedList[i].challengee;
				var challenger = feedList[i].challenger;
				var dateTime = new Date(feedList[i].datetime);
				var ques = feedList[i].ques;
				var title = ques.title;
				var domain = ques.domain;
				var text = ques.text;
				var likeCount = 0;
				var commentCount = 0;
				if(ques.likes)
					likeCount = ques.likes.length;
				if(ques.comments)
					commentCount = ques.comments.length;
				var feed = `<div class="panel panel-default feed">
					<div class="panel-heading feed-title"><span class='question-title'>`+title+`&nbsp;&nbsp;</span>(<span>`+challengee+`</span>&nbsp;&nbsp;<span class='glyphicon glyphicon-arrow-right'></span>&nbsp;&nbsp;<span>`+challenger+`</span>)<span class="pull-right date">`+dateTime+`</span></div>
					<div class="panel-body">
						<span class='question-content'>`+text+`</span>
					</div>
					<ul class='list-inline challenge-options'>
						<li title='Like' class='like'><span class='glyphicon glyphicon-thumbs-up'></span>&nbsp;(<span class='like-count'>`+likeCount+`</span>)</li>
						<li title='Challenge' class='challenge-this'>
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

	$('#logout').click(function(event){
		session.cookies.remove('http://codegress.io/','email',function(){
			ipcRenderer.send('swap',{url:'index.html'});
		});
	});

	$('#domains').click(function(event){
		$('#domain-select').slideDown();
	});

	var qData = {}, shortListed = {};
	$("#challenger-select").keyup(function(event){
		var selectedChallenger = $(this).val();
		if(selectedChallenger && selectedChallenger.length >= 2 && event.keyCode != 13){
			isValidChallenger(selectedChallenger);
		}
	});

	$('#challenger-select-form').submit(function(event){
		event.preventDefault();
		var challengerInput = $(this).children('div').children('input');
		var challengee = challengerInput.val();
		challengerInput.val('');
		if(shortListed && shortListed.length == 1 && shortListed[0] != loggedUser){
			addChallenge(loggedUser, challengee, qData.title);
		}	
		else alert('Enter valid username');
	});

	$('#challenges').click(function(event){
		gapi.client.codegress.challenge.getChallenges({challengee:loggedUser}).execute(function(resp){
			if(!resp.code) 
				loadChallenges(resp.items);
			else 
				console.log(resp);
		});
	});

	function loadChallenges(challengeList){
		$('.feeds').addClass('hide');
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

	function addChallenge(challenger, challengee, questionTitle){
		if(questionTitle != null){
			var question = null;
			gapi.client.codegress.question.getQuestion({title:qData.title, domain:qData.domain}).execute(function(resp){
				if(!resp.code){
					question = resp.items[0];
					gapi.client.codegress.challenge.addChallenge({challenger:challenger,challengee:challengee,ques:question}).execute(function(resp){
						if(!resp.code){
							console.log(resp);
						}
						else console.log(resp.code);
					});
				}
				else console.log(resp);
			});
		}
		else console.log('No question selected');
	}

	function isValidChallenger(selectedChallenger){
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

	function eventHandlers(){
		
		function selectedQuestionData(selectedElement){
			question = $(selectedElement).parent().siblings('div');
			qData.title = question.children('.question-title').text();
			qData.text = question.children('.question-content').text();
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

		$('.challenge-this').click(function(){
			selectedQuestionData($(this));
		});
		
		$('.solve').click(function(){
			selectedQuestionData($(this));
			ipcRenderer.send('load',{url:'compiler.html',qData:qData});
		});	
		
		$('.comment').click(function(){
			$(this).parent().siblings('.panel-footer').children('.comment-section').toggleClass('hide');
		});

		$('.view').click(function(){
			var button = $(this).children('button');
			$(this).parent().siblings('.feed-body').toggle(function(){
				if(button.text() === "View")
					button.text("Hide");
				else
					button.text("View");
			});
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
				var likeCount = 0;
				if(questionsList[i].likes){
					likeCount = questionsList[i].likes.length;
				}
				var questionElement = `
					<div class='question'>
						<ul class='list-inline challenge-options'>
							<li class='feed-title'>`+title+`</li>
							<li title='Challenge' class='challenge-this pull-right'>
								<button class='btn btn-primary btn-xs' data-toggle='modal' data-target='#challenger-modal'>Challenge</button>
							</li>
							<li title='Solve' class='solve pull-right'><button class='btn btn-primary btn-xs'>Solve</button></li>
							<li title='View' class='view pull-right'><button class='btn btn-primary btn-xs'>View</button></li>
						</ul>
						<div class='feed-body' style='display:none;'><hr>`+text+`</div>
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
	}

	function hideFeed(){
		$('.feeds > .domain-questions').addClass('hide');
		$('.feeds > .panel-group').addClass('hide');
	}
}