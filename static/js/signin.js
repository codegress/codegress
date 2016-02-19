$(document).ready(function(){
	console.log('Signin');

	$('#signin-btn').click(function(event){
		event.preventDefault();
		var formElements = $('#signin-form').children('div');
		if(!emptyFormFields(formElements)){
			var handleGroup = $('#handle-group');
			var passwordGroup = $('#password-group');
			var handleFeedback = handleGroup.children('span');
			var passwordFeedback = passwordGroup.children('span');
			var handle = handleGroup.children('input').val();
			var password = passwordGroup.children('input').val();
			var LoginData = {'handle':handle,'password':password};
			var toURL = host+'signin/validate/';
			var onSuccess = function(data){
				if(data['handle'] && data['password']){
					console.log('Successful Login');
					removeFeedback(handleGroup,handleFeedback);
					removeFeedback(passwordGroup,passwordFeedback);
					session.cookies.set({url:host,name:'handle',value:handle},
						function(err){
							console.log(err);
					});
					ipcRenderer.send('swap',{url:'codegress.html'})
				}
				else if(data['handle']){
					removeFeedback(handleGroup,handleFeedback);
					invalidFeedback(passwordGroup,passwordFeedback);
				}
				else{
					invalidFeedback(handleGroup,handleFeedback);
					invalidFeedback(passwordGroup,passwordFeedback);	
				}
			};
			sendAjaxPost(LoginData,toURL,onSuccess);
		}
	});
});