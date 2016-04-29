const remoteSession = require('electron').remote.session;
var session = remoteSession.fromPartition('persist:codegress'); 
var navbar = `<div class='header'>
	<nav class="navbar navbar-default" role='navigation'> 
	  <div class="container">
	    <div class="navbar-header">
    		<a href="#" class="navbar-brand">
    		<img id="codegress-logo" style="width:35px;" src="../static/images/codegress/codegress-logo.gif" 
    		alt="codegress logo">
    		</a>
	    </div>
	    <div class='navbar-nav navbar-text'>
			<form id='search-challenge' class='hide' role='form'>
				<div class='form-group has-feedback'>
					<span class="glyphicon glyphicon-search form-control-feedback"></span>
					<input type='search' class='form-control' placeholder='Search for challenger' id='domain-search'>
				</div>
			</form>
	    </div>
	    <div class="dropdown navbar-right navbar-text hide">
	    	<div style="margin-right:10px;" data-toggle="dropdown" class="dropdown-toggle handle-image" 
	    		aria-haspopup="true">
	    		<img id="handle-img" src="../static/images/codegress/default-handle-img.png">
	    		<span class="caret"></span>
	    	</div>
	    	<ul class="dropdown-menu">
	    		<li><a class='swap' href='#' id="header"></a></li>
	    		<li class='divider'></li>
	    		<li><a href="#" id="logout">Logout</a></li>
	    	</ul>
	    </div>
	</nav></div>`;
$('body').append(navbar);
session.cookies.get({name:'email'},function(error,cookies){
	if(cookies.length > 0){
		$('#header').html(cookies[0].value);
		$('.dropdown').removeClass('hide');
		$('#search-challenge').removeClass('hide');
		$('.navbar-brand').attr('href','codegress.html');
		$('#header').attr('href','profile.html');
		console.log("HEY THERE,\nDO YOU LIKE WHAT WE ARE DOING?\nTHIS PROJECT IS OPEN SOURCED\nFEEL FREE TO CONTRIBUTE\nhttps://github.com/codegress");
	} 
});

