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
	var loggedUser = null, challengeFeeds = {}, nextPageIndex = 0, loadLimit = 10;

	session.cookies.get({name:'email'},function(error,cookies){
		if(cookies){
			loggedUser = cookies[0].value;
			var googleAPI = gapi.client.codegress;
			if(loggedUser && googleAPI){
				getChallengeFeeds();
				getUnreadMessageCount();
				getMessages();
				getChallenges();
				getFollowSuggestions();
				// getFollowees();
				getSubmissions();
				showPage();
			}
			else console.log("Unable to load Google API");
		}
		else ipcRenderer.send('swap',{url:'index.html'});
	});

	function showPage(){
		$('body').removeClass('hide');
	}

	function hideLoadingImage(){
		$('#loading').addClass('hide');
	}

	function clearChallengerSuggestions(){
		$('.challenger-suggestions').html('');
	}

	function getFollowees(){
		gapi.client.codegress.user.getFollowees({follower:loggedUser}).execute(function(resp){
			if(!resp.code){
				setFollowees(resp.items);
			}
			else console.log(resp.code);
		});
	}

	function setFollowees(followList){
		if(followList){
			for(var i = 0;i < followList.length;i++){
				follows.push(followList[i].followee);
			}
		}
	}

	function getSubmissions(){
		gapi.client.codegress.challenge.getAllSubmissions({username:loggedUser}).execute(function(resp){
			if(!resp.code)
				loadSubmissions(resp.items);
		});
	}

	function loadSubmissions(submissionList){
		if(submissionList){
			for(var index = 0;index < submissionList.length;index++){
				var submission = submissionList[index];
				var dateTime = new Date(submission.datetime).toLocaleString();
				var subElement = `<li><div class='submission'>`;
				subElement += `<a href='#' class='sub-title'>`+submission.ques.title+`</a>&nbsp;|&nbsp;`;
				subElement += `<span class='sub-domain hide'>`+submission.ques.domain+`</span>`;
				subElement += `<span class='date-time-python hide'>`+submission.datetime+`</span>`;
				subElement += `<span class='date-time-js'>`+dateTime+`</span></div></li>`;
				$('.submission-list').append(subElement);
			}
			submissionEventHandler();
		}
	}

	function submissionEventHandler(){
		$('.sub-title').click(function(event){
			event.preventDefault();
			var data = {}
			data.title = $(this).text();
			data.domain = $(this).siblings('.sub-domain').text();
			data.datetime = $(this).siblings('.date-time-python').text();
			ipcRenderer.send('load',{'qData':data,'url':'compiler.html'});
		});
	}

	function getUnreadMessageCount(){
		$('.challenges').addClass('hide');
		gapi.client.codegress.message.getMessageRead({to:loggedUser, read:false}).execute(function(resp){
			if(!resp.code){
				if(resp.items){
					var messageCount = resp.items.length;
					$('.message-count').text(messageCount);
				}
				else $('.message-count').text('');
				}
			$('.message-count').removeClass('hide');
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
			else {
				hideLoadingImage();
				$('.feeds').prepend("<p class='text-danger text-center'>No feeds to display..</p>");
			}
		});
	}

	function loadChallengeFeeds(){
		if(challengeFeeds){
			var limit = loadLimit;
			for(;nextPageIndex < challengeFeeds.length && limit != 0;nextPageIndex++,limit--){
				var challengee = challengeFeeds[nextPageIndex].challengee;
				var challenger = challengeFeeds[nextPageIndex].challenger;
				var dateTime = new Date(challengeFeeds[nextPageIndex].datetime).toLocaleString();
				var cFeed = challengeFeeds[nextPageIndex];
				var likeCount = 0, commentCount = 0;
				var likeTitle = "Like";
				if(cFeed.likes){
					var likes = cFeed.likes
					likeCount = likes.length;
					likeTitle = "";
					for(var i = 0;i < likes.length;i++){
						likeTitle += likes[i].username+"\n";
					}
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
					</div>
					<div class="panel-body">
						<span class='question-content hide'>`+cFeed.ques.text+`</span><span class=''>`+cFeed.ques.text.split(/[.]/)[0]+`</span>..<a href='#' class='view'>read more</a>
					</div>
					<ul class='list-inline challenge-options'>
						<li title='`+likeTitle+`' class='like'><span class='glyphicon glyphicon-thumbs-up`;
					if(cFeed.liked_by_user && likeCount)
						feed += ' text-primary';
					feed += `'></span>&nbsp;(<span class='like-count'>`+likeCount+`</span>)</li>
						<li title='Solve' class='solve'><span class='glyphicon glyphicon-edit'></span>&nbsp;(<span class='solve-count'>0</span>)</li>
						<li title='Challenge' class='challenge-this'>
							<span class='glyphicon glyphicon-share' data-toggle='modal' data-target='#challenger-modal'></span>&nbsp;(<span class='challenge-count'>0</span>)
						</li>
						<li title='Comment' class='comment'><span class='glyphicon glyphicon-option-horizontal'></span></li>
						<li class='pull-right'><span class="date">`+dateTime+`</span></li>
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
		feedEventHandlers();
		if(nextPageIndex < challengeFeeds.length){
			$('#load-more').removeClass('hide');
		}
		else{
			$('#load-more').addClass('hide');	
		}
		hideLoadingImage();
		}
	}

	function selectedQuestionData(selectedElement){
		var question = $(selectedElement).parent().siblings('div');
		qData.title = question.children('.question-title').text();
		qData.text = question.children('.question-content').text();
		qData.domain = question.children('a').children('.question-domain').text();
		$('.selected-question > .question-title').text(qData.title);
		$('.selected-question > .question-text').text(qData.text);
	}

	function suggestChallengers(startIndex, endIndex){
		clearChallengerSuggestions();
		if(startIndex >= 0 && endIndex >= 0){
			for(var i = startIndex;i <= endIndex;i++){
				var username = follows[i];
				var listElement = `
				<li><input class='challenger' type='radio' name='select-challenger' id='`+username+`'><label for='`+username+`'>`+username+`</label></li>`;
				$('.challenger-suggestions').append(listElement);
			}
			suggestEventHandlers();
		}
		else{
			var listElement = `<li class='text-center'><p class='text-danger'>No user found</p></li>`;
			$('.challenger-suggestions').append(listElement);
		}
	}

	function suggestEventHandlers(){
		$('.challenger').click(function(event){
			var selectedElement = $(this)[0];
			if(selectedElement){
				$('#challenger-select').val(selectedElement.id);
			}
			else console.log(selectedElement);
		});
	}

	function commonEventHandlers(){
		$('.challenge-this').click(function(){
			selectedQuestionData($(this));
		});

		$('.solve').click(function(){
			selectedQuestionData($(this));
			if(qData.title && qData.text){
				ipcRenderer.send('load',{url:'compiler.html',qData:qData});
			}
		});
	}

	function domainQuestionEventHandlers(){
		
		commonEventHandlers();

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
			$(this).children('.challenge-controls').removeClass('hide');
		});

		$('.question').mouseleave(function(event){
			$(this).children('.challenge-controls').addClass('hide');
		});

		$('.view').click(function(event){
			event.preventDefault();
			var text = $(this).siblings('.question-content').text();
			console.log(text);
		});
	}

	function feedEventHandlers(){

		commonEventHandlers();
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
		
		$('.comment').click(function(){
			$(this).parent().siblings('.panel-footer').children('.comment-section').toggleClass('hide');
		});

		$('#load-more').click(function(){
			loadChallengeFeeds();
		});
	}

	/* Focus on input field after challenger modal pops up */
	$('#challenger-modal').on('shown.bs.modal', function () {
  		$('#challenger-select').focus();
	});

	$('#feeds').click(function(){
		hideMainView($('.feeds'));
		if($.trim($('.feeds > .panel-group').html().length)){
			$('.feeds').removeClass('hide');
		}
		else{
			getChallengeFeeds();
			$('.feeds').removeClass('hide');
		}
	});

	$('#messages').click(function(){
		hideMainView($('.messages'));
		if($.trim($('.message-list').html().length)){
			$('.messages').removeClass('hide');
			console.log("Messages");
		}
		else{
			getMessages();
			$('.messages').removeClass('hide');	
		}
	});

	$('#challenges').click(function(){
		hideMainView($('.challenges'));
		if($.trim($('.challenge-list').html().length)){
			$('.challenges').removeClass('hide');
		}
		else{
			getChallenges();
			$('.challenges').removeClass('hide');
		}
	});

	$('#domains').click(function(){
		hideMainView($('.domains'));
		$('#domain-select').slideDown();
		if($.trim($('.domain-questions').html().length)){
			$('.domains').removeClass('hide');
		}
	});

	$('#submissions').click(function(){
		hideMainView($('.submissions'));
		if($.trim($('.submission-list').html().length)){
			$('.submissions').removeClass('hide');
		}
	});

	function hideMainView(unhideElement){
		$('.main-view').children('div').each(function(){
			$(this).addClass('hide');
		});
		if(unhideElement)
			unhideElement.removeClass('hide');
	}

	$('.sidebar > li').click(function(event){
		var element = $(this).children('a').text().trim();
		var sidebarList = {
			"Feeds":{id:$('#feeds'),class:$('.feeds')},
			"Messages":{id:$('#messages'),class:$('.messages')},
			"Challenges":{id:$('#challenges'),class:$('.challenges')},
			"Domains":{id:$('#domains'),class:$('.domains')},
			"Submissions":{id:$('#submissions'),class:$('.submissions')}
		};
		var activeElement = sidebarList[element].id;
		activateSidebarElement(activeElement);
	});

	function activateSidebarElement(activeElement){
		$('.sidebar > li').each(function(){
			$(this).removeClass('active');
		});
		activeElement.parent().addClass('active');
	}

	var qData = {}, shortListed = {};
	$("#challenger-select").keyup(function(event){
		var selectedChallenger = $(this).val();
		// console.log(follows);
		if(selectedChallenger){
			var startIndex = -1, endIndex = -1;
			for(var i = 0;i < follows.length;i++){
				var pattern = new RegExp(selectedChallenger);
				var isFound = pattern.test(follows[i]);
				if(isFound){
					if(startIndex === -1)
						startIndex = i; 
					endIndex = i;
				}
				else if(startIndex !== -1 && endIndex !== -1){
					break;
				}
			}
			// console.log(startIndex+' - '+endIndex);
			suggestChallengers(startIndex, endIndex);
		}
		else clearChallengerSuggestions();
	});

	/* Get challenges and format them on the page to display */
	function getChallenges(){
		gapi.client.codegress.challenge.getChallenges({challengee:loggedUser}).execute(function(resp){
			if(!resp.code) {
				loadChallenges(resp.items);
			}
			else console.log(resp);
		});
	};

	function loadChallenges(challengeList){
		$('.challenge-list').html('');
		$('.challenges').removeClass('hide');
		if(challengeList){
			for(var i = 0;i < challengeList.length;i++){
				var challenge = challengeList[i];
				var likeCount = challenge.ques.likes.length;
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
							+likeCount+
							`</li> 
							<li title='Comment' class='comment'><span class='glyphicon glyphicon-option-horizontal'></span></li>
						</ul> 
						<button type="submit" class="btn btn-primary btn-sm accept">Accept</button>
						<button type="submit" class="btn btn-primary btn-sm swap reject">Reject</button>
					</div>
				</li>`;
				
				$('.challenge-list').append(listElement);
			}
			$('.challenge-panel').removeClass('hide');
		}
			viewChallengContent();
		}

		$('.challenge_active').click(function(event){
			loadChallenges(challengeList);
		});
		
		$('.challenge_accepted').click(function(event){
			acceptedChallenges(challengeList);
		});
	}

	function acceptedChallenges(challengeList) {
		$('.challenges').removeClass('hide');
		 $('.challenge-list').html('');
		if(challengeList){
			for(var i = 0;i < challengeList.length;i++){
				var challenge = challengeList[i];
				var likeCount=challenge.ques.likes.length;
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

		$('.challenges').removeClass('hide');
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
		if(qData.title && qData.domain && challengee && challengee !== loggedUser){
			var question = null;
			gapi.client.codegress.challenge.addChallenge({challenger:challenger,challengee:challengee,ques:{title:qData.title,domain:qData.domain,text:qData.text}}).execute(function(resp){
				if(!resp.code){
					if(resp.datetime){
						alert("Successfully challenged "+challengee);
						$('#challenger-modal').modal('hide');
					}
					else console.log("Cannot challenge");
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

	$('#challenger-select-form').submit(function(event){
		event.preventDefault();
	});

	$('#challenge-btn').click(function(event){
		event.preventDefault();
		var challengee = $('#challenger-select').val();
		addChallenge(loggedUser, challengee);
	});

	$('.discover-followers').click(function(event){
		event.preventDefault();
		hideMainView($('.follow-suggestions'));
	});

	var follows = []
	function getFollowSuggestions(){
		var length = $.trim($('.follow-wrapper > ul').html().length);
		if(length == 0){
			var existingFollowerLength = $('.follower').length;
			gapi.client.codegress.user.getFollowSuggestions({name:loggedUser}).execute(function(resp){
				if(!resp.code){
					if(resp.items){
						var newFollowerLength = resp.items.length;
						if(existingFollowerLength != newFollowerLength){
							loadFollowSuggestions(resp.items);
						}
						console.log(resp.items);
					}
				}
			});
		}
	}

	function loadFollowSuggestions(followList){
		if(followList){
			$('.follow-wrapper > ul').html('');
			for(var i = 0;i < followList.length;i++){
				var follower = followList[i];
				var formatedFollower = `<li class='follower row'>
					<div class='profile-image'>
						<img src="../static/images/codegress/default-handle-img.png">
					</div>
					<div class='follow-username'>`+follower.username+`</div>
					<div class='follow-btn'>
						<button class='btn btn-primary btn-xs'>Follow</button>
					</div>
				</li>`;
				$('.follow-wrapper > ul').append(formatedFollower);
			} 
			followEventHandlers();
		}
	}

	function followEventHandlers(){
		$('.follow-btn').click(function(event){
			event.preventDefault();
			var followButton = $(this).children('button');
			if(followButton.text() === 'Follow'){
				followButton.text("UnFollow");
				var followUsername = $(this).siblings('.follow-username').text();
				var followee = {username:followUsername};
				var follower = {username:loggedUser};
				addFollowee(follower, followee);
			}
		});
	}

	function addFollowee(fwer, fwee){
		gapi.client.codegress.user.follow({followee:fwee, follower:fwer}).execute(function(resp){
			console.log(resp);
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
	});

	function activateDomain(selectedDomain){
		$('.challenges').addClass('hide');
		var inactiveDomains = selectedDomain.siblings();
		inactiveDomains.each(function(){
			$(this).removeClass('active');
		});
		selectedDomain.addClass('active');
	}

	function loadSelectedDomain(questionsList){
		$('.challenges').addClass('hide');
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
				var questionElement = `<li>
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
						<div class='challenge-controls hide' style='padding-left:10px;'>
							<span class='solve' title='Solve'><span class='glyphicon glyphicon-edit'></span></span>
							<span class='challenge-this' title='Challenge'><span class='glyphicon glyphicon-share' data-toggle='modal' data-target='#challenger-modal'></span></span>
						</div>
					</div>
					</li>
				`;
				$('.domain-questions').append(questionElement);
				$('.feed').css('marginBottom','5px');
				$('.feed-controls').css('paddingLeft','10px');
			}
			domainQuestionEventHandlers(); 
		}
	}

	function clearFeed(){
		$('.domain-questions').html('');
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
			console.log("Valid username :)")		
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

 	function getMessages(){
 		gapi.client.codegress.message.getMessageTo({to:loggedUser}).execute(function(resp){
 			if(!resp.code){
	 			loadMessages(resp.items);	
	 		}
	 		else console.log(resp);
 		});
 	}

 	function loadMessages(messageList){
 		$('.challenges').addClass('hide');
		if(messageList){
			for(var i=0; i<messageList.length;i++){
				var date = new Date(messageList[i].datetime);
				var dat = date.toLocaleString();
				var list=`<li class='message'>
						<div class='message-head'><a href='#'>`+messageList[i].frm+`</a></div>
						<div class='message-body'>`+messageList[i].message+`</div>
						<div class='message-date'>`+ dat +`</div>
					</li>`;
			    $('.message-list').append(list);
			}
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
			console.log(data);
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