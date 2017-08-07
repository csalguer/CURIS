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
const App = require('./app-extension');
const functions = require('firebase-functions');



const Actions = {
  HELLO_WORLD: 'hello.world'
};

const Topics = {
  ACADEMICS : 'academics',
  HOBBIES : 'hobbies', 
  FINALS : 'finals',
  MINDSTATE: 'mindstate'
};

// // API.AI parameter names
const Parameters = {
  COURSE_ARG : 'course',
  HOBBY_ARG : 'hobbies_self'
};

// API.AI Contexts



// API.AI Events
const Events = {
  SLOT_FILL : 'specify-*-event'
};


//API.AI Intents
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
  var date = timestamp();
  var input = app.getRawInput();
  var log = "|"+ date + "|user_input|" + input;
  var intent = app.getIntent();
  console.log(intent + "|" + log);
};

const logAgentResponse = (app, message) => {
  var date = timestamp();
  var log = "|"+ date + "|agent_input|" + message;
  var intent = app.getIntent();
  console.log(intent + "|" + log);
};

const getRandomValue = responses => {
  return responses[Math.floor(Math.random() * responses.length)];
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



// API.AI Intent Actions ===> Function Definitions

const helloWorld = app => {
  console.log('Hello world!');
};
let actionMap = new Map();
actionMap.set(Actions.HELLO_WORLD, helloWorld);




exports.bot_therapy = functions.https.onRequest((request, response) => {

  const app = new App({ request, response });
  console.log('Request headers: ' + JSON.stringify(request.headers));
  console.log('Request body: ' + JSON.stringify(request.body));
  app.handleRequest(actionMap);
});