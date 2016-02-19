$(document).ready(function(){
    console.log('Signup');

    $('#signup-btn').click(function(event){
        event.preventDefault(); 
        
        // Store all 'div' children present in the form
        var form = $('#signup-form');
        var formElements = form.children('div');
        var validatedFields = {}

        // If fields are not empty
        if(!emptyFormFields(formElements)){

            // If password is not validated already
            if(!validatedFields['password']){
                var passwordElement = $('#password');
                var currentPassword = passwordElement.val();
                var passwordGroup = passwordElement.parent('div');
                var passwordFeedback = passwordElement.siblings('span');

                // Valid password
                if(isValidPassword(currentPassword)){
                    validFeedback(passwordGroup,passwordFeedback);
                }
                else 
                    invalidFeedback(passwordGroup,passwordFeedback)
            }

            // Marking all validated fields
            formElements.each(function(){
                var feedback = $(this).find('span');
                if(feedback.hasClass('glyphicon-ok')){
                    var field = $(this).children('input');
                    var fieldName= field.attr('name');
                    var fieldValue = field.val();
                    validatedFields[fieldName]=fieldValue;
                }
            });
            
            // Checking whether all the input fields are validated
            if(validatedFields['handle'] && validatedFields['email'] && validatedFields['password']){
                
                var onSuccess = function(response){
                    if(response['handle'] && response['email']){
                        ipcRenderer.send('swap',{url:response['redirect']});
                    }
                    else ipcRenderer.send('swap',{url:""});
                }   
                sendAjaxPost(validatedFields,host+'signup/',onSuccess);
            }
        }
    });

    // Email validation using regular expression
    function isValidEmail(email){
        var regex = /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;
        return regex.test(email);
    }
    
    // Password valid only if its length is equal to 6 characters or more
    function isValidPassword(password){
        var regex = /[a-zA-Z0-9\@\$\#]{6,}/;
        return regex.test(password);
    }

    var recent_handles = {}
    
    // Validate handle 
    $('#handle').on({
        keyup:function(){
            var handle = $(this).val().trim();
            var handleGroup = $(this).parent();
            var handleFeedback = $(this).siblings('span');
            if(handle.length >= 3){
                
                var currentHandle = {'handle' : handle};
                var toURL = host+'signup/check/handle/';
                
                var onSuccess = function(data){
                    if(data['handle']){
                        validFeedback(handleGroup,handleFeedback);
                    }
                    else{
                        invalidFeedback(handleGroup,handleFeedback);
                    }
                };
                sendAjaxGet(currentHandle,toURL,onSuccess);
            }
            else{
                invalidFeedback(handleGroup,handleFeedback);
            }
        }
    });

    $('#email').on({
        blur:function(){
            var email = $(this).val().trim();
            var emailGroup = $(this).parent();
            var emailFeedback = $(this).siblings('span');
            if(isValidEmail(email)){
                var data = {'email' : email};
                var toURL = host+'signup/check/email/';
                var onSuccess = function(data){
                    if(data['email'])
                        validFeedback(emailGroup,emailFeedback);
                    else 
                        invalidFeedback(emailGroup,emailFeedback);
                };
                sendAjaxGet(data,toURL,onSuccess);
            }
            else invalidFeedback(emailGroup,emailFeedback);
        }
    });
});