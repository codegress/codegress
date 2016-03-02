const ipcRenderer = require('electron').ipcRenderer;
const $ = jQuery = require('../static/js/libs/jquery');
const remoteSession = require('electron').remote.session;

var session = remoteSession.fromPartition('persist:codegress');  
var dataToSend = {}; 

function enableForm(){
    if(localStorage.signed)
        showSigninForm();
    else
        showSignupForm();
};

function actualInit(apiRoot){ 
    var apisToLoad;
    var callback = function(){
        if(--apisToLoad == 0){
            enableForm();
        }
    };
    apisToLoad = 1;
    gapi.client.load('codegress', 'v1', callback, apiRoot);
};

// swapping pages using IPC protocol
$('.swap').click(function(event){
	event.preventDefault();
	var htmlPage = $(this).attr('href');
    ipcRenderer.send('swap',{'url':htmlPage});
});

$('#signup').click(function(event){
    event.preventDefault();
    showSignupForm();
    clearStatus();
});

$('#signin').click(function(event){
    event.preventDefault();
    showSigninForm();
    clearStatus();
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
            else if(resp.code == 503){
                enableSigninButton("Sign In");
                invalidFeedback($('#signin-email-group'));
                invalidFeedback($('#signin-password-group'));
                setStatus("Email / Username not registered yet.");
            }
            else if(data.indexOf("password") != -1){
                enableSigninButton("Sign In");
                invalidFeedback($('#signin-password-group'));
                setStatus("Password didn't match");
                clearPasswordField();
                if(++failedAttempts >= 2){
                    showForgotPassword();
                }
            }
        });
    }
    else setStatus("All fields are required");
});

$('#signup-form').submit(function(event){
    event.preventDefault();
    var isEmpty = emptyFormFields($(this));
    clearStatus();
    if(!isEmpty){
        gapi.client.codegress.user.createAccount(dataToSend).execute(function(resp){
            if(!resp.code && resp.status){
                localStorage.signed = true;
                hideSigninForm();
                showSignupForm();
            }
            else if(!resp.status){
                var data = resp.data;
                if(data.indexOf("username") != -1){
                    invalidFeedback('#signup-username-group');
                    setStatus("Username already taken");
                }
                if(data.indexOf("email") != -1){
                    invalidFeedback('#signup-email-group');
                    setStatus("Email already taken");
                }
            }
            else console.log(resp);
        });
    }
    else setStatus("All are required fields!");
});

$('#recover-form').submit(function(event){
    event.preventDefault();
    var isEmpty = emptyFormFields($(this));
    if(!isEmpty){

    }
    else setStatus("Enter registered email");
});

// Check if text fields are empty and add appropriate glyphicons
function emptyFormFields(form){
    var empty = false;
    // clearStatus();
    // hideForgotPassword();
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

//Set status
function setStatus(status){
    $('.status').html("<p>"+status+"</p>");
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