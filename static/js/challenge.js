const fileSystem = require('fs');
var fileContentOne = fileSystem.readFileSync(__dirname+'/index.html');
var fileContentTwo = fileSystem.readFileSync(__dirname+'/index.html');
fileContentOne = String.fromCharCode.apply(null, fileContentOne);
fileContentTwo = String.fromCharCode.apply(null, fileContentTwo);
var oneArray = fileContentOne.split(/\n/);
var twoArray = fileContentTwo.split(/\n/);
var countEqual = 0, countUnequal = 0;
for(var index = 0;index < oneArray.length;index++){
	(oneArray[index] === twoArray[index]) ? ++countEqual : ++countUnequal;
}
console.log(countEqual+'\n'+countUnequal);