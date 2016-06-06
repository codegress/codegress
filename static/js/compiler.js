/* 
    Code mirror editor instance 
*/
var editor = null;

/* 
    Loads endpoints API and creates editor 
*/
function actualInit(apiRoot){   
  var apisToLoad;
  var callback = function(){
      if(--apisToLoad == 0){
          createEditor();
      } 
  };
  apisToLoad = 1; 
  gapi.client.load('codegress', 'v1', callback, apiRoot); 
}  

/* 
  Shows hidden editor 
*/
function showEditor(){
  $('body').removeClass('hide'); 
}

/*
  Creates codemirror editor on fly
*/
function createEditor(){
  editor = CodeMirror.fromTextArea(
  document.getElementById('editor'), 
  {
    mode:'none',
    autoCloseBrackets:true,
  });
  loadCompiler();
}

function loadCompiler(){
  
  /* Importing required node modules */
  const electron = require('electron');
  const ipcRenderer = electron.ipcRenderer;
  const remoteSession = electron.remote.session;
  const fileSystem = require('fs');
  const childProcess = require('child_process').spawn;
  var session = remoteSession.fromPartition('persist:codegress');

  /* Required globals */
  var languageData = null, isCompiled = false, testCaseData = null, qDomain = null;
  var inputPipes = [], outputData = [], inputData = [];
  var testCaseResponse = {}, timer = null, loggedUser = null, numberOfPoints = 0;
  var qDomain = null, qTitle = null, qText = null;

  /* Clearing localStorage on window load */
  localStorage.clear();
  localStorage.setItem('signed',true);

  session.cookies.get({name:'email'},function(error,cookies){
      if(cookies.length > 0) {
        loggedUser = cookies[0].value;
      }
      else console.log("User not logged");
  });

  /* Requesting question data from main process */
  ipcRenderer.send('qdata',{});
  
  var submissionData = null;
  /* Saving response of the main process */
  ipcRenderer.on('qdata',function(event, data){
    qDomain = data.domain;
    qTitle = data.title;
    qText = data.text;
    if(data.datetime){
      gapi.client.codegress.challenge.getSubmission({username:loggedUser, datetime:data.datetime}).execute(function(resp){
          if(!resp.code && resp.items){
            submissionData = resp.items[0];
          }
      });
    }
    displayQuestion();
    getTestCaseData();
    showEditor();
  });

  function loadSubmission(){
    var lang = submissionData.language;
    qText = submissionData.ques.text;
    var langData = null;
    gapi.client.codegress.language.getLanguage({name:lang}).execute(function(resp){
      if(!resp.code && resp.items){
        langData = resp.items[0];
        $('#select-lang').val(lang);
        editor.setOption('mode',langData.mode);
        editor.setOption('value',submissionData.submission);
        enableCompileButton("Compile & Run");   
      }
    });
  }

  /* Displays question */
  function displayQuestion(){
    $('#q-title').text(qTitle);
    $('#q-text').text(qText); 
  }

  /* Requesting test cases for current selected question */
  function getTestCaseData(){
    gapi.client.codegress.question.getTestCases({'title':qTitle}).execute(function(response){
      if(!response.code){
        testCaseData = response.items;
      }
    });
  }    

  /* Autosaving when the selected language is about to change */
  $("#select-lang").mousedown(function(){
    if(editor.getValue()){
        autoSave();
      }
  });

  /* Requests background data based on selected language */
  $("#select-lang" ).change(function() {
    hideAcknowledge();
    var selectedLang = getSelectedLanguage();
    var localData = getLocalData(selectedLang);
    if(submissionData != null && submissionData.language === selectedLang){
      loadSubmission();
    }
    else if(localData && localData.lang){
      languageData = JSON.parse(localData.lang);
      editor.setOption('mode',languageData.mode);
      editor.setOption('value',languageData.placeholder);   
      enableCompileButton("Compile & Run");
    }
    else{
      disableCompileButton("Fetching Data...");
      gapi.client.codegress.language.getLanguage({
          'name':selectedLang
        }).execute(function(response){
          if(!response.code && response.items){
            languageData = response.items[0];
            editor.setOption('mode',languageData.mode);
            editor.setOption('value',languageData.placeholder);
            localStorage.setItem(selectedLang,JSON.stringify(
              {
                lang:JSON.stringify(languageData)
            }));
            enableCompileButton("Compile & Run");
          }
          else console.log(response);
        });
      }
      editor.setOption('lineNumbers',true);
  });

  function getLocalData(selectedLang){
    return JSON.parse(localStorage.getItem(selectedLang));
  }

  function getSelectedLanguage(){
    return $("#select-lang option:selected" ).val();
  }

  function enableCompileButton(text){
    $('#compile-btn').attr({'disabled':false});
    $('#compile-btn').text(text);
  }

  function disableCompileButton(text){
    $('#compile-btn').attr({'disabled':true});
    $('#compile-btn').text(text);
  }

  function appendElement(listElement){
    $('.ack').append(listElement);
  }

  /* Display success testcase */
  function success(headerText, bodyText){
      var listElement = createElement(headerText, bodyText, true);
      appendElement(listElement);
  }

  /* Display error or failed testcase */
  function error(headerText, bodyText){
      var listElement = createElement(headerText, bodyText, false);
      appendElement(listElement);
  }

  /* Creating new list element */
  function createElement(headerText, bodyText, isSuccess){
    var listElement = document.createElement('li');
    var subList = document.createElement('ul');
    var subListElementOne = document.createElement('li');
    var subListElementTwo = document.createElement('li');
    var subListElementThree = document.createElement('li');
    subList.className = 'list-inline';
    
    var header = document.createElement('span');
    header.innerHTML = headerText;

    var body = document.createElement('div');
    body.className = 'testcase-body';

    var glyphicon = document.createElement('span');
    if(isSuccess){
      glyphicon.className = 'glyphicon glyphicon-ok';
      subListElementTwo.className = 'text-success';
    }
    else{
      glyphicon.className = 'glyphicon glyphicon-remove';
      subListElementTwo.className = 'text-danger';
    }

    subListElementOne.appendChild(header);
    subListElementOne.className = 'toggle-testcase';
    subListElementTwo.appendChild(glyphicon);
    

    subList.appendChild(subListElementOne);
    subList.appendChild(subListElementTwo);
    
    if(!isSuccess || hasCustomInput()){
      body.innerHTML = bodyText;
      subListElementThree.appendChild(body);
      subList.appendChild(subListElementThree);
    }

    listElement.appendChild(subList); 
    return listElement;
  }

  /* Displaying the result */
  var testCasePassed = 0;
  function acknowledge(data, isError){
    data = escapeHTML(data);
    var formattedData = data.replace(/\r\n|\r|\n/g,'<br>');
    if(isError && !hasCustomInput()){
        error("Error ",formattedData);
    }
    else {
      var headerText = "";
      if(!hasCustomInput()) 
        headerText = "Success ";
        success(headerText,formattedData);
        ++testCasePassed;
        if(testCasePassed === testCaseData.length){
          submitCode(testCasePassed);
        }
    }
  }

  /* Escapes HTML tags */
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

  /* Interprets the code for python */
  function pythonCompile(fileName, command){
    testCaseRunner(fileName, command);
  }

  /* Compiles the code for java */
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
      else console.log(code);
    });
  }

  /* Runs the code against given test case input and acknowledges output */
  function genericRunner(fileName, command, inputPipe, actualOutput){
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
        var outputString = actualOutput+' == '+out;
        if(out.replace(/\n\r|\n/,'') == actualOutput){
          acknowledge(outputString, false); 
        }
        else{
          acknowledge(outputString, true); 
        }
      }
      else acknowledge(out, false);
      fileSystem.closeSync(inputPipe);  //closing inputPipe
    });
  }

  /* Runs the code against test cases */
  function testCaseRunner(fileName, command){
    var numberOfPoints = 0;
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
        pythonCompile(fileName, languageData.compile);
      }
      else if(languageData.name == 'Java'){
        javaCompile(fileName, languageData.compile);
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
  
  /* Handling html elements behaviour during compilation */
  function processStart(){  
    disableCompileButton("Processing..");
    $('#loading').css({'display':''});
    hideAcknowledge();
    testCasePassed = 0;
  }
  
  /* Handling html elements behaviour after compilation */
  function processEnd(){
    enableCompileButton("Compile & Run");
    $('#loading').css({'display':'none'});
    showAcknowledge();
  }

  function showAcknowledge(){
    $('.ack').removeClass('hide');
  }

  function hideAcknowledge(){
    $('.ack').addClass('hide');
  }

  function submitCode(testCasePassed){
      gapi.client.codegress.challenge.addSubmission({
      ques:{title:qTitle,domain:qDomain},
      submission:editor.getValue(),
      username:loggedUser,
      language:getSelectedLanguage(),
      points:parseFloat(testCasePassed/testCaseData.length)*100
      }).execute(function(response){
        if(!response.code){
          console.log('Submission saved');
        }
        else console.log(response);
    });
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
        inputPipes[i] = getPipe(inputFile, currentInputData);
        inputData[i] = currentInputData;
        outputData[i] = testCaseData[i].test_out;
      }
    }
  }

  /* Returns type of input pipe */
  function getPipe(inputFile, inputData){
    var inputPipe = 'ignore';
    if(inputFile && inputData){
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
      return getPipe(inputFile, customData);
    }
  }

  function newTestCase(){
    var newInputPipe = 'ignore', newOutputPipe = 'ignore';
    if(testCaseData != null){
      var inputFile = "input.txt";
      var outputFile = "actual_output.txt";
      newInputPipe = getPipe(inputFile, testCaseData[0].test_in);
      newOutputPipe = getPipe(outputFile, testCaseData[0].test_out);
    }
    else console.log("No Testcases Found");
  }

  /* Compilation process starts here.. */
  $('#compile-btn').click(function(){
      clearAcknowledge();
      if(languageData && (testCaseData || hasCustomInput())){
        const entry = editor.getValue();
        var fileName = 'random'+languageData.ext;
        writeFile(fileName,entry);

        // Custom Input Pipes
        if(!hasCustomInput()){
          getPipesReady();
        }

        autoSave();
        compile(fileName);
      
      }
      else alert('Use custom testcase');
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

  function autoSave(){
    var selectedLang = getSelectedLanguage();
    var localData = getLocalData(selectedLang);
    if(localData && localData.lang){
      localData.lang = JSON.parse(localData.lang);
      localData["lang"]["placeholder"] = editor.getValue();
      localData.lang = JSON.stringify(localData["lang"]);
      localData = JSON.stringify(localData);
      localStorage.setItem(selectedLang, localData);
    }
  }

  function autoSaveTimer(){
    $('#auto-save-time').text(new Date());
    var callback = function(){
      var selectedLang = getSelectedLanguage();
      var localData = getLocalData(selectedLang);
      if(localData && localData.lang){
        localData.lang = JSON.parse(localData.lang);
        localData["lang"]["placeholder"] = editor.getValue();
        localData.lang = JSON.stringify(localData["lang"]);
        localData = JSON.stringify(localData);
        localStorage.setItem(selectedLang, localData);
      }
      $('#auto-save-text').show(1000,function(){
        $(this).text("AUTOSAVED");
        $(this).attr('title',new Date());
        $(this).fadeOut(10000,function(){})
      });
    };
    callback();
    timer = setInterval(callback, 5000);
  }
};