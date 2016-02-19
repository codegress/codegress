const ipcRenderer = require('electron').ipcRenderer;
const $ = jQuery = require('../static/js/libs/jquery');
const remoteSession = require('electron').remote.session;

var session = remoteSession.fromPartition('persist:codegress');  
var host = "http://127.0.0.1:8000/";
var dataToSend = {}; 

function enableSignin(){
    if(localStorage.signed)
        $('.signin').removeClass('hide');
    else
        $('.signup').removeClass('hide');
};

function actualInit(apiRoot){
    var apisToLoad;
    var callback = function(){
        if(--apisToLoad == 0){
            enableSignin();
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
    $('.signup').removeClass('hide');
    $('.signin').addClass('hide');
});

$('#signin').click(function(event){
    event.preventDefault();
    $('.signup').addClass('hide');
    $('.signin').removeClass('hide');
});

$('#forgot').click(function(event){
    event.preventDefault();
    $('.recover').removeClass('hide');
    $('.signin').addClass('hide');
    $('.signup').addClass('hide');
});

$('#signin-form').submit(function(event){
    event.preventDefault();
    var isEmpty = emptyFormFields($(this));
    if(!isEmpty){
        gapi.client.codegress.user.validateAccount(dataToSend).execute(function(resp){
            if(!resp.code && resp.status){
                $('.signup').addClass('hide');
                $('.signin').addClass('hide');
                session.cookies.set({url:'http://codegress.io/',name:'email',value:resp.data[0]},function(error){
                    if(error) console.log(error);
                    else ipcRenderer.send('swap',{'url':'codegress.html'});
                });
            }
            else if(resp.code == 503){
                invalidFeedback($('#email-group'));
                invalidFeedback($('#password-group'));
                $('#status').html('Email / Password is wrong');
                $('#forgot').removeClass('hide');
            }
            else console.log(resp);
        });
    }
});

$('#signup-form').submit(function(event){
    event.preventDefault();
    var isEmpty = emptyFormFields($(this));
    if(!isEmpty){
        gapi.client.codegress.user.createAccount(dataToSend).execute(function(resp){
            if(!resp.code && resp.status){
                $('.signup').addClass('hide');
                $('.signin').removeClass('hide');
                localStorage.signed = true;
            }
            else console.log(resp);
        });
    }
});

$('#recover-form').submit(function(event){
    event.preventDefault();
    emptyFormFields($(this));
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