function actualInit(apiRoot){
	var apisToLoad;
    var callback = function(){
        if(--apisToLoad == 0){
        	loadEverything();
            $('body').removeClass('hide');
        }
    };
  apisToLoad = 1;
  gapi.client.load('codegress', 'v1', callback, apiRoot); 
};
 
function loadEverything(){
	var loggedUser = null;
	var settings = null;
	session.cookies.get({name:'email'},function(error,cookies){
		if(cookies){
			loggedUser = cookies[0].value;
			setPersonalSetting();
		}
		else ipcRenderer.send('swap',{url:'index.html'});
	});

	function setPersonalSetting(){
		gapi.client.codegress.user.getPersonalSetting({name:loggedUser}).execute(function(resp){
			$('.fullname').val(resp.fullname);
			$('.email').val(resp.email);
			$('.country').val(resp.country);
		});
	}

	$('.personal-edit').click(function(){
		$('.personal-editor').removeClass('hide');
		$('.password-editor').addClass('hide');
		$('.updateSettings').click(function(){
			var fullname=$('.fullname').val();
			var email=$('.email').val();
			var country=$('.country').val();
			gapi.client.codegress.user.setPersonalSetting({username:loggedUser, fullname:fullname, email:email, country: country}).execute(function(resp){
				console.log(resp);
				if(resp.status)
					alert("Changes Done ! Sucess ");
				else
					alert("Stop naughty things");
			});
			
		});
	});
	

	$('.password-edit').click(function(){
		$('.password-editor').removeClass('hide');
		$('.personal-editor').addClass('hide');
		console.log("hello password");
	});

	$('.updatePassword').click(function(){
		var oldpassword=$('.oldpassword').val();
		var newpassword=$('.newpassword').val();
		gapi.client.codegress.user.setPassword({username:loggedUser, oldpassword:oldpassword, newpassword:newpassword}).execute(function(resp){
				console.log(resp);
				if(resp.status==true)
					alert("Password changed ");
				else
					alert("Stop naughty things");
				$('.oldpassword').val("");
				$('.newpassword').val("");
			});
		
	});

	

	$('.profile-image > img').mouseenter(function(){
		$('#camera').removeClass('hide');

	});

	$('.profile-image > img').mouseleave(function(){
		$('#camera').addClass('hide');
		
	});
}


// $('.pencil').mouseenter(function(){
// 	$(this).children('.glyphicon-pencil').removeClass('hide');
// 	});

// $('.pencil').mouseleave(function(){
// 	$(this).children('.glyphicon-pencil').addClass('hide');
// 	});

// var hidePencils = function(){
// 	$('.glyphicon .glyphicon-pencil').addClass('hide');
// };

// $('.fullname-pencil > .glyphicon-pencil').click(function(){
// 	hidePencils();
// 	 $('.fullname-pencil').addClass('hide');
// 	 var fullname = $('#fullname').text();
// 	 $('#fullname-edit').val(fullname);
// 	 $('.fullname-change').removeClass('hide');

// });

// $('.email-pencil > .glyphicon-pencil').click(function(){
// 	hidePencils();
// 	 $('.email-pencil').addClass('hide');
// 	 var email = $('#email').text();
// 	 $('#email-edit').val(email);
// 	 $('.email-change').removeClass('hide');

// });

// $('.country-pencil > .glyphicon-pencil').click(function(){
// 	hidePencils();
// 	 $('.country-pencil').addClass('hide');
// 	 var country = $('#country').text();
// 	 $('#country-edit').val(country);
// 	 $('.country-change').removeClass('hide');

// });