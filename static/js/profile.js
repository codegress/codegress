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