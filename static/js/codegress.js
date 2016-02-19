const ipcRenderer = require('electron').ipcRenderer;
const remoteSession = require('electron').remote.session;
$(document).ready(function(){
	
	var session = remoteSession.fromPartition('persist:codegress'); 
	session.cookies.get({name:'email'},function(error,cookies){
    	if(cookies.length > 0) $('#header').html(cookies[0].value);
	});

	$('#logout').click(function(event){
		session.cookies.remove('http://codegress.io/','email',function(){
    		ipcRenderer.send('swap',{url:'index.html'});
		});
	});
});