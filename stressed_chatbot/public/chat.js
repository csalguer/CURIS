var accessToken = "b55278df9fd8448aa8be3d804d80209d";
var baseUrl = "https://api.api.ai/v1/";
// var Database = firebase.database();
var message_side = 'right';
var WELCOME_INTENT = 'WELCOME'
var max_num_sessions = 3;
var curr_session;

class Message {
    constructor(text, message_side) {
        if (typeof text === 'undefined' || text === null) {
            this.isCurrentlyTyping = true;
        } else {
            this.isCurrentlyTyping = false;
        }
        this.text = text;
        this.message_side = message_side;
    }


    draw() {
        let templateClone = $('.message_template').clone().html();
        let msg_elem = $(templateClone);
        msg_elem.addClass(this.message_side).find('.text').html(this.isCurrentlyTyping ? '' : this.text);
        if (this.isCurrentlyTyping && this.message_side === 'left') {
            msg_elem.find('.texting_indicator').addClass('appeared').show();
        }
        $('.messages').append(msg_elem);
        return setTimeout(function() {
            return msg_elem.addClass('appeared');
        }, 0); // Consider adding a consistent time for bot responses to look less immediate
    }

    toString() {
        return `TypingIndic: ${this.isCurrentlyTyping}, Text: ${this.text}, Side: ${this.message_side}`;
    }
}


/*
 * To be executed upon complete loading of resources and DOM element creation
 */
$(document).ready(function() {
    // launchWelcomeIntent();
    // $(document).on("click", "#signin", function(){
    //   signInHandler();
    // });

    // Handle User Login for 3-Day studies
    $('#login_form').on('submit', function(event) {
        event.preventDefault();
        switchToLoadingScreen();
        signInHandler();
    });
    $('#signin').click(function(event) {
        event.preventDefault();
        switchToLoadingScreen();
        signInHandler();
    });
    $('#user_email').keyup(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            switchToLoadingScreen();
            signInHandler();
        }
    });

    // Handle Chat UI interactions
    $('.message_input').keyup(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            var user_input = getUserInput();
            setTimeout(addTextToChatHistory(user_input, false), 300);
            setUserInput('');
            sendAndUpdateChat(user_input);
        }
    });
    $('.send_message').click(function(event) {
        var user_input = getUserInput();
        setTimeout(addTextToChatHistory(user_input, false), 300);
        setUserInput('');
        sendAndUpdateChat(user_input);
    });
});


const signInHandler = () => {
    console.log('signInHandler');
    let first_name = $('#user_fname').val();
    let last_name = $('#user_lname').val();
    if (first_name < 1) { alert('First name must be longer than 1 character'); return; }
    if (last_name < 1) { alert('Last name must be longer than 1 character'); return; }
    let email = $('#user_email').val();
    let pass = last_name.toLowerCase() + first_name.toLowerCase() + email.split('@')[0];
    let userObj = {
        name: first_name,
        surname: last_name,
        email: email
    };
    console.log(userObj);
    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(function(user) {
            console.log('User successfully signed in');
            userObj.uid = user.uid;
            let returnCheck = checkIfFinishedMoreThanMaxNumSessions(userObj);
            console.log(returnCheck);
        }).catch(function(error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode === 'auth/wrong-password') {
                alert('Wrong password.');
                switchToLoginScreen();
            } else if (errorCode === 'auth/user-not-found') {
                createUserHandler(userObj, pass); //Might have to rework code-example since promise based
                return;
            } else {
                alert(errorMessage);
            }
            console.log(error);
        });
};

const createUserHandler = (userObj, pass) => {
    firebase.auth().createUserWithEmailAndPassword(userObj.email, pass)
        .then(function(user) {
            console.log('User successfully created: ' + user.uid);
            userObj.uid = user.uid;
            return setTimeout(switchToChatUI(true, userObj), 4500);
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


const checkIfFinishedMoreThanMaxNumSessions = userObj => {
    console.log('Checking if n # of sessions already complete...');
    const usersRef = firebase.database().ref().child('users/' + userObj.uid);
    usersRef
        .once('value')
        .then(snap => {
            if (snap.exists()) {
                let data = snap.val();
                console.log(data.chat_sessions);
                let convo_sessions = Object.keys(data.chat_sessions)
                if(convo_sessions.length >= max_num_sessions) {
                    return switchToLockoutScreen();
                }
                return setTimeout(switchToChatUI(false, userObj), 4500);
            }
            return switchToErrorScreen();
        }).catch(error => {
            console.log(error);
            return switchToErrorScreen();
        });
};


const addToStudyParticipantsList = (userObj, first_session) => {
    const usersRef = firebase.database().ref().child('users');
    console.log('Attempting to set data to DB using object instead.');
    // To use a variable as a named property, must be set using Array notation!
    let data = { chat_sessions: {} };
    data.chat_sessions[first_session] = false;
    console.log('Object\'s data as string value: ', JSON.stringify(data));
    usersRef.child(userObj.uid).set(data);
};


const addNewChatSessionToConversationsList = session_id => {
    const chatdialoguesRef = firebase.database().ref().child('chat_dialogues');
    let data = {};
    data[session_id] = { dialogue: [] };
    console.log('Object\'s data as string value: ', JSON.stringify(data));
    chatdialoguesRef.update(data);
};


const retrieveCurrentChatFromConversationsList = () => {
    const chatdialoguesRef = fiarebase.database().ref().child('chat_dialogues');
    chatdialoguesRef.child(curr_session)
        .once('value')
        .then(snap => {
            if (snap.exists()) {
                let data = snap.val();
                console.log(data);
                let dialogue = data.dialogue;
                console.log('Type of data snapshot: ', (typeof dialogue));
                console.log(dialogue);
            }
        }).catch(error => {
            console.log(error);
        });
}


const updateChatInConversationsList = logged_response => {
    const updateRefPath = 'chat_dialogues/' + curr_session + '/dialogue'
    const chatdialoguesRef = firebase.database().ref().child(updateRefPath);
    let chat = [];
    chatdialoguesRef.on('value', snap => { snap.exists() ? chat = snap.val() : []; });
    console.log('Chat so far...\n', chat);
    console.log('Pushing the current logged response... ', logged_response);
    chat.push(logged_response);
    chatdialoguesRef.set(chat);
};


const addNewChatSessionToUser = (user_id, new_session) => {
    const updateRefPath = 'users/' + user_id + '/chat_sessions';
    const usersRef = firebase.database().ref().child(updateRefPath);
    let data = {};
    data[new_session] = false;
    usersRef.update(data);
};


const switchToChatUI = (isNewUser, userObj) => {
    curr_session = uuidv4();
    console.log('Session Generated: $' + curr_session);
    if(isNewUser){
        addToStudyParticipantsList(userObj, curr_session);
    }
    addNewChatSessionToUser(userObj.uid, curr_session);
    addNewChatSessionToConversationsList(curr_session);
    launchWelcomeIntent(isNewUser, userObj);
    hideAll();
    $('.chat_window').show('fast');
};


const switchToLoginScreen = () => {
    hideAll();
    $('login_window').show('fast');
};

const switchToErrorScreen = () => {
    hideAll();
    $('.error_wrapper').show('fast');
};

const switchToLoadingScreen = () => {
    hideAll();
    $('.loading_wrapper').show('fast');
};


const switchToLockoutScreen = () => {
    //STUB TO DO 
    hideAll();
    $('.completed_wrapper').show('fast');
};


const hideAll = () => {
    $('.login_window').hide('fast');
    $('.chat_window').hide('fast');
    $('.loading_wrapper').hide('fast');
    $('.completed_wrapper').hide('fast');
    $('.error_wrapper').hide('fast');
};

const initClientApp = () => {
    if (firebase.auth().currentUser) {
        firebase.auth().signOut();
    }
};


const getUserInput = () => {
    return $('.message_input').val();
};
const setUserInput = text => {
    $('.message_input').val(text);
};


function launchWelcomeIntent(isNewUser, userObj) {
    // JSON Format for events via POST :
    // 'event':{ 'name': 'custom_event', 'data': {'name': 'Sam'}}
    console.log("Launching WELCOME intent with sessionId: $" + curr_session);
    // TODO: firebase database interactions
    let eventObj;
    if (isNewUser) {
        eventObj = { event: { name: 'WELCOME', data: { username: userObj.name } }, lang: "en", sessionId: curr_session }
    } else {
        eventObj = { event: { name: 'WELCOME' }, lang: "en", sessionId: curr_session };
    }
    $.ajax({
        type: "POST",
        url: baseUrl + "query?v=20150910",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + accessToken
        },
        data: JSON.stringify(eventObj),
        beforeSend: function() {
            addTextToChatHistory(null, false);
        },
        success: function(data) {
            //Add incoming text result to messages list
            console.log(data);
            var chatbot_response = data.result.fulfillment.speech;
            var serialized_response = JSON.stringify(data);
            var logged_message = packageForLogging(['chat_agent', timestamp(), chatbot_response, serialized_response]);
            console.log("Agent Responded: " + chatbot_response);
            console.log("Packaged message for logging: ", logged_message)
            // Log response to firebase here -> SMALL TALK FEATURE HAS NOO WEBHOOK POSSIBILITY
            updateChatInConversationsList(logged_message);
            addTextToChatHistory(chatbot_response, true);
        },
        error: function() {
            //Add appropriate error message if failed
            addTextToChatHistory("Internal Server Error", true);
            // removeChatSessionFromUser() to implement later!
            switchToErrorScreen();
        }
    });
}


const toggleIndicatorAndDisplayIncoming = text => {
    let lastMessageSent = $('.messages').children().last();
    lastMessageSent.find('.text').html(text);
    lastMessageSent.find('.typing_indicator').hide();
};


const addTextToChatHistory = (text, replacesLastTextVal) => {
    if (replacesLastTextVal) {
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
    return $('.messages').animate({
        scrollTop: $('.messages').prop('scrollHeight')
    }, 300);
};


function sendAndUpdateChat(text) {
    var logged_message = packageForLogging(['user', timestamp(), text]);
    updateChatInConversationsList(logged_message);
    $.ajax({
        type: "POST",
        url: baseUrl + "query?v=20150910",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        headers: {
            "Authorization": "Bearer " + accessToken
        },
        data: JSON.stringify({ query: text, lang: "en", sessionId: curr_session }),
        beforeSend: function() {

            addTextToChatHistory(null, false);
        },
        success: function(data) {
            //Add incoming text result to messages list
            console.log(data);
            var chatbot_response = data.result.fulfillment.speech;
            var serialized_response = JSON.stringify(data);
            var logged_message = packageForLogging(['chat_agent', timestamp(), chatbot_response, serialized_response]);
            console.log("Agent Responded: " + chatbot_response);
            console.log("Packaged message for logging: ", logged_message)
            // Log response to firebase here -> SMALL TALK FEATURE HAS NOO WEBHOOK POSSIBILITY
            updateChatInConversationsList(logged_message);
            addTextToChatHistory(chatbot_response, true);
        },
        error: function() {
            //Add appropriate error message if failed
            addTextToChatHistory("Internal Server Error", true);
        }
    });
}

const packageForLogging = array => array.map(message => message.trim()).join('|');



const timestamp = _ => {
    const now = new Date();
    return now.toString();
};

const uuidv4 = _ => {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    )
}