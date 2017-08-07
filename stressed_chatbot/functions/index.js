/* Copyright 2017 Christopher Salguero 
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. 
 *
 * 
 */

'use strict';

// Comment out if clean logs needed!
const Debug = require('debug');
const debug = Debug('stressed-chatbot:debug');
process.env.DEBUG = 'actions-on-google:*';
const ApiAiApp = require('actions-on-google').ApiAiApp;
const functions = require('firebase-functions');

// API.AI Actions
const Actions = {
//ACADEMICS
  GET_ACADEMICS : 'get.academics',
  GET_ACADEMICS_FUTURE : 'get.academics.future',
  GET_ACADEMICS_GOALS : 'get.academics.goals',
  EXP_ACADEMICS : 'explain.academics',
  EXP_ACADEMICS_GOALS : 'explain.academics.goals',
  EXP_ACADEMICS_FUTURE : 'explain.academics',
//HOBBIES
  GET_HOBBIES : 'get.hobbies',
  GET_HOBBIES_DETAILED : 'get.hobbies.detailed',
  EXP_HOBBIES : 'explain.hobbies',
  EXP_HOBBIES_DETAILED : 'explain.hobbies.detailed',
//FINALS
  GET_FINALS : 'get.finals',
  GET_FINALS_DETAILED : 'get.finals.detailed',
  GET_FINALS_DETPROGRESS : 'get.finals.detailed_progress',
  GET_FINALS_DETSENTIMENT : 'get.finals.detailed_sentiment',
  EXP_FINALS_DETAILED : 'explain.finals.detailed',
  EXP_FINALS_DETPROGRESS : 'explain.finals.detailed_progress',
  EXP_FINALS_DETSENTIMENT : 'explain.finals.detailed_sentiment',
// MINDSTATE 
  GET_MINDSTATE :'get.mindstate',
  GET_MINDSTATE_DETAILED : 'get.mindstate.detailed',
  EXP_MINDSTATE : 'explain.mindstate',
  EXP_MINDSTATE_DETAILED : 'explain.mindstate.detailed',
//APP INTERNAL STATE
  WELCOME : 'launch.welcome'
};

const Topics = {
  ACADEMICS : 'academics',
  HOBBIES : 'hobbies', 
  FINALS : 'finals',
  MINDSTATE: 'mindstate'
};

// // API.AI parameter names
const COURSE_ARG = 'course';
const HOBBY_ARG = 'hobbies_self';
const Parameters = {
  COURSE_ARG : 'course',
  HOBBY_ARG : 'hobby'
};

// API.AI Contexts



// API.AI Events
const Events = {
  SLOT_FILL : 'specify-*-event'
};


//API.AI Intents
const FINALS_DETAIL_INTENT = 'get_finals_detailed';
const ACADEMICS_INTENT = 'get_academics';
const ACADEMICS_DETAIL_INTENT = 'get_academics_detailed';
const ACADEMICS_FUTURE_INTENT = 'get_academics_future';
const ACADEMICS_GOALS_INTENT = 'get_academics_goals';
const HOBBIES_DETAIL_INTENT = 'get_hobbies_detailed';
const _DETAIL_INTENT = '';
const Intents = {
  FINALS_DETAIL_INTENT :'get_finals_detailed',
  ACADEMICS_INTENT : 'get_academics',
  ACADEMICS_DETAIL_INTENT : 'get_academics_detailed',
  ACADEMICS_FUTURE_INTENT : 'get_academics_future',
  ACADEMICS_GOALS_INTENT : 'get_academics_goals',
  HOBBIES_DETAIL_INTENT : 'get_hobbies_detailed',
  _DETAIL_INTENT : ''
};


const Lifespans = {
  DEFAULT : 3,
  END : 0
};



const DEFAULT_LIFESPAN = 5;
const END_LIFESPAN = 0;
//Assert
const assert = (condition, message) => {
  if(!condition){
    throw message || "Assertion Failed";
  }
}

const timestamp = _ => {
  const today = new Date();
  return today.toString();
};


const logUserResponse = app => {
  var sessionId = app.getSessionId();
  var date = timestamp();
  var input = app.getRawInput();
  var log = date + "|user_input|" + input;
  var intent = app.getIntent();
  console.log(sessionId + "|" + intent + "|" + log);
};

const logAgentResponse = (app, message) => {
  var sessionId = app.getSessionId();
  var date = timestamp();
  var log = date + "|agent_input|" + message;
  var intent = app.getIntent();
  console.log(sessionId + "|" + intent + "|" + log);
};

const getRandomValue = responses => {
  return responses[Math.floor(Math.random() * responses.length)];
};

const getDifferentTopic = current_topic => {
  var topics = Object.values(Topics);
  var choices = topics.filter(topic => current_topic !== topic);
  console.log(choices);
  return getRandomValue(choices)
};

const calculateProbingTier = action_name => {
  var parts = action_name.split('.');
  let tier = 1;
  assert(parts.length > 1, 'Action name incorrectly formatted');
  if(parts[0] === 'explain'){
    tier = 3;
  }
  if(parts.length >= 3){
    tier += 1;
  }
  return tier;
};

const calculateUserModFactor = input => {
  //TO DO: Sentiment analysis/tone analysis for higher stressed language
  return 0.1;
};

const calcInfluenceFactor = (action_name, user_input) => {
  return calculateProbingTier(action_name) * calculateUserModFactor(user_input);
};


const modulateAgentResponse = app => {
  initData();
  let action = app.getIntent(); //Need to see if always action name for API.AI REQ
  let user_input = app.getRawInput();
  let mod_factor = calcInfluenceFactor(action, user_input);

};

const FINALS_TYPE = {
  EXAM: 'exam',
  PROJECT: 'project',
  PAPER: 'paper'
};

function Final(course, type, due_date, unit_workload, progress, harbored_sentiment, procrast_lvl){
  this.course = course;
  this.type = type;
  this.due_date = due_date;
  this.unit_workload = unit_workload;
  this.progress = progress;
  this.harbored_sentiment = harbored_sentiment;
  this.procrast_lvl = procrast_lvl;
}

Final.prototype.toString = function finalToString(){
  let date = new Date(this.due_date);
  let dayOfWeek = date.getDayName()
  //CHANGE STR HERE or get rid of Method to make more natural.
  var ret = `My final ${this.type} for ${this.course} is on ${dayOfWeek}.`;
  return ret;
}




var FINALS_DATA = [];
FINALS_DATA.push(new Final('CS224S', 'project', '2017-08-31T12:00', 4, 0.25, 'fear', 5));
FINALS_DATA.push(new Final('CS224S', 'exam', '2017-08-31T12:00', 4, 0.10, 'depressed', 9));
FINALS_DATA.push(new Final('CS168', 'exam', '2017-08-30T15:00', 3, 0.65, 'nervous', 6));
FINALS_DATA.push(new Final('ARCH1', 'exam', '2017-09-1T08:00', 4, 0.65, 'calm', 1));
FINALS_DATA.push(new Final('CS294W', 'project', '2017-09-01T12:00', 4, 0.25, 'worried', 8));
FINALS_DATA.push(new Final('RELIGST56', 'paper', '2017-08-31T12:00', 4, 0.75, 'calm', 3));

const getFinalsData = (course_name, data) => {
  var ret = [];
  for (var i = 0; i < data.length; i++){
    var finals_obj = data[i];
    if (finals_obj.course === course_name){
      ret.push(finals_obj);
    }
  }
  return ret;
};


if(!Object.values) {
  Object.values = o => Object.keys(o).map(k => o[k]);
}

(function() {
    let days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday', 'Sunday'];

    let months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    Date.prototype.getMonthName = function() {
        return months[ this.getMonth() ];
    };
    Date.prototype.getDayName = function() {
        return days[ this.getDay() ];
    };
})();


const GREETINGS = [
  'Hi! My name is StudentBot, just your typical overstressed college student. Talk to me about school, about my finals, or even my hobbies.',
  'Hello, the name is StudentBot, just your typical overstressed college student! Talk to me about school, about my finals, or even my hobbies.',
  'Good day! I\'m StudentBot, a typical stressed out college student. Talk to me about school, about my finals, or even my hobbies.',
  'Greetings! My name is StudentBot, a rather typical overstressed college student. Talk to me about school, about my finals, or even my hobbies.',
  'Hey there, StudentBot here! A currently stressed college student. Talk to me about school, about my finals, or even my hobbies.'
];



const ACADEMICS_SLOTFILL = ['What course were you asking about?', 'Which one of my courses were you talking about?', 'I didn\'t catch which of my classes you were referring to. Could you say which one you meant?'];
const ACADEMICS_RESPONSES = [
  'In general I\'d say I have average academics. My Junior year took quite a toll on me unfortunately but other years have been great.',
  'I\'d like to say I have great grades, but I\'m just average on that end.',
  'I have average grades. Always a bit disappointing to be mediocre.',
  'I have decent grades, just nothing amazingly stellar in terms of scores unfortunately.'
];

const ACADEMICS_FUTURE_RESPONSES = [
  'I\'ve always dreamed of getting my PhD in some scientific field. Given my workload and stress however, I don\'t think anything other than a Masters in the next two years would be a good idea, any more would lead to more burnout.',
  'I hope to pursue a more advanced degree eventually, I\'m just not sure that now would be the greatest time due to my amount of stress in coursework, let alone in research and publications.',
  'Ideally I would continue an extra year into my Masters program but I may have to postpone any further degrees due to financial reasons. That, and the fact that my stress levels and workload are already too high.'
];

const ACADEMICS_GOALS_RESPONSES = [
  'I guess that my ideal set of grades would be a mix of A\'s and B\'s. I\'d want them to better reflect the amount of time gone into work and studying I guess. Thankfully I\'m not terribly far from my ideal.',
  'I would love to receive above average grades for my courses. I put in a lot of work and time into my classes but that doesn\'t always translate to good grades unfortunately. I don\'t think I\'m terribly far from my dream set of grades thought thankfully enough.',
  'I wish I could have straight A\'s but that\'s a bit much I think. Ideally I\'d want a good mix of A\'s and B\'s, better to reflect my work and study input for the class than being the best just to be the best.  I\'m fortunately not too far from above average grades .'
];


const HOBBY_SLOTFILL = ['Which hobby were you asking about?', 'Which one of my hobbies were you asking about again?'];
const HOBBIES = new Set([
  'yoga',
  'hiking',
  'badminton',
  'video gaming',
  'painting',
  'reading',
  'soccer',
  'cooking'
]);
const HOBBIES_DATA = {
  'yoga' : ['Yoga can be quite relaxing, and the stretches really feel good and make me focus.','Yoga makes me aware of my body in a good way, it keeps me centered.'],
  'hiking' : ['Having a refreshing time in nature is always nice, and the sights and sounds make it relaxing.', 'Even hard hikes that tire you out make you stop and think about the bigger world or nature around you, makes problems seem small.'],
  'badminton' : ['It was a game I used to play in highschool with friends, so the nostalgia is probably a huge factor in why I like it.','Badminton is pretty fast paced so you never get bored. That and the fact that raquet sports can be played in pairs (doubles) and you have that comaradarie.'],
  'video gaming' : ['The reason I like it so much is because you get to see a whole new world and have a whole different set of skills or abilities than you normally do.','Games always have goals or quests that are pretty definite. It\'s hard to get lost or not know what to do in a game usually.'],
  'painting' : ['Painting for me is true freedom, to put your dreams, nightmares or even reality on canvas.', 'Painting doesn\'t have to be about skill or aesthetics, it\'s more about how you can control the colors and shadows to embody your vision.'],
  'reading' : ['Reading takes me to a whole different universe, one where I can not only enjoy new sights and sounds, but one where I can glimpse into the minds and views of others.', 'Reading lets you escape anywhere imaginable, that coupled with the fact that our mind\'s eye produces better graphics than any CGI in a movie.'],
  'soccer' : ['I think that soccer shines because of it\'s mixed teamwork and solo gameplay. To be strong in your role is to support the team, and to support the team helps build your role.', 'Soccer is more about tactics, footwork, and endurance than it is about sheer strength. It also takes an entire team to make any sort of offense or defense.'],
  'cooking' : ['Cooking not only nourishes your body, but it also feeds your soul. Nothing better than cooking my favorite childhood meal in my opinion.', 'Cooking lets you design and build something that will be used for yourself. The best part is being able to do it for others. It\'s a sign of love, trust and respect between people.'],
};

const selectReasonForHobby = (given_hobby, data) => {
  var ret = '';
  if (given_hobby in data){
    var reasonsList = data[given_hobby];
    var randIndex = (Math.floor(Math.random() * 2) == 0) 
      ? 0 : 1;
    ret = reasonsList[randIndex]
  } else {
    ret = 'I don\'t have a reason for liking it unfortunately. Wish I could explain my idiosyncrasies sometimes.'
  }

  return ret;
};


// const NEXT_FACT_DIRECTIVE = ' Would you like to hear another fact?';
const CONFIRMATION_SUGGESTIONS = ['Sure', 'No thanks'];

const NO_INPUTS = [
  'I didn\'t hear that.',
  'If you\'re still there, say that again.',
  'We can stop here. See you soon.'
];




class App extends ApiAiApp {
  constructor(options){
    debug('Extended App constructor');
    super(options);
    this.followupEvent_ = null;
    this.actionIncomplete_ = null;
    this.session_id = this.body_.sessionId
  }



  setFollowupEvent(name, parameters){
    debug('Extended App setFollowupEvent: debug');
    if(!name) {
      this.handleError_('Invalid context name');
      return null;
    }
    const newFollowupEvent = {
      name: name
    };
    if(parameters){
      newFollowupEvent.data = parameters;
    }
    this.followupEvent_= newFollowupEvent;
  }

  buildResponse_(textToSpeech, expectUserResponse, noInputs){
    debug('Extended App buildResponse_: debug');
    let postBuilderRes = super.buildResponse_(textToSpeech, expectUserResponse, noInputs) ;
    if(this.followupEvent_) {
      postBuilderRes.followupEvent = this.followupEvent_; 
    }
    // May have to remove ACTIONS_API_AI_CONTEXT from ask queries to prevent
    // overflow of maximum active contexts
    return postBuilderRes;
  }


  extractData_ () {
    debug('Extended App extractData_: debug');
    super.extractData_();
    console.log("Extracted: " + Object.values(this.data));
    this.actionIncomplete_ = this.body_.result.actionIncomplete;
  }


  isSlotFillingRequest(){
    return this.actionIncomplete_;
  }

  getSlotsNeedingFill(){
    const contextList = this.getContexts();
    // console.log('contextList: ' + Object.keys(contextList));
    // console.log('length: ' + contextList.length);
    // console.log('Testing indexing (arr[0]):' + contextList[0]);
    const ORIGINAL_SUFFIX = '.original';
    let contextData = {};
    let emptySlots = [];
    for(let autoContext of contextList) {
      console.log('CONTEXT: ' + autoContext.name);
      //let parameters = this.getContextArgumentsObj_(autoContext.name);   DEPRECATED
      let params = autoContext.parameters;
      for(let key of Object.keys(params)){
        if(!key.includes(ORIGINAL_SUFFIX) && params[key] === ''){
          emptySlots.push(key);
        }else if (!key.includes(ORIGINAL_SUFFIX)){
          contextData[key] = params[key];
        }
      }
    }
    this.data = contextData; //May have to delete
    return emptySlots;
  }

  persistAllIncomingContexts(){
    const contextList = this.getContexts();
    for(let context of contextList){
      this.setContext(context.name, context.lifespan, context.parameters);
    }
  }

  persistTempContextForSlotFilling(){
    const name = this.body_.result.metadata.intentId + '_id_dialog_context';
    console.log('intent specific ID: ' + name);
    const contextList = this.getContexts();
    for(let context of contextList){
      if(context.name === name){
        this.setContext(context.name, context.lifespan, context.parameters);
      }
    }
  }


  getSessionId(){
    return this.session_id;
  }
// DEPRECATED for OBJ manipulation
  // getContextArgumentsObj_(context_name){
  //   if(!context_name){
  //     this.handleError_('Invalid context name');
  //     return null;
  //   }
  //   if(!this.body_.result ||
  //     !this.body_.result.contexts) {
  //     this.handleError_('No contexts included in request');
  //     return null;
  //   }
  //   for(let context of this.body_.result.contexts) {
  //     if(context.name === context_name){
  //       return context.parameters
  //     }
  //   }
  //   return null;
  // }
  // askForSlotFilling(textToSpeech, ex){

  // }


}






exports.stressedChatbot = functions.https.onRequest((request, response) => {

  const app = new App({ request, response });
  console.log('Request headers: ' + JSON.stringify(request.headers));
  console.log('Request body: ' + JSON.stringify(request.body));



  function getAcademics(app){
    logUserResponse(app);
    let AcademicsResp = app.data.AcademicsResp
      ? app.data.AcademicsResp: ACADEMICS_RESPONSES;
    var retMessage = getRandomValue(AcademicsResp);
    logAgentResponse(app, retMessage);
    return app.tell(retMessage);
  }


  function getAcademicsFuture(app){
    logUserResponse(app);
    let AcademicsFutureResp = app.data.AcademicsFutureResp
      ? app.data.AcademicsFutureResp : ACADEMICS_FUTURE_RESPONSES;
    var retMessage = getRandomValue(AcademicsFutureResp);
    logAgentResponse(app, retMessage);
    return app.tell(retMessage);
  }


  function getAcademicsGoals(app){
    logUserResponse(app);
    let AcademicsGoalsResp = app.data.AcademicsGoalsResp
      ? app.data.AcademicsGoalsResp : ACADEMICS_GOALS_RESPONSES;
    var retMessage = getRandomValue(AcademicsGoalsResp);
    logAgentResponse(app, retMessage);
    return app.tell(retMessage);
  }

  function getFinalsDetail(app){
    console.log('getFinalsDetail');
    logUserResponse(app);
    
    const requiresFilling = app.isSlotFillingRequest();
    if(requiresFilling){
      
      //REWORK REQUEST FULFILLMENT ----> Tracking, seems that
      //API.AI will not take an event for the same intent and requires
      //A complete second intent for the slot filling example

      //TO TEST OUT EXTENSION and WEB HOOK FILL
      // const params = {
      //   course : 'CS224S'
      // };
      // app.setFollowupEvent('specify-course-event', params);
      const emptySlots = app.getSlotsNeedingFill();
      assert(emptySlots[0] === 'course', 'Malformed context bound for detailed intent');
      var retMessage = getRandomValue(ACADEMICS_SLOTFILL);
      app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
      app.persistTempContextForSlotFilling();
      logAgentResponse(app, retMessage);
      return app.ask(retMessage); //VS ask?
    }
    var courseName = app.getArgument(COURSE_ARG);
    assert(courseName != '', "Empty string found for course_name");
    let finalsData = app.data.finalsData
      ? app.data.finalsData : FINALS_DATA;
    var finalsList = getFinalsData(courseName, finalsData);
    let finalsPrefix = `Sure, I guess I can tell you a bit about my final for ${courseName}.\n`;
    if (finalsList.length > 1){
      finalsPrefix = finalsPrefix.replace("final", "finals");
      let numFinals = finalsList.length;
      let multiPrefix = `I have a total of ${numFinals} for that class. \n`;
      var retStr = finalsPrefix + multiPrefix + finalsList;
      logAgentResponse(app, retStr);
      return app.tell(retStr);
    } else if (finalsList.length == 1){
      let finalObj = finalsList[0];
      let finalDate = new Date(finalObj.due_date);
      let finalStr = finalObj.toString();
      var retStr = finalsPrefix + finalStr;
      //Handle SurfaceCapability for later extensions here
      logAgentResponse(app, retStr);
      return app.tell(retStr);
    }
    
    return;
  }

  function getHobbiesDetail(app){
    console.log('getHobbiesDetail');
    logUserResponse(app);
    const requiresFilling = app.isSlotFillingRequest();
    if(requiresFilling){
      const emptySlots = app.getSlotsNeedingFill();
      assert(emptySlots[0] === 'hobby', 'Malformed context bound for detailed intent');
      var retMessage = getRandomValue(HOBBY_SLOTFILL);
      app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
      app.persistTempContextForSlotFilling();
      logAgentResponse(app, retMessage);
      return app.ask(retMessage); //VS ask?
    }
    var hobbyName = app.getArgument(Parameters.HOBBY_ARG);
    assert(hobbyName != null, "Empty string found for hobby_name");
    let hobbiesData = app.data.hobbiesData
      ? app.data.hobbiesData : HOBBIES_DATA;
    var hobbiesReasoning = selectReasonForHobby(hobbyName, hobbiesData);
    let hobbiesPrefix = `I mean, I guess there are many reasons why I like ${hobbyName}. `;
    var retStr = hobbiesPrefix + hobbiesReasoning;
    logAgentResponse(app, retStr);
    return app.tell(retStr);
  }


  function launchWelcome(app){
    logUserResponse(app);
    let welcomeGreeting = app.data.welcomeGreeting
      ? app.data.welcomeGreeting: GREETINGS;
    var retMessage = getRandomValue(welcomeGreeting);
    logAgentResponse(app, retMessage);
    return app.tell(retMessage);
  }

  let actionMap = new Map();
  actionMap.set(Actions.GET_FINALS_DETAILED, getFinalsDetail);
  actionMap.set(Actions.GET_HOBBIES_DETAILED, getHobbiesDetail);
  actionMap.set(Actions.GET_ACADEMICS, getAcademics);
  actionMap.set(Actions.GET_ACADEMICS_FUTURE, getAcademicsFuture);
  actionMap.set(Actions.GET_ACADEMICS_GOALS, getAcademicsGoals);
  actionMap.set(Actions.WELCOME, launchWelcome);
  app.handleRequest(actionMap);
});