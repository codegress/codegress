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
  const remoteSession = electron.remote.session;
  const fileSystem = require('fs');
  const childProcess = require('child_process').spawn;
  var languageData = null, isCompiled = false, testCaseData = null, qDomain = null;
  var inputPipes = [], outputData = [], inputData = [];
  var testCaseResponse = {};  
  var session = remoteSession.fromPartition('persist:codegress');  

  ipcRenderer.send('qdata',{});
  
  ipcRenderer.on('qdata',function(event,data){
    qDomain = data.question_domain;
    qTitle = data.question_title;
    qText = data.question_text;
    displayQuestion(qTitle, qText);
    getTestCaseData(qTitle);
  });

  function displayQuestion(qTitle, qText){
    $('#q-title').text(qTitle);
    $('#q-text').text(qText);
  }

  function getTestCaseData(qTitle){
    gapi.client.codegress.testcase.getTestcase({'name':qTitle}).execute(function(response){
      if(!response.code){
        testCaseData = response.cases;
      }
    });
  }    

  /* sets language data variable based on selected language */
  $( "#select-lang" ).change(function() {
    disableCompileButton("Fetching Data...");
    var selectedLang = $( "#select-lang option:selected" ).val();
    $('.ack').addClass('hide');
    gapi.client.codegress.language.getLanguage({'name':selectedLang}).execute(function(response){
        if(!response.code){
          languageData = response.items[0];
          editor.setOption('mode',languageData.mode);
          editor.setOption('value',languageData.placeholder);
          editor.refresh();
          enableCompileButton("Compile & Run");
        }
        else console.log(response);
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

  function appendElement(listElement, className){
    listElement.className = className;
    $('.ack').append(listElement);
  }

  function success(headerText, bodyText){
      var listElement = createElement(headerText, bodyText);
      appendElement(listElement,'panel panel-success');
  }

  function error(headerText, bodyText){
      var listElement = createElement(headerText, bodyText);
      appendElement(listElement,'panel panel-danger');
  }

  function createElement(headerText, bodyText){
    var listElement = document.createElement('li');
    var listHeader = document.createElement('div');
    var listBody = document.createElement('div');
    
    listHeader.className = 'panel-heading';
    listHeader.innerHTML = headerText;
    
    listBody.className = 'panel-body';
    listBody.innerHTML = bodyText;
    
    listElement.appendChild(listHeader);
    listElement.appendChild(listBody);
    return listElement;
  }

  var testCasePassed = 0;
  function acknowledge(data, isError){
    data = escapeHTML(data);
    var formattedData = data.replace(/\r\n|\r|\n/g,'<br>');
    if(isError && !hasCustomInput()){
        error("Error : ",formattedData);
    }
    else {
      var headerText = "Custom Output : ";
      if(!hasCustomInput()) 
        headerText = "Success : ";
      success(headerText,formattedData);
      ++testCasePassed;
      console.log(testCasePassed);
    }
  }

  function escapeHTML(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  }

  function clearAcknowledge(){
    $('.ack').html('');
  }

  /*Interprets the code for python*/
  function pythonCompile(fileName, command){
    testCaseRunner(fileName, command);
  }

  /*compiles the code for java*/
  function javaCompile(fileName, command){
    
    processStart();
    var out = "", err="";

    var compileProcess = childProcess(command, [fileName],{
      stdio:['ignore','pipe','pipe']
    });

    compileProcess.on('error',function(err){
      console.log(err);
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
      if(code == 0){
        var newFileName = fileName.split(".")[0]; //removing extension from filename
        testCaseRunner(newFileName, languageData.execute);
      }
      else if(err){
        acknowledge(err,true,"Syntax Error");
        processEnd();
      }
    });
  }

  /*runs the code against given test case input and acknowledges output*/
  function genericRunner(fileName, command, inputPipe,actualOutput){
    var out = "", err = "";
    if(!inputPipe) return;
    var genericProcess = childProcess(command, [fileName],{
      stdio:[inputPipe, 'pipe','pipe']
    });

    genericProcess.on('error',function(err){
      console.log(err);
    });

    genericProcess.stdout.on('data',function(response){
      response = String.fromCharCode.apply(null,response); //changing uint8Array encoding to String
        out += response;
    });

    genericProcess.stderr.on('data',function(response){
      response = String.fromCharCode.apply(null,response);
        err += response;
    });

    genericProcess.on('close',function(code){
      console.log('runner process exited with '+code);
      if(err){
        acknowledge(err, true);
      }
      else if(actualOutput){
        var outputString = 'Output : '+actualOutput+'\nYour output : '+out;
        if(out.replace(/\n\r|\n/,'') == actualOutput){
          acknowledge(outputString, false); 
        }
        else{
          acknowledge(outputString, true); 
        }
      }
      else acknowledge(out, false);
      fileSystem.closeSync(inputPipe);
    });
  }

  /* Runs the code against pre-defined test cases*/
  function testCaseRunner(fileName, command){
    index = 0;
    if(hasCustomInput()){
      var inputPipe = getCustomPipe();
      genericRunner(fileName, command, inputPipe);
    }
    else if(inputPipes.length > 0){
      for(var index = 0; index < inputPipes.length;index++){
          var currentInputPipe = inputPipes[index];
          var actualOutput = outputData[index];
          genericRunner(fileName, command, currentInputPipe, actualOutput);
      }
    }
    else genericRunner(fileName, command,'pipe');
    processEnd();
  }

  /* Starting compilation process based on selected language */
  function compile(fileName){
      if(languageData.name == 'Python'){
        pythonCompile(fileName,languageData.compile);
      }
      else if(languageData.name == 'Java'){
        javaCompile(fileName,languageData.compile);
      }
      else alert("Selected language is not available");
  }


  /* Writing data to file on local disk */
  function writeFile(fileName,Data){
    var hasError = false;
    fileSystem.writeFile(fileName, Data,
      function(error){
        if(error){
          alert('Writing data to '+fileName+' failed..');
          hasError = true;
        }
      });
    return !hasError;
  }
  
  /* handling html elements behaviour during compilation*/
  function processStart(){
    disableCompileButton("Processing..");
    $('#loading').css({'display':''});
    hideAcknowledge();
    testCasePassed = 0;
  }
  
  /* handling html elements behaviour after compilation*/
  function processEnd(){
    enableCompileButton("Compile & Run");
    $('#loading').css({'display':'none'});
    showAcknowledge();
    scrollToBottom();
    // submitCode();
  }

  function showAcknowledge(){
    $('.ack').removeClass('hide');
  }

  function hideAcknowledge(){
    $('.ack').addClass('hide');
  }

  function submitCode(){
    var user = null;
    if(testCasePassed == testCaseData.length){
      session.cookies.get({name:'email'},function(error,cookies){
        if(cookies.length > 0) {
          user = cookies[0].value;
        }
      });
    }
    if(user != null){
      gapi.client.codegress.submission.addSubmission(
        {
          ques_title:qTitle,
          submission_text:editor.getValue(),
          submitted_user:user
        }
          ).execute(function(response){
          if(!response.code){
            console.log('Submission saved');
          }
          else console.log(response);
        });
    }
    else console.log('Cannot get submitted user');
  }

  function scrollToBottom(){
    $('body').animate({
      scrollTop: $(".ack-footer").offset().top
    }, 800);
  }
  
  function freePipes(){
    if(inputPipes.length > 0){
      for(var i = 0; i < inputPipes.length;i++){
        fileSystem.closeSync(inputPipes[i]);
      }
      return true;
    }
    return false;
  }

  function getPipesReady(){
    if(testCaseData != null){
      for(var i = 0; i < testCaseData.length;i++){
        var currentInputData = testCaseData[i].test_in;
        testCaseResponse[currentInputData] = false;
        var inputFile = "input"+(i+1)+".txt";
        inputPipes[i] = getInputPipe(inputFile, currentInputData);
        inputData[i] = currentInputData;
        outputData[i] = testCaseData[i].test_out;
      }
    }
  }

  /* returns type of input pipe */
  function getInputPipe(inputFile, inputData){
    var inputPipe = 'ignore';
    if(inputFile){
      writeFile(inputFile, inputData);
      inputPipe = fileSystem.openSync(inputFile,'r');
    }
    return inputPipe;
  }

  function hasCustomInput(){
    return $('#custom-input').is(":checked");
  }

  function getCustomData(){
    return $('#input').val();
  }

  function getCustomPipe(){
    if(hasCustomInput()){
      var inputFile = "input.txt";
      var customData = getCustomData();
      return getInputPipe(inputFile, customData);
    }
  }

  /* Compilation process starts here.. */
  $('#compile-btn').click(function(){
      clearAcknowledge();
      if(languageData && (testCaseData || hasCustomInput())){
        const entry = editor.getValue();
        var fileName = 'random'+languageData.ext;
        writeFile(fileName,entry);
        if(!hasCustomInput()){
          getPipesReady();
        }
        compile(fileName);
      }
      else alert('No testcase available, use custom cases');
  });

  /* Disable/Enable custom inputs */
  $('#custom-input').click(function(event){
    if($(this).is(":checked")){
      $(".custom-input").removeClass('hide');
        $('body').animate({
          scrollTop: $("#input").offset().top
        }, 500);
    }
    else{
      $(".custom-input").addClass('hide');
    }
  });
};