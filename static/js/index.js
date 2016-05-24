var dataToSend = {};   

function enableForm(){ 
    if(localStorage.signed)
        showSigninForm();
    else
        showSignupForm();
};

function showBody(){
    $('body').removeClass('hide');
    enableForm();
}

function initialiseAPI(apiRoot){ 
    var apisToLoad;
    var callback = function(){
        if(--apisToLoad == 0){
            showBody();
        }
    };
    apisToLoad = 1;
    gapi.client.load('codegress', 'v1', callback, apiRoot);
};

// Swapping pages using IPC protocol
$('.swap').click(function(event){
	event.preventDefault();
	var htmlPage = $(this).attr('href');
    ipcRenderer.send('swap',{'url':htmlPage});
});

$('#forgot > a').click(function(event){
    event.preventDefault();
    showRecoverForm();
    clearStatus();
});

function showSignupForm(){
    $('.signup').removeClass('hide');
    $('.signin').addClass('hide');
    $('.recover').addClass('hide');
}

function showSigninForm(){
    $('.signup').addClass('hide');
    $('.signin').removeClass('hide');
    $('.recover').addClass('hide');
}

function showRecoverForm(){
    $('.signup').addClass('hide');
    $('.signin').addClass('hide');
    $('.recover').removeClass('hide');
}

function hideSignupForm(){
    $('.signup').addClass('hide');
}

function hideSigninForm(){
    $('.signin').addClass('hide');
}

function hideRecoverForm(){
    $('.recover').addClass('hide');
}

function showForgotPassword(){
    $('#forgot').removeClass('hide');
}

function hideForgotPassword(){
    $('#forgot').addClass('hide');
}

function disableSigninButton(text){
    $('#signin-btn').attr('disabled',true);
    $('#signin-btn').text(text);
}

function enableSigninButton(text){
    $('#signin-btn').attr('disabled',false);
    $('#signin-btn').text(text);
}

function clearPasswordField(){
    $('input:password').val("");
}

var failedAttempts = 0;
$('#signin-form').submit(function(event){
    event.preventDefault();
    var isEmpty = emptyFormFields($(this));
    const remoteSession = require('electron').remote.session;
    var session = remoteSession.fromPartition('persist:codegress');  
    if(!isEmpty){
        disableSigninButton("Signing in...");
        gapi.client.codegress.user.validateAccount(dataToSend).execute(function(resp){
            var data = resp.data;
            if(!resp.code && resp.status){
                session.cookies.set({url:'http://codegress.io/',name:'email',value:resp.data[0]},function(error){
                    if(error) console.log(error);
                    else ipcRenderer.send('swap',{'url':'codegress.html'});
                });
            }
            else if(data && data.indexOf("username") != -1){
                enableSigninButton("Sign In");
                invalidFeedback($('#signin-email-group'));
                invalidFeedback($('#signin-password-group'));
                setFeedbackText("Email / Username not registered yet.");
            }
            else if(data && data.indexOf("password") != -1){
                enableSigninButton("Sign In");
                invalidFeedback($('#signin-password-group'));
                setFeedbackText("Password didn't match");
                clearPasswordField();
                if(++failedAttempts >= 2){
                    showForgotPassword();
                }
            }
            else console.log("Apocalypse");
        });
    }
    else setFeedbackText("All fields are required");
});

$('#signup-form').submit(function(event){
    event.preventDefault();
    var isEmpty = emptyFormFields($(this));
    clearStatus();
    if(!isEmpty){
        gapi.client.codegress.user.createAccount(dataToSend).execute(function(resp){
            if(!resp.code){
                if(resp.username === 'username' && resp.email === 'email'){
                    invalidFeedback('#signup-username-group');
                    invalidFeedback('#signup-email-group');
                    setFeedbackText("Username & Email already taken");
                }
                else if(resp.username === 'username'){
                    invalidFeedback('#signup-username-group');
                    setFeedbackText("Username already taken");
                }
                else if(resp.email === 'email'){
                    invalidFeedback('#signup-email-group');
                    setFeedbackText("Email already taken");
                }
                else {
                    localStorage.signed = true;
                    hideSignupForm();
                    showSigninForm();
                }
            }
            else console.log(resp);
        });
    }
    else setFeedbackText("All are required fields!");
});

$('#recover-form').submit(function(event){
    event.preventDefault();
    var isEmpty = emptyFormFields($(this));
    if(!isEmpty){
        console.log('Recover email sent..');
    }
    else setFeedbackText("Enter registered email");
});

$('#pass-toggle').click(function(){
    
});

// Check if text fields are empty and add appropriate glyphicons
function emptyFormFields(form){
    var empty = false;
    var formElements = form.children('div');
    formElements.each(function(){
        var inputElement = $(this).children('input');
        var groupElement = $(this);
        if(!inputElement.val()){
            invalidFeedback(groupElement);
            empty = true;
        }
        else{
            removeFeedback(groupElement);
            dataToSend[inputElement.attr('name')] = inputElement.val();
        }
    });
    return empty;
};

// Add glyphicons to valid fields
function validFeedback(groupElement){
    $(groupElement).removeClass('has-warning');
    $(groupElement).addClass('has-success');
}

// Add glyphicons to invalid fields
function invalidFeedback(groupElement){
    $(groupElement).removeClass('has-success');
    $(groupElement).addClass('has-warning');
}

//Remove glyphicons
function removeFeedback(groupElement){
	$(groupElement).removeClass('has-success has-warning');
}

//Clear status
function clearStatus(){
    $('.status').html("");
    hideStatus();
}

function animateSignin(){
    animate($('.signin'));
}

function animateSignUp(){
    animate($('.signup'));   
}

function animate(element){
    element.animate({'margin-left':'32px'},35,function(){
        $(this).animate({'margin-right':'32px'},35,function(){
            $(this).css({'margin':'auto'});
            $(this).animate({'margin-left':'16px'},35,function(){
                $(this).animate({'margin-right':'16px'},35,function(){
                    $(this).css({'margin':'auto'});
                    $(this).animate({'margin-left':'8px'},35,function(){
                        $(this).animate({'margin-right':'8px'},35,function(){
                            $(this).css({'margin':'auto'});
                        });
                    });
                })
            });
        });    
    });
}

//Set status
function setFeedbackText(status){
    $('.status').html("<p>"+status+"</p>");
    if(localStorage.signed){
        animateSignin();
    }
    else animateSignUp();
    showStatus();
}

//Hide status
function hideStatus(){
    $('.status').addClass('hide');   
}

//Show status
function showStatus(){
    $('.status').removeClass('hide');
}