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
        height:size.height 
    }); 
    
    mainWindow.loadURL('file://'+__dirname+'/templates/index.html');
    mainWindow.openDevTools();          


    ipcMain.on('swap',function(event,data){
        mainWindow.loadURL('file://'+__dirname+'/templates/'+data['url']);
    });

    var qData = null;
    ipcMain.on('load',function(event,data){
        qData = data.qData
        if(qData){
            mainWindow.loadURL('file://'+__dirname+'/templates/'+data['url']); 
        }
    });

    ipcMain.on('qdata',function(event, data){
        event.sender.send('qdata',qData);
    });
    
    mainWindow.on('closed',function(){
		    mainWindow = null;
	  });
});

app.on('window-all-closed', function() {
		app.quit();
});
