/* Code mirror editor instance */
var editor = null;

function actualInit(apiRoot){
  var apisToLoad;
    var callback = function(){
        if(--apisToLoad == 0){
            enableEditor();
        }
    };
  apisToLoad = 1;
  gapi.client.load('codegress', 'v1', callback, apiRoot); 
}  

function showEditor(){
  $('.inner-container').removeClass('hide');
}

function enableEditor(){
  showEditor();
  editor = CodeMirror.fromTextArea(
  document.getElementById('editor'), 
  {
    mode:'none',
    lineNumbers:true,
    autofocus:true,
    autoCloseBrackets:true,
  });
  loadCompiler();
}

function loadCompiler(){
  const electron = require('electron');
  const ipcRenderer = electron.ipcRenderer;
  const fileSystem = require('fs');
  const childProcess = require('child_process').spawn;
  var langData = null;

  /* sets language data variable based on selected language */
  $( "#select-lang" ).change(function() {
    
    disableCompileButton("Fetching Data...");
    var selectedLang = $( "#select-lang option:selected" ).val();
    $('.ack').addClass('hide');

    gapi.client.codegress.language.get({'name':selectedLang}).execute(function(resp){
        if(!resp.code){
          langData = resp;
          editor.setOption('mode',langData.mode);
          editor.setOption('value',langData.placeholder);
          enableCompileButton("Compile & Run");
          editor.refresh();
        }
        else console.log(resp);
    });
  });

  function enableCompileButton(text){
    $('#compile-btn').attr({'disabled':false});
    $('#compile-btn').text(text);
  }

  function disableCompileButton(text){
    $('#compile-btn').attr({'disabled':true});
    $('#compile-btn').text(text);
  }

  /* Displays result after compilation and/or execution */
  function acknowledge(data, isError){
    
    var actualOutput = "Start your code here..\n";
    if(!isError && data == actualOutput){
      $('.ack-header').html("Output : ");
      $('.ack-header').addClass('text-success');
      $('.ack-header').removeClass('text-danger');
    }
    else {
      $('.ack-header').html("Error : ");
      $('.ack-header').removeClass('text-danger');
      $('.ack-header').addClass('text-danger');
    }
    // replace newline character ('\n') with html break tag ('<br>')
    var dataNewLines = data.replace(/\r\n|\r|\n/g,'<br>');
    
    $('.ack-body').html(dataNewLines);
    processEnd();
  }

  /* 
    Compiles programs locally (on system) and displays result
  */
  function localCompile(fileName,inputPipe){
    
    processStart();
    var command = langData.compile;
    var out = "", err="";

    var compileProcess = childProcess(command, [fileName],{
      stdio:[inputPipe,'pipe','pipe']
    });

    compileProcess.on('error',function(err){
      console.log(err);
      return;
    });

    compileProcess.stdout.on('data',function(response){
        response = String.fromCharCode.apply(null,response); //changing uint8Array encoding to String
        out += response;
    });

    compileProcess.stderr.on('data',function(response){
        response = String.fromCharCode.apply(null,response);
        err += response;
    });

    compileProcess.on('close',function(code){
      console.log('compilation process exited with '+code);
      if(code == 0 && langData.execute)
        localRun(fileName,inputPipe);
      else if(out){
        acknowledge(out,false);
      }
      else if(err){
        acknowledge(err,true);
      }
    });
  }

  /* 
    Runs programs locally (on system) and displays result
  */
  function localRun(fileName,inputPipe){

    var newFileName = fileName.split(".")[0]; //removing extension from filename
    var command = langData.execute;
    var out = "", err="";

    var executeProcess = childProcess(command,[newFileName],{
        stdio:[inputPipe,'pipe','pipe']
      });
    
    executeProcess.on('error',function(err){
      console.log(err);
      return;
    });

    executeProcess.stdout.on('data',function(response){
      response = String.fromCharCode.apply(null,response); //changing uint8Array encoding to String
      out += response;
    });
    
    executeProcess.stderr.on('data',function(response){
        response = String.fromCharCode.apply(null,response);
        err += response;
    });

    executeProcess.on('close',function(code){
      console.log('execution process exited with '+code);
      if(out){
        acknowledge(out,false);
      }
      else if(err){
        acknowledge(err,true);
      }
    });
  }
  
  /* Decide whether to compile or run program based on the language data */
  function compile(fileName,inputPipe){
      if(langData.name == 'Python' || langData.name == 'Java'){
        localCompile(fileName,inputPipe);
      }
      else alert("Selected language is not available");
  }


  /* Writing data to file on local disk */
  function writeFile(fileName,Data){
    fileSystem.writeFile(fileName,Data,
      function(error){
        if(error){
          alert('Writing data to '+fileName+' failed..');
        }
      });
  }
  
  /* handling html elements behaviour during compilation*/
  function processStart(){
    disableCompileButton("Processing..");
    $('#loading').css({'display':''});
    $('.ack').addClass('hide');
  }
  
  /* handling html elements behaviour after compilation*/
  function processEnd(){
    enableCompileButton("Compile & Run");
    $('#loading').css({'display':'none'});
    $('.ack').removeClass('hide');
    $('body').animate({
      scrollTop: $(".ack-footer").offset().top
    }, 300);
  }
  
  /* returns type of input pipe */
  function getInputPipe(){
    var inputPipe='ignore';
    if($('#custom-input').is(":checked")){
      const input = $('#input').val();
      var inputFile = "input.txt";
        writeFile(inputFile,input);
        if(input) inputPipe = fileSystem.openSync(inputFile,'r');
    }
    return inputPipe;
  }

  /* compilation process starts here.. */
  $('#compile-btn').click(function(){
      if(langData){
        const entry = editor.getValue();
        var fileName = 'random'+langData.ext;
        
        writeFile(fileName,entry);
        
        var inputPipe = getInputPipe();
        if(inputPipe){
          compile(fileName,inputPipe);
        }
      }
      else alert('No language selected');
  });

  /* Disable/Enable custom inputs */
  $('#custom-input').click(function(event){
    if($(this).is(":checked")){
      $(".custom-input").removeClass('hide');
        $('body').animate({
          scrollTop: $("#input").offset().top
        }, 300);
    }
    else{
      $(".custom-input").addClass('hide');
    }
  });
};
