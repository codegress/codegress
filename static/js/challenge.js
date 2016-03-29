const ipcRenderer = require('electron').ipcRenderer;
var loggedUser = null;
session.cookies.get({name:'email'},function(error,cookies){
	if(cookies.length > 0){
		loggedUser = cookies[0].value;
		$('#header').html(loggedUser); 
	}
});

$('#logout').click(function(event){
	const remoteSession = require('electron').remote.session;
	var session = remoteSession.fromPartition('persist:codegress'); 
	session.cookies.remove('http://codegress.io/','email',function(){
		ipcRenderer.send('swap',{url:'index.html'});
	});
});

/* Requesting Challenge data */
ipcRenderer.send('qdata');
ipcRenderer.on('qdata',function(event, data){
	updateChallenge(data);
});

function updateChallenge(data){
	$('.challenger').html(loggedUser);
	$('.challenger').append("<span class='text-danger'> VS </span>");
	$('.challenger').append(data.selected_challenger);
	$('.question> .domain').html(data.question_domain);
	$('.question > .title').html(data.question_title);
	$('.question > .text').html(data.question_text);
}

$('#notes-form').submit(function(event){
	event.preventDefault();
	var noteParent = $(this).children('div');
	var note = noteParent.children('textarea').val();
	if(note) console.log(note);
});
