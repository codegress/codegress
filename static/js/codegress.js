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
			if(loggedUser){
				getChallengeFeeds();
				loadMessageCount();
			}
		}
		else ipcRenderer.send('swap',{url:'index.html'});
	});

	function loadMessageCount(){
		$('.challenges_accepted').addClass('hide');
		gapi.client.codegress.message.getMessageRead({to:loggedUser, read:false}).execute(function(resp){
			if(!resp.code){
				if(resp.items){
					check = resp.items.length;
					$('.message-count').text(check);
				}
				else $('.message-count').text('');
			}
		});
	}

		$('.challenge_active').click(function(event){
			gapi.client.codegress.challenge.getChallenges({challengee:loggedUser}).execute(function(resp){
			if(!resp.code) {
				clearFeed(); 
				loadChallenges(resp.items);
				console.log('challe');
			}
			else 
				console.log(resp);
			 
			});
		});


		$('.challenge_accepted').click(function(event){
			gapi.client.codegress.challenge.getChallenges({challengee:loggedUser}).execute(function(resp){
			if(!resp.code) {
				clearFeed(); 
				acceptedChallenges(resp.items);
				console.log('accept');
			}
			else 
				console.log(resp);
			});
			console.log('accepted hehe');
		});
		$('.challenge_rejected').click(function(event){
			gapi.client.codegress.challenge.getChallenges({challengee:loggedUser}).execute(function(resp){
			if(!resp.code) {
				clearFeed();
				rejectedChallenges(resp.items);
				console.log('rejected');
			}
			else 
				console.log(resp);
			});
			console.log('accepted hehe');
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
						<span class="pull-right date" style="font-style:italic;">`+dateTime+`</span>
					</div>
					<div class="panel-body">
						<span class='question-content hide'>`+cFeed.ques.text+`</span><span class=''>`+cFeed.ques.text.split(/[.]/)[0]+`</span>..<a href='#' class='view'>read more</a>
					</div>
					<ul class='list-inline challenge-options'>
						<li title='Like' class='like'><span class='glyphicon glyphicon-thumbs-up`;
					if(cFeed.liked_by_user)
						feed += ' text-primary';
					feed += `'></span>&nbsp;(<span class='like-count'>`+likeCount+`</span>)</li>
						<li title='Solve' class='solve'><span class='glyphicon glyphicon-edit'></span>&nbsp;(<span class='solve-count'>0</span>)</li>
						<li title='Challenge' class='challenge-this'>
							<span class='glyphicon glyphicon-share' data-toggle='modal' data-target='#challenger-modal'></span>&nbsp;(<span class='challenge-count'>0</span>)
						</li>
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

		$('.question').mouseenter(function(event){
			$(this).children('ul').removeClass('hide');
		});

		$('.question').mouseleave(function(event){
			$(this).children('ul').addClass('hide');
		});

		$('#load-more').click(function(){
			loadChallengeFeeds();
		});

		$('#feeds').click(function(){
			getChallengeFeeds();
		});

		$('.view').click(function(event){
			event.preventDefault();
			var text = $(this).siblings('.question-content').text();
			console.log(text);
		});
	}

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
		
		// $('.feeds').addClass('hide');
		$('.challenge-list').html('');
		$('.message-list').html('');
		$('.challenges_accepted').removeClass('hide');
		if(challengeList){
			for(var i = 0;i < challengeList.length;i++){
				var challenge = challengeList[i];
				console.log(challenge);
				var lik=challenge.ques.likes.length;
				if (challenge.rejected == false && challenge.accepted == false || challenge.rejected == null){
				var listElement = `<li>
					<div class='challenge'>
						<ul class='list-inline'>
							<li class="challenge-title-li"><a href='#' class='challenge-title'>`+challenge.ques.title+`</a> <span class='ques-domain'><b class='bold-domain'>{`+challenge.ques.domain+` }</b></span></li>
							<li class="challengee-id"><a href='#' class='challengee'>`+challenge.challenger+`</a></li>
							<li class='pull-right'><a href='#' class='challenge-solve' title='Solve'>
								<span class='glyphicon glyphicon-edit'></span>
							</a></li>
							<li class='pull-right'><a href='#' class='challenge-view' title='View'>
								<span class='glyphicon glyphicon-eye-open'></span>
							</a></li>
						</ul>
					</div>
					<div class='challenge-content hide'>  
						<div class='question-text'>`
						+challenge.ques.text+	
						`</div>
						<ul class='list-inline challenge-options'>
							<li title='Like' class='like'><span class='glyphicon glyphicon-thumbs-up'></span>&nbsp;<span class='like-count'></span>`
							+lik+
							`</li> 
							<li title='Comment' class='comment'><span class='glyphicon glyphicon-option-horizontal'></span></li>
						</ul> 
						<button type="submit" class="btn btn-primary btn-sm accept">Accept</button>
						<button type="submit" class="btn btn-primary btn-sm swap reject">Reject</button>
					</div>
				</li>`;
				
				$('.challenge-list').append(listElement);
				}
			}
			viewChallengContent();
		}

	}

	function acceptedChallenges(challengeList) {

		$('.challenges_accepted').removeClass('hide');
		 $('.challenge-list').html('');
		// $('.message-list').html('');
		if(challengeList){
			for(var i = 0;i < challengeList.length;i++){
				var challenge = challengeList[i];
				console.log(challenge);
				var lik=challenge.ques.likes.length;
				if (challenge.accepted == true){
				var listElement = `<li>
					<div class='challenge'>	 
						<ul class='list-inline'>
							<li class="challenge-title-li"><a href='#' class='challenge-title'>`+challenge.ques.title+`</a> <span class='ques-domain'><b class='bold-domain'>{`+challenge.ques.domain+` }</b></span></li>
							<li class="challengee-id"><a href='#' class='challengee'>`+challenge.challenger+`</a></li>
							<li class='pull-right'><a href='#' class='challenge-solve' title='Solve'>
								<span class='glyphicon glyphicon-edit'></span>
							</a></li>
						</ul>
					</div>
				</li>`;
				
				$('.challenge-list').append(listElement);
				}
			}
			viewChallengContent();
		}
	}

	function rejectedChallenges(challengeList) {

		$('.challenges_accepted').removeClass('hide');
		 $('.challenge-list').html('');
		// $('.message-list').html('');
		if(challengeList){
			for(var i = 0;i < challengeList.length;i++){
				var challenge = challengeList[i];
				console.log(challenge);
				var lik=challenge.ques.likes.length;
				if (challenge.rejected == true){
				var listElement = `<li>
					<div class='challenge'>	 
						<ul class='list-inline'>
							<li class="challenge-title-li"><a href='#' class='challenge-title'>`+challenge.ques.title+`</a> <span class='ques-domain'><b class='bold-domain'>{`+challenge.ques.domain+` }</b></span></li>
							<li class="challengee-id"><a href='#' class='challengee'>`+challenge.challenger+`</a></li>
						</ul>
					</div>
				</li>`;
				
				$('.challenge-list').append(listElement);
				}
			}
			viewChallengContent();
		}
	}

	
	function addChallenge(challenger, challengee){
		if(qData.title && qData.domain && challengee !== loggedUser){
			var question = null;
			gapi.client.codegress.challenge.addChallenge({challenger:challenger,challengee:challengee,ques:{title:qData.title,domain:qData.domain,text:qData.text}}).execute(function(resp){
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
		$('.challenges_accepted').addClass('hide');
		var inactiveDomains = selectedDomain.siblings();
		inactiveDomains.each(function(){
			$(this).removeClass('active');
		});
		selectedDomain.addClass('active');
	}

	function loadSelectedDomain(questionsList){
		$('.challenges_accepted').addClass('hide');
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
						<div class="panel-body">
							<span class='question-content'>`+text+`</span>
						</div>
						<ul class='list-inline hide' style='padding-left:10px;'>
							<li class='solve' title='Solve'><span class='glyphicon glyphicon-edit'></span></li>
							<li class='challenge-this' title='Challenge'><span class='glyphicon glyphicon-share' data-toggle='modal' data-target='#challenger-modal'></span></li>
						</ul>
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
		$('.message-wrapper > ol').html('');
	}

	function hideFeed(){
		$('.feeds > .domain-questions').addClass('hide');
		$('.feeds > .panel-group').addClass('hide');
	}

	$("#messages-select").keyup(function(event){
		var selectedChallenger = $(this).val();
		if(selectedChallenger && selectedChallenger.length >= 2 && event.keyCode != 13){
			isValidChallenger(selectedChallenger);
		}
		else if(event.keyCode == 13){
			$("#message-textarea").focus();			
		}
	});

	$('#messages-select-form').submit(function(event){
		event.preventDefault();
		var challengerInput = $(this).children('div').children('input');
		if(shortListed && shortListed.length == 1 && shortListed[0] != loggedUser){
			console.log("nthng");		
		}	
		else alert('Enter valid username');
	});

	$('#send').click(function(event){
 		var to = $('#messages-select').val();
 		var message= $('#message-textarea').val();
 		
 		gapi.client.codegress.message.send({message:message, to:to, frm:loggedUser}).execute(function(resp){
 			console.log(resp);
 		});

 	});

 	$('#messages').click(function(event){
 		clearFeed();
 		gapi.client.codegress.message.getMessageTo({to:loggedUser}).execute(function(resp){
 			if(!resp.code){
	 			gapi.client.codegress.message.readTrue({to:loggedUser}).execute(function(resp){
	 				$('.message-count').text('');
	 			});
	 		}
	 		loadMessages(resp.items);
 		});
 	});

 	function loadMessages(messageList){
 		$('.challenges_accepted').addClass('hide');
		console.log('Entered in loadMessages');
		if(messageList){
			console.log("middleeee");
			for(var i=0; i<messageList.length;i++){
				var date = new Date(messageList[i].datetime);
				var dat = date.toLocaleString();
				var list=`
					<div class="form-group">
						<li> `+messageList[i].message+` from `+messageList[i].frm+` at `+ dat +`</li>

			      	</div>`;
		 			
					$('.message-list').append(list);
			}
		}
		
		else{
			var elsList=
			`<div>
				Almost checked
			</div>`;
			$('.message-list').append(elsList);
		}
		 
	}

	function viewChallengContent(){
		var title, UID, domain;
		$('.challenge-view').click(function(){
 			$(this).parent().parent().parent().siblings('.challenge-content').toggleClass('hide');
 			title = $(this).parent().siblings('.challenge-title-li').children('.challenge-title').text();
 			UID = $(this).parent().siblings('.challengee-id').children('a').text();
 			domain = $(this).parent().siblings('.challenge-title-li').children('.challenge-title').siblings('.ques-domain').children('.bold-domain').text();
			var data = {challenger:UID,challengee:loggedUser,ques:{title:title, domain :domain},seen:true};
			modify(data);
		});

		function modify(data){
			gapi.client.codegress.challenge.modify(data).execute(function(resp){
				if(!resp.code){
					console.log(resp);
			 
				}
				else console.log(resp.code);
			});

		}

		function modifyAcceptReject(data){
			gapi.client.codegress.challenge.modify(data).execute(function(resp){
				if(!resp.code){
					console.log(resp); 
					gapi.client.codegress.challenge.getChallenges({challengee:loggedUser}).execute(function(resp){
						if(!resp.code) {
							clearFeed(); 
							loadChallenges(resp.items);
						}
						else 
							console.log(resp);
					});
				}
				else console.log(resp.code);
			});
		}

		$('.accept').click(function(){
			var data = {challenger:UID,challengee:loggedUser,ques:{title:title, domain:domain},accepted:true};
			var currentElement = $(this).parent('.challenge-content');
			currentElement.siblings('.challenge').remove();
			currentElement.remove();
			modifyAcceptReject(data);
		});
		$('.reject').click(function(){
			var data = {challenger:UID,challengee:loggedUser,ques:{title:title, domain:domain},rejected:true};
			var currentElement = $(this).parent('.challenge-content');
			currentElement.siblings('.challenge').remove();
			currentElement.remove();
			modifyAcceptReject(data); 
			
		});
	}

}