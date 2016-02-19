const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
var mainWindow = null;

app.on('ready',function(){
    const ipcMain = electron.ipcMain;
    const electronScreen = electron.screen;
    var size = electronScreen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width:size.width,
        height:size.height,
        // icon:'./static/images/codegress/logo.png', 
    }); 
    
    mainWindow.loadURL('file://'+__dirname+'/templates/compiler.html');
    // mainWindow.openDevTools();

    ipcMain.on('swap',function(event,data){
        mainWindow.loadURL('file://'+__dirname+'/templates/'+data['url']);
    });
    
    mainWindow.on('closed',function(){
		    mainWindow = null;
	  });
});

app.on('window-all-closed', function() {
		app.quit();
});
