function actualInit(apiRoot){
	var apisToLoad;
    var callback = function(){
        if(--apisToLoad == 0){
            $('body').removeClass('hide');
        }
    };
  apisToLoad = 1;
  gapi.client.load('codegress', 'v1', callback, apiRoot); 
};

$('.personal-edit').click(function(){
	$('.personal-editor').removeClass('hide');
	$('.password-editor').addClass('hide');

});

$('.password-edit').click(function(){
	$('.password-editor').removeClass('hide');
	$('.personal-editor').addClass('hide');

});

$('.profile-image > img').mouseenter(function(){
	$('#camera').removeClass('hide');

});

$('.profile-image > img').mouseleave(function(){
	$('#camera').addClass('hide');
	
});
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