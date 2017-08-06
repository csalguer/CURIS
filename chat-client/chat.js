var accessToken = "b55278df9fd8448aa8be3d804d80209d";
var baseUrl = "https://api.api.ai/v1/";
var Auth = firebase.auth();
var Database = firebase.database();
var message_side = 'right';
var currentSession;
var login_form = $('#login_form'),
    signin_btn = $('#signin')
    user_first_name = $('#user_fname'),
    user_last_name = $('#user_lname'),
    user_email = $('#user_email'),
    chat_window = $('.chat_window'),
    login_window = $('.login_window'),
    msg_template = $('.message_template'),
    msg_list = $('.messages'),
    msg_input = $('.message_input'),
    send_msg_btn = $('.send_message')


class Message {
    constructor(text, message_side){
      if(typeof text === 'undefined' || text === null){
        this.isCurrentlyTyping = true;
      } else{
        this.isCurrentlyTyping = false;
      }
      this.text = text;
      this.message_side = message_side;
    }


    draw(){
        let templateClone = msg_template.clone().html();
        let msg_elem = $(templateClone);
        msg_elem.addClass(this.message_side).find('.text').html(this.isCurrentlyTyping ? '' : this.text);
        if(this.isCurrentlyTyping && this.message_side === 'left'){
          msg_elem.find('.texting_indicator').addClass('appeared').show();
        } 
        msg_list.append(msg_elem);
        return setTimeout(function() {
          return msg_elem.addClass('appeared');
        }, 0); // Consider adding a consistent time for bot responses to look less immediate
    }

    toString(){
      return `TypingIndic: ${this.isCurrentlyTyping}, Text: ${this.text}, Side: ${this.message_side}`;
    }
}


/*
 * To be executed upon complete loading of resources and DOM element creation
 */
$(document).ready(function() {
    // launchWelcomeIntent();
    login_form.on('submit', function(event) {
      signInHandler();
      event.preventDefault();
    });
    msg_input.keyup(function(event) {
      if (event.which == 13) {
        event.preventDefault();
        var user_input = getUserInput();
        setTimeout(addTextToChatHistory(user_input, false), 300);
        setUserInput('');
        sendAndUpdateChat(user_input);
      }
    });
    send_msg_btn.click(function(event) {
      var user_input = getUserInput();
      setTimeout(addTextToChatHistory(user_input, false), 300);
      setUserInput('');
      sendAndUpdateChat(user_input);
    });
});


const signInHandler = () => {
  console.log('signInHandler');
  let first_name = $.trim(user_fname.val());
  let last_name = $.trim(user_lname.val());
  if(first_name < 1){ alert('First name must be longer than 1 character'); return;}
  if(last_name < 1){ alert('Last name must be longer than 1 character'); return;}
  let email = user_email.val();
  let pass = last_name.toLowerCase() + first_name.toLowerCase() + email.split('@')[0];
  let user = {
    name: first_name,
    surname: last_name,
    email: email
  };
  Auth.signInWithEmailAndPassword(email, pass)
  .then(function(user){
    console.log('User successfully created')
    switchToChatUI();
  }).catch(function(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    // [START_EXCLUDE]
    if (errorCode === 'auth/wrong-password') {
      alert('Wrong password.');
    } else if (errorCode === 'auth/user-not-found') {
      createWrapper(user, pass); //Might have to rework code-example since promise based
      return;
    } else {
      alert(errorMessage);
    }
    console.log(error);
    document.getElementById('quickstart-sign-in').disabled = false;
  });
};

const createUserWrapper = (userObj, pass) => {
  Auth.createUserWithEmailAndPassword(userObj.email, pass)
  .then(function(user){
    switchToChatUI();
  }).catch(function(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    if (errorCode == 'auth/weak-password') {
      alert('The password is too weak.');
    } else {
      alert(errorMessage);
    }
    console.log(error);
  });
};


const switchToChatUI = () => {
  login_window.hide();
  chat_window.show();
};

const initClientApp = () => {
  if(Auth.currentUser) {
    Auth().signOut();
  }
};

const getUserInput = () => {
    return msg_input.val()
};
const setUserInput = text => {
    msg_input.val(text);
};

const toggleIndicatorAndDisplayIncoming = text => {
  let lastMessageSent = msg_list.children().last();
  lastMessageSent.find('.text').html(text);
  lastMessageSent.find('.typing_indicator').hide();
};

const addTextToChatHistory = (text , replacesLastTextVal) => {
  if(replacesLastTextVal){
    // INDICATOR HIDE
    return toggleIndicatorAndDisplayIncoming(text);
  }
  // if(text.trim() === ''){
  //     return;
  // }
  message_side = message_side === 'left' ? 'right' : 'left';
  let messageObj = new Message(text, message_side);
  console.log(messageObj);
  messageObj.draw();
  return msg_list.animate({
      scrollTop: msg_list.prop('scrollHeight')
  }, 300);
};


function sendAndUpdateChat(text) {
    $.ajax({
        type: "POST",
        url: baseUrl + "query?v=20150910",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + accessToken
        },
        data: JSON.stringify({ query: text, lang: "en", sessionId: "somerandomthing" }),
        beforeSend: function() {
          addTextToChatHistory(null, false);
        },
        success: function(data) {
            //Add incoming text result to messages list
            var chatbot_response = data.result.fulfillment.speech;
            console.log("Agent Responded: " + chatbot_response);
            addTextToChatHistory(chatbot_response, true);
        },
        error: function() {
            //Add appropriate error message if failed
            addTextToChatHistory("Internal Server Error", true);
        }
    });
    // setResponse("Loading...");
}

// const animateResponseIsBeingTyped = _ => {
  

// }

const uuidv4 = _ => {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

function launchWelcomeIntent(){
  // JSON Format for events via POST :
  // 'event':{ 'name': 'custom_event', 'data': {'name': 'Sam'}}


  // Instantiate sessionId for converstation
  // TODO: Ask for user's name/info + save sessionId to firebase
  currentSession = uuidv4();
  $.ajax({
    type: "POST",
    url: baseUrl + "query?v=20150910",
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    headers: {
        "Authorization": "Bearer " + accessToken
    },
    data: JSON.stringify({event: { name: 'WELCOME'}, lang: "en", sessionId: "somerandomthing"}),
    beforeSend: function() {
      addTextToChatHistory(null, false);
    },
    success: function(data) {
        //Add incoming text result to messages list
        var chatbot_response = data.result.fulfillment.speech;
        console.log("Agent Responded: " + chatbot_response);
        addTextToChatHistory(chatbot_response, true);
    },
    error: function() {
        //Add appropriate error message if failed
        addTextToChatHistory("Internal Server Error", true);
    }
  });
}