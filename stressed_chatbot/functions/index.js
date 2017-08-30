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
    GET_ACADEMICS: 'get.academics',
    GET_ACADEMICS: 'get.academics.detailed',
    GET_ACADEMICS_FUTURE: 'get.academics.future',
    GET_ACADEMICS_GOALS: 'get.academics.goals',
    EXP_ACADEMICS: 'explain.academics',
    EXP_ACADEMICS_GOALS: 'explain.academics.goals',
    EXP_ACADEMICS_FUTURE: 'explain.academics.future',
    EXP_ACADEMICS_DETAILED: 'explain.academics.detailed',
    EXP_ACADEMICS_SENTIMENT: 'explain.academics.sentiment',


    //ASSIGNMENTS
    GET_ASSIGNMENTS: 'get.assignments',
    GET_ASSIGNMENTS: 'get.assignment.detailed',
    EXP_ASSIGNMENTS: 'explain.assignments',
    EXP_ASSIGNMENTS_DETAILED: 'explain.academics.detailed',
    EXP_ASSIGNMENTS_OPINION: 'explain.assignments.opinion',


    //HOBBIES
    GET_HOBBIES: 'get.hobbies',
    GET_HOBBIES_DETAILED: 'get.hobbies.detailed',
    EXP_HOBBIES: 'explain.hobbies',
    // EXP_HOBBIES_DETAILED: 'explain.hobbies.detailed',
    EXP_HOBBIES_BENEFIT: 'explain.hobbies.benefit',

    //RELAX_METHODS
    GET_RELAX: 'get.relax_methods',
    // GET_RELAX_DETAILED: 'get.relax_methods.detailed',
    EXP_RELAX: 'explain.relax_methods',
    // EXP_RELAX_DETAILED: 'explain.relax_methods.detailed',
    EXP_RELAX_BENEFIT: 'explain.relax_methods.benefit',

    //FINALS
    GET_FINALS: 'get.finals',
    GET_FINALS_DETSPECS: 'get.finals.detailed_specs',
    GET_FINALS_DETAILED: 'get.finals.detailed',
    GET_FINALS_DETPROGRESS: 'get.finals.detailed_progress',
    // GET_FINALS_DETSENTIMENT: 'get.finals.detailed_sentiment',
    EXP_FINALS: 'explain.finals',
    EXP_FINALS_DETAILED: 'explain.finals.detailed',
    EXP_FINALS_PROGRESS: 'explain.finals.progress',
    // EXP_FINALS_WEIGHTED: 'explain.finals_spec.weight',
    EXP_FINALS_SENTIMENT: 'explain.finals.sentiment',
    EXP_FINALS_PLAN: 'explain.finals.plan',
    EXP_FINALS_STUDYHABIT: 'explain.finals.study_habit',

    //DEPRECATED DUE TO RUNNING_CONTEXT
    // MINDSTATE : testing for vagueness matching 
    // GET_MINDSTATE: 'get.mindstate',
    // GET_MINDSTATE_DETAILED: 'get.mindstate.detailed',
    // EXP_MINDSTATE: 'explain.mindstate',
    // EXP_MINDSTATE_DETAILED: 'explain.mindstate.detailed',
    //APP INTERNAL STATE
    WELCOME: 'launch.welcome',
    FALLBACK: 'input.unknown'
};

const Topics = {
    ACADEMICS: 'academics',
    HOBBIES: 'hobbies',
    RELAX: 'relax_method',
    FINALS: 'finals',
    MINDSTATE: 'mindstate'
};

const getTopicFromAction = action_name => {
    let root = action_name.split('.')[1];
    for(let t in Object.values(Topics)){
        if(root === t) return t;
    }
    return null;
}



// // API.AI parameter names
const Parameters = {
    COURSE_ARG: 'course',
    HOBBY_ARG: 'hobby',
    RELAX_ARG: 'relax_method'
};

// API.AI Contexts



// API.AI Events
const Events = {
    SLOT_FILL: 'specify-*-event'
};

//DEPRECATED: Switched to action since all internal intent names
//            are the actual action names specified in API.AI console
//API.AI Intents
const Intents = {
    FINALS_DETAIL_INTENT: 'get_finals_detailed',
    ACADEMICS_INTENT: 'get_academics',
    ACADEMICS_DETAIL_INTENT: 'get_academics_detailed',
    ACADEMICS_FUTURE_INTENT: 'get_academics_future',
    ACADEMICS_GOALS_INTENT: 'get_academics_goals',
    HOBBIES_DETAIL_INTENT: 'get_hobbies_detailed',
    _DETAIL_INTENT: ''
};


const Lifespans = {
    RUNNING: 100,
    LARGE: 5,
    DEFAULT: 3,
    END: 0
};



// const DEFAULT_LIFESPAN = 5;
// const END_LIFESPAN = 0;
//Assert
const assert = (condition, message) => {
    if (!condition) {
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
    if (parts[0] === 'explain') {
        tier = 3;
    }
    if (parts.length >= 3) {
        tier += 1;
    }
    return tier;
};

const calculateUserModFactor = input => {
    //TO DO: Sentiment analysis/tone analysis for higher stressed language
    return 0.1;
};

const calcInfluenceFactor = (action_name, user_input) => {
    let initial_factor = calculateProbingTier(action_name) * calculateUserModFactor(user_input);
    return initial_factor;
};


const modulateAgentResponse = app => {
    // app.initData(); //WORK ON THIS WRITTEN DEFINITION
    let curr_action = app.getIntent(); //Need to see if always curr_action name for API.AI REQ
    let prev_action = app.data.parameters['prev_action_called']; 
    assert(prev_action !== null);
    let user_input = app.getRawInput();
    let topic_influence_prob = calcInfluenceFactor(curr_action, user_input);
    let probe_jump_dist = Math.abs(calculateProbingTier(prev_action) - calculateProbingTier(curr_action));

    if (probe_jump_dist == 2){
        topic_influence_prob *= 1.15;
    }else if (probe_jump_dist == 3){
        topic_influence_prob *= 1.45;
    }
    if(isTopicSwitchTriggered(topic_influence_prob)){
        //Handle saving the topics "covered" to coalesced array
        let topic = getTopicFromAction(curr_action);
        let topics_covered = app.data.parameters['topics_discussed'] ? app.data.parameters['topics_discussed'] : [];
        topics_covered.push(topic);
        app.data.parameters['topics_discussed'] = topics_covered;
        return getDifferentTopic(topic);
    }
    return null;
};


const isTopicSwitchTriggered = probability => {
    return Math.random() <= probability;
}

const IntentClues = {
    'explain' : ['how', 'why'],
    'sentiment' : ['feel', 'feeling', 'felt', 'emotion', 'sentiment'],
    'detailed' : ['detail', 'complete', 'detailed', 'thorough', 'definite', 'exactly', 'exact', 'comprehensive'],
    'progress' : ['process', 'move', 'grow', 'advance', 'continue', 'pace'],
};


const getClues = input => {
    var possibleClues = new Set();
    Object.entries(IntentClues).forEach( ([key, value]) =>{
        let clueSet = value;
        for(let clue in clueSet){
            if(input.contains(clue)){
                possibleClues.add(key);
            }
        }
    });
    console.log(possibleClues);
    return possibleClues.toArray();
}

const initData = app => {
    let running_context = app.coalesceContexts();
    console.log("Running context as exctraced from app object: ", running_context.parameters)
    app.data = running_context;
};


const packageData = app => {
    let running_context = app.data;
    running_context.parameters['prev_action_called'] = app.getIntent();
    app.setContext(running_context);
    //TODO further data packaging for coalesced data
}


const FINALS_TYPE = {
    EXAM: 'exam',
    PROJECT: 'project',
    PAPER: 'paper'
};


const FINALS_EXPLANATION = [
    `Well I could've had  a bit of a different schedule lined up if I had asked my professors to allow me to merge my projects, but I'm a bit stuck with the crazy load at this point.`,
    `I'm not happy about my schedule, since I could've had my projects merged so I had one less final to deal with but I didn't have time to ask the professors involved.`,
    `I'm just disappointed I didn't petition my professors to merge my two projects, so I'm left with one extra final's worth of work to do unfortunately enough.`
];

function Final(course, type, due_date, unit_workload, letter_grade, progress, harbored_sentiment, procrast_lvl) {
    this.course = course;
    this.type = type;
    this.due_date = due_date;
    this.unit_workload = unit_workload;
    this.letter_grade = letter_grade;
    this.progress = progress;
    this.harbored_sentiment = harbored_sentiment;
    this.procrast_lvl = procrast_lvl;
}

Final.prototype.toString = function finalToString() {
    let date = new Date(this.due_date);
    let dayOfWeek = date.getDayName()
    //CHANGE STR HERE or get rid of Method to make more natural.
    var ret = `My final ${this.type} for ${this.course} is on ${dayOfWeek}.`;
    return ret;
}




var PROCRAST_SIGHS = [
    `I just hope I can get it done in time for the deadline though...`,
    `I'm sure I only feel that way because of the deadline though...`,
    `If I could finish quickly it'd be a whole different situation though...`
];

Final.prototype.getSentiment = () => {
    let sentiment_base = this.harbored_sentiment;
    var modifier;
    if (this.progress <= .25) {
        modifier = 'extremely';
    } else if (this.progress > 0.25 && this.progress < 0.5) {
        modifier = 'very';
    } else if (this.progress >= 0.5 && this.progress < 0.75) {
        modifier = 'a bit';
    } else {
        modifier = 'kinda'; //Colloquial softening of qualifiers
    }
    var ret = `I'm feeling ${modifier} ${this.sentiment_base} for my ${this.course} ${this.type} so far.`;
    ret += `I can't afford to mess this up. I have ${this.unit_workload} units riding on this class and I've only been able to get ${LETTER_GRADES[this.letter_grade]} so far not including the final so, yeah...`;
    if (procrast_lvl > 5) {
        ret += getRandomValue(PROCRAST_SIGHS);
    }
    return ret;
}

const LETTER_GRADES = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A'];

Final.prototype.explainDetailed = () => {
    // let grade_str = LETTER_GRADES[this.letter_grade];
    var ret = `Considering I currently have a ${LETTER_GRADES[this.letter_grade]}`;
    if(this.letter_grade < 5){
        ret += `, I really can't afford to mess up this ${this.type}.`;
    } if (this.letter_grade == 5){
        ret += `, seems like I can't escape that standard deviation unfortunately`;
    } else{
        ret += `, I don't have much wiggle room but I might be able to pull this off.`;
    }
    let required_action = FINALS_TYPE_ACTION_REQ[this.type];
    if(this.procrast_lvl > 5) {
        ret += ` I'm just having trouble getting through the motions of ${required_action} it.`;
    } else if (this.procrast_lvl === 5){
        ret += ` I should be able to finish ${required_action} it though, I just can't spend too much time preparing.`;
    } else {
        ret += ` I'm just surprised things didn't get too bad for this `;
    }
    let day = (new Date(this.due_date)).getDayName();
    ret += `I just need to make sure to get everything finalized and done with before ${day}.`;
    return ret;
}

const FINALS_TYPE_ACTION_REQ = {};
FINALS_TYPE_ACTION_REQ[FINALS_TYPE.EXAM] = 'studying for';
FINALS_TYPE_ACTION_REQ[FINALS_TYPE.PAPER] = 'writing';
FINALS_TYPE_ACTION_REQ[FINALS_TYPE.PROJECT] = 'completing';

Final.prototype.explainProgress = () => {
    var quantifier;
    var extra_aside;
    if (this.progress <= .25) {
        quantifier = 'almost no';
        extra_aside = `I have no idea how this is gonna go if I'm being frank.`;
    } else if (this.progress > 0.25 && this.progress < 0.5) {
        quantifier = 'a bit of';
        extra_aside = `I'm just sad I haven't been able to get more done`;
    } else if (this.progress >= 0.5 && this.progress < 0.75) {
        quantifier = 'a decent amount of';
        extra_aside = `I can't believe that I managed to get some preparation in considering the amount of work left`;
    } else {
        quantifier = 'killer'; //Colloquial softening of qualifiers
        extra_aside = `I honestly didn't expect to get this far all things considering.`;
    }
    var ret = `I've made ${quantifier} progress on the ${this.type} for ${this.course}.`;
    ret += extra_aside;
}


Final.prototype.explainPlan = () => {
    var ret;
    var extra_aside;
    if(this.letter_grade < 5){
        ret = `I can't get anything less than a perfect on this ${this.type}. `;
        extra_aside = `I'll just have to hole myself up in the library or in office hours to try to reach that finish line...`;
    } if (this.letter_grade == 5){
        ret = `I could do much better but also much worse. I have a bit of a wiggle room to push this final off until later. `;
        extra_aside = `I'll make sure to try to squeeze in some extra office hours while I can. Sadly, I still think that I can't focus too much on it yet...`;
    } else{
        ret = `I'm not prioritizing this class at all. I don't think that it should be a priority at all considering my other finals. `;
        extra_aside = `I'm gonna have to punt this until more pressing finals are dealt with. I just can't forget about it until last minute...`;
    }
    let date = new Date(this.due_date);
    console.log('Date Obj:' + date);
    let day_name = date.getDay();
    console.log('Matched day name: ' + day_name);
    var soonness;
    if (date > 5){
        soonness = 'eventually'
    }if (date > 2 && date < 4){
        soonness = 'rather soon'
    }else {
        soonness = 'ASAP'
    }

    let prefix = `Well since this final is due next ${day_name}, I can't help but have to start studying ${soonness}. `;
    return prefix + ret + extra_aside;
}


Final.prototype.explainStudyHabit = () => {
    var quantifier;
    var extra_aside;
    if (this.procrast_lvl <= 3) {
        quantifier = 'extremely';
        extra_aside = `Not to jinx myself, but I managed well enough and have some padding so my typical habit of working a few nights before should be enough.`;
    } else if (this.procrast_lvl > 3 && this.procrast_lvl <= 6) {
        quantifier = 'kinda';
        extra_aside = `I'm not going to say I have the best motivation for this class, but I think I've been decent about not procrastinating on the required assignments and reading...`;
    } else {
        quantifier = 'not at all'; //Colloquial softening of qualifiers
        extra_aside = `I'm just at a loss here. I need so much work to make up for my grade, that coupled with the fact that the material isn't always the best doesn't help with my studying either.`;
    }
    var ret = `Study habits? I can't think of a specific one, but I think a better question might be about my procrastinating, no? I'm ${quantifier} motivated on the ${this.type} for ${this.course}. `;
    ret += extra_aside;
    return ret;
};

Final.prototype.getSpecs = () => {
    var ret;
    if(this.type == FINALS_TYPE.EXAM){
        ret = `Well, most all final exams tend to follow the same format. Get through the N number of questions before 3 hours are up... not much variety there.`;
    }else if (this.type == FINALS_TYPE.PAPER){
        ret = `Well, I'm not sure if I should be thankful or not, but all term papers are a bit standardized. Anywhere from 10-12 pages, double spaced, and cited. The only thing is that some classes let you pick your topic...`
    }else {
        ret = `I think this project is like most others for end of term... shouldn't expect any less than 25 hours work minimum during finals week, let alone any work you've put in leading up to the last week of classes.`;
    }
    return ret;
}


var FINALS_DATA = [];
FINALS_DATA.push(new Final('CS224S', 'project', '2017-08-31T12:00', 4, 4, 0.25, 'scared', 6));
FINALS_DATA.push(new Final('CS224S', 'exam', '2017-08-31T12:00', 4, 4, 0.10, 'depressed', 9));
FINALS_DATA.push(new Final('CS168', 'exam', '2017-08-30T15:00', 3, 9, 0.65, 'nervous', 5));
FINALS_DATA.push(new Final('ARCH1', 'exam', '2017-09-1T08:00', 4, 11, 0.65, 'calm', 1));
FINALS_DATA.push(new Final('CS294W', 'project', '2017-09-01T12:00', 4, 5, 0.25, 'worried', 8));
FINALS_DATA.push(new Final('RELIGST56', 'paper', '2017-08-31T12:00', 4, 9, 0.75, 'calm', 3));

const getFinalsData = (course_name, data) => {
    var ret = [];
    for (var i = 0; i < data.length; i++) {
        var finals_obj = data[i];
        if (finals_obj.course === course_name) {
            ret.push(finals_obj);
        }
    }
    return ret;
};


if (!Object.values) {
    Object.values = o => Object.keys(o).map(k => o[k]);
}

(function() {
    let days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    Date.prototype.getMonthName = function() {
        return months[this.getMonth()];
    };
    Date.prototype.getDayName = function() {
        return days[this.getDay()];
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
    'In general I\'d say I have average academics. My Junior year took quite a toll on me unfortunately but other years have been okay.',
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


const ACADEMICS_EXPLANATIONS = [
    `Well the reason I don't have the best grades is simple - I'm a mediocre student. I could say that I had a tough time adjusting to school after I had to deal with mental health issues but then I'd just be making excuses I think.`,
    `The main reason my grades are so average is because I've always been bad at being a student. I can do the readings, do the work, study a lot, but it just doesn't stick. I could say I had worked through some mental health issues but that's not an actual excuse people take seriously.`,
    `I can't think of a single reason, other than the fact that I study and try but I just can't seem to get the knowledge to stay when I need it. My therapist would tell me say that dealing with mental health issues as a student is no laughing matter and is serious, but I don't think too many people would take that reason seriously.`
];


const ACADEMICS_EXPLANATIONS_GOALS = [
    `The reason why I'd want a healthier mix of A's and B's is because I'm tired of getting C's. Not only do they look rather bad, but I don't want others thinking I don't do the work, especially during grad school apps.`,
    `I think that getting higher grades overall would just better reflect my work. Getting low grades not only feels bad but also doesn't help my dreams in academics. I do the work, just don't always have it stick ya know?`,
    `I'm just not a C or below is my answer. I'd say I do good work, I put in the time, and I study as best I can, and my grades should better reflect that. The reason my grades matter is also to make sure I can actually go to grad school too I guess.`
];


const ACADEMICS_EXPLANATION_FUTURE = [
    `I want to get a PhD not just for the high acheivement, but to really be able to 'nerd out' on something that means something to people. The burnout will always be there, but I guess I just want to be able to give and not take a lesson for once.`,
    `I mean getting an advanced degree means more options, right? But if you'd have to know, I think that it'd be a nice thing to be able to teach someone on a subject and not have to be tutored on one...`,
    `Financial reasons and opportunity cost aside, getting a graduate degree would mean getting a whole new world of options no one I know has. Not many can just think and obsess about a topic and have it mean something...`
];


const ACADEMICS_EXPLANATIONS_DET = [
    `Well, when it comes to my story, I can't recall a time I haven't had ups and downs with both anxiety and depression. Add in a stressful junior year with every friend I had leaving abroad, it was a disaster waiting to happen...`,
    `I've never had a time where I wasn't dealing with anxiety or depression. My junior year was quite stressful and had all my friends leave abroad so I guess things just escalated beyond my control. My grades are still recovering unfortunately...`,
    `I can't tell you I don't have issues, we all do... mine just come in the form of anxiety and depression. Junior year was rough by all standards when it came to classes, and friends were far and few. Definitely took a toll on my grades...`
];


const ACADEMICS_EXPLANATION_SENT = [
    `I try not to be too bitter about my grades and academics, but I can't help but feel like I'm never doing enough...I think that's the phrase that sums me up the best.`,
    `I think that I'm always trying, too hard sometimes. I wish some subjects came naturally but I hate having to take focus away from schools to work on myself or take care of my wellbeing... I feel like it should all come naturally, but I digress... `,
    `I'm torn usually, I want to be the best and smartest but I'm too aware, aware of my shortcomings, aware of my failures, and it's too distracting sometimes. Of course I wish I could do better, but I'm too self-aware to think that I actually could...`
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

const HOBBIES_DETAIL = {
    'yoga': 'I do some form of sun salutation at least a few times a week and I also try to do some inverted positions. Right now I\'m a bit stuck on getting my Scorpion pose down. ',
    'hiking': `I try to go on hikes when I have the time. Thankfully I live near a few national parks which have some nice wooded trails.`, 
    'badminton': `Well I used to be on my univeristy's team, and finding a good partner and court can be tough but I still play from time to time.`,
    'video gaming' : `I constantly game and try to advance whatever quest or battle for the game I have going on. It's a nice decent distraction I think.`,
    'painting': `I paint when I have the time, mostly landscapes and a few impressionist style paintings but nothing too crazy or detailed, makes mistakes easier to deal with I guess.`,
    'reading': `I've always read since I was little. Most of it is technical reading now for work or school but I enjoy a nice novel here and there.`,
    'soccer': `I played soccer growing up so it's always brought nice memories. I need to find a good team of people to play though so it makes it a bit tough during a busy work season.`,
    'cooking': `Well I cook everday and I like to make quite the variety of food. I just need a good craving and I'm set basically, just a bit tough to find a craving sometimes.`
}

const HOBIES_BENEFIT = {
    'yoga': ['Yoga can be quite relaxing, and the stretches really feel good and make me focus.', 'Yoga makes me aware of my body in a good way, it keeps me centered.'],
    'hiking': ['Having a refreshing time in nature is always nice, and the sights and sounds make it relaxing.', 'Even hard hikes that tire you out make you stop and think about the bigger world or nature around you, makes problems seem small.'],
    'badminton': ['It was a game I used to play in highschool with friends, so the nostalgia is probably a huge factor in why I like it.', 'Badminton is pretty fast paced so you never get bored. That and the fact that raquet sports can be played in pairs (doubles) and you have that comaradarie.'],
    'video gaming': ['The reason I like it so much is because you get to see a whole new world and have a whole different set of skills or abilities than you normally do.', 'Games always have goals or quests that are pretty definite. It\'s hard to get lost or not know what to do in a game usually.'],
    'painting': ['Painting for me is true freedom, to put your dreams, nightmares or even reality on canvas.', 'Painting doesn\'t have to be about skill or aesthetics, it\'s more about how you can control the colors and shadows to embody your vision.'],
    'reading': ['Reading takes me to a whole different universe, one where I can not only enjoy new sights and sounds, but one where I can glimpse into the minds and views of others.', 'Reading lets you escape anywhere imaginable, that coupled with the fact that our mind\'s eye produces better graphics than any CGI in a movie.'],
    'soccer': ['I think that soccer shines because of it\'s mixed teamwork and solo gameplay. To be strong in your role is to support the team, and to support the team helps build your role.', 'Soccer is more about tactics, footwork, and endurance than it is about sheer strength. It also takes an entire team to make any sort of offense or defense.'],
    'cooking': ['Cooking not only nourishes your body, but it also feeds your soul. Nothing better than cooking my favorite childhood meal in my opinion.', 'Cooking lets you design and build something that will be used for yourself. The best part is being able to do it for others. It\'s a sign of love, trust and respect between people.'],
};


const HOBBIES_EXPLANATION = [
    `Well I guess most of my hobbies are more leisure activities, I just don't like anything too strenuous or taxing. If I want some active activity or exercise, I go do that, but not for funzies...`,
    `Most of my hobbies are leisurely or just brainy. I just don't want to get tired when I want to do something for fun and interest.`,
    `I don't have too many crazy hobbies, and most of them are just laid-back and leisurely. I don't like anyting too tiring, if I wanted to get tired I'd go to the gym...`
];

const RELAX_METHODS = [
    `I'm not too keen on dedicating the time for pure relaxtion, but I guess I do have some methods I use. When it comes to relaxing, I guess that I'm into mindfulness exercises, awareness and the like.`,
    `Taking a full hour to relax isn't something I do, but I have done a few things to help when I've needed it. I tend to lean more towards conciousness exercises like mindfulness meditations, breathing, etc.`,
    `The activities that actually relax me are a bit closer to home... well about the mind that is. I really think that mindfulness and awareness exercises do the best to calm me down and help put things into perspective, which is the main thing I need.`
];

const RELAX_BENEFITS = {
    'meditation' : 'Well I guess the main thing I get from meditation is that it kinda calms me down and stops me from thinking too much, which tends to be my main flaw.',
    'deep breathing' : 'I just seem to need a way to make myself stop any crazy thought spirals or breakdowns and focusing on just my breath definitely puts a damper in much of my "crazy".',
    'mindfulness' : `Well I guess it's a bit of a vague excercise but just being aware of everything can put things in perspective. I have a problem of being too aware of other sometimes, but reminding myself that they also have problems too, being mindful of that, does shift my thinking a bit and helps with empathy.`
};


const selectReasonForHobby = (given_hobby, data) => {
    var ret = '';
    if (given_hobby in data) {
        var reasonsList = data[given_hobby];
        var randIndex = (Math.floor(Math.random() * 2) == 0) ?
            0 : 1;
        ret = reasonsList[randIndex]
    } else {

        //Change to offer a question/response indicating it isn't one of the hobbies he listed
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
    constructor(options) {
        debug('Extended App constructor');
        super(options);
        this.followupEvent_ = null;
        this.actionIncomplete_ = null;
        this.session_id = this.body_.sessionId
    }



    setFollowupEvent(name, parameters) {
        debug('Extended App setFollowupEvent: debug');
        if (!name) {
            this.handleError_('Invalid context name');
            return null;
        }
        const newFollowupEvent = {
            name: name
        };
        if (parameters) {
            newFollowupEvent.data = parameters;
        }
        this.followupEvent_ = newFollowupEvent;
    }

    buildResponse_(textToSpeech, expectUserResponse, noInputs) {
        debug('Extended App buildResponse_: debug');
        let postBuilderRes = super.buildResponse_(textToSpeech, expectUserResponse, noInputs);
        if (this.followupEvent_) {
            postBuilderRes.followupEvent = this.followupEvent_;
        }
        // May have to remove ACTIONS_API_AI_CONTEXT from ask queries to prevent
        // overflow of maximum active contexts
        return postBuilderRes;
    }


    extractData_() {
        debug('Extended App extractData_: debug');
        super.extractData_();
        console.log("Extracted: " + Object.values(this.data));
        this.actionIncomplete_ = this.body_.result.actionIncomplete;
    }


    isSlotFillingRequest() {
        return this.actionIncomplete_;
    }

    getSlotsNeedingFill() {
        const contextList = this.getContexts();
        // console.log('contextList: ' + Object.keys(contextList));
        // console.log('length: ' + contextList.length);
        // console.log('Testing indexing (arr[0]):' + contextList[0]);
        const ORIGINAL_SUFFIX = '.original';
        let contextData = {};
        let emptySlots = [];
        for (let autoContext of contextList) {
            console.log('CONTEXT: ' + autoContext.name);
            //let parameters = this.getContextArgumentsObj_(autoContext.name);   DEPRECATED
            let params = autoContext.parameters;
            for (let key of Object.keys(params)) {
                if (!key.includes(ORIGINAL_SUFFIX) && params[key] === '') {
                    emptySlots.push(key);
                } else if (!key.includes(ORIGINAL_SUFFIX)) {
                    contextData[key] = params[key];
                }
            }
        }
        this.data = contextData; //May have to delete
        return emptySlots;
    }

// DEPRECATED For preference of a sorted array solution ensuring only the most long
// lived array's data get's coalesced -> might have to lower most from 5 to 3 lifespans
    // coalesceContexts() {
    //     let running_context = {
    //         name: 'running_context',
    //         lifespan: Lifespans.RUNNING
    //     };
    //     let prev_lifespan_processed;
    //     let running_context_params = {};
    //     const contextList = this.getContexts();
    //     for (let context of contextList) {
    //         let paramTemp = context.parameters;
    //         if (paramTemp !== null && typeof paramTemp !== 'undefined') {
    //             for (var [key, value] of Object.entries(paramTemp)) {
    //                 if (!running_context_params.hasOwnProperty(key)) {
    //                     running_context_params[key] = value;
    //                 } else {
    //                     //Checks to see if longer living than previous encountered
    //                     if (context.lifespan > prev_lifespan_processed) {
    //                         running_context_params[key] = value;
    //                     }
    //                 }
    //             }
    //         }
    //         prev_lifespan_processed = context.lifespan;
    //     }
    //     running_context['parameters'] = running_context_params;
    // }



    coalesceContexts() {

        function compareByLifespan(a, b) {
            return a.lifespan - b.lifespan;
        }



        let running_context = {
            name: 'running_context',
            lifespan: 100
        };
        let running_context_params = {};
        //   const contextList = this.getContexts();
        var contextList = this.getContexts().sort(compareByLifespan);
        console.log('Sorted array by lifespans');
        for (let context of contextList) {
            let paramTemp = context.parameters;
            if (paramTemp !== null && typeof paramTemp !== 'undefined') {
                console.log(`Parameter list for ${context.name} was not null.`);
                for (var [key, value] of Object.entries(paramTemp)) {
                    if (!running_context_params.hasOwnProperty(key)) {
                        console.log(`NO entry with (k:${key}, v:${value}) found in running context.`);
                        running_context_params[key] = value;
                    } else {
                        //Checks to see if longer living than previous encountered
                        console.log(`PREV entry with k:${key} found in running context, won't add...`);
                        /*if (context.lifespan > prev_lifespan_processed) {
                          
                          running_context_params[key] = value;
                        }*/
                    }
                }
            }
        }
        running_context['parameters'] = running_context_params;
        return running_context;
    }




    persistAllIncomingContexts() {
        const contextList = this.getContexts();
        for (let context of contextList) {
            this.setContext(context.name, context.lifespan, context.parameters);
        }
    }

    persistTempContextForSlotFilling() {
        const name = this.body_.result.metadata.intentId + '_id_dialog_context';
        console.log('intent specific ID: ' + name);
        const contextList = this.getContexts();
        for (let context of contextList) {
            if (context.name === name) {
                this.setContext(context.name, context.lifespan, context.parameters);
            }
        }
    }


    getSessionId() {
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
    // initData(app);


    function getAcademics(app) {
        logUserResponse(app);
        let AcademicsResp = app.data.AcademicsResp ?
            app.data.AcademicsResp : ACADEMICS_RESPONSES;
        var retMessage = getRandomValue(AcademicsResp);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }


    function getAcademicsFuture(app) {
        logUserResponse(app);
        let AcademicsFutureResp = app.data.AcademicsFutureResp ?
            app.data.AcademicsFutureResp : ACADEMICS_FUTURE_RESPONSES;
        var retMessage = getRandomValue(AcademicsFutureResp);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }


    function getAcademicsGoals(app) {
        logUserResponse(app);
        let AcademicsGoalsResp = app.data.AcademicsGoalsResp ?
            app.data.AcademicsGoalsResp : ACADEMICS_GOALS_RESPONSES;
        var retMessage = getRandomValue(AcademicsGoalsResp);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }

    function expAcademics(app) {
        logUserResponse(app);
        let AcademicsExplan = app.data.AcademicsExplan ?
            app.data.AcademicsGoalsResp : ACADEMICS_EXPLANATIONS;
        var retMessage = getRandomValue(AcademicsExplan);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }

    function expAcademicsGoals(app){
        logUserResponse(app);
        let AcademicsGoalsExp = app.data.AcademicsGoalsExp ?
            app.data.AcademicsGoalsResp : ACADEMICS_EXPLANATIONS;
        var retMessage = getRandomValue(AcademicsGoalsExp);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }

    function expAcademicsFuture(app){
        // const running_context = app.coalesceContexts();
        logUserResponse(app);
        let AcademicsFutureExp = app.data.AcademicsFutureExp ?
            app.data.AcademicsGoalsResp : ACADEMICS_EXPLANATIONS;
        var retMessage = getRandomValue(AcademicsFutureExp);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }

    function expAcademicsDetailed(app){
        // const running_context = app.coalesceContexts();
        logUserResponse(app);
        let AcademicsDetExp = app.data.AcademicsDetExp ?
            app.data.AcademicsGoalsResp : ACADEMICS_EXPLANATIONS_DET;
        var retMessage = getRandomValue(AcademicsDetExp);
        logAgentResponse(app, retMessage);
        // app.setContext(running_context); //USED FOR TESTING CHECK COALESCE
        return app.tell(retMessage);
    }

    function expAcademicsSentiment(app){
        // const running_context = app.coalesceContexts(); // HANDLE CONTEXTS HERE
        logUserResponse(app);
        let AcademicsResp = app.data.AcademicsResp ?
            app.data.AcademicsResp : ACADEMICS_RESPONSES;
        var retMessage = getRandomValue(AcademicsResp);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }






    function getFinalsDetail(app) {
        console.log('getFinalsDetail');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {

            //REWORK REQUEST FULFILLMENT ----> Tracking, seems that
            //API.AI will not take an event for the same intent and requires
            //A complete second intent for the slot filling example

            //TO TEST OUT EXTENSION and WEB HOOK FILL
            // const params = {
            //   course : 'CS224S'
            // };
            // app.setFollowupEvent('specify-course-event', params);
            const emptySlots = app.getSlotsNeedingFill();
            //assert(emptySlots[0] === 'course', 'Malformed context bound for detailed intent'); 
            // Check for failure insert at
            var retMessage = getRandomValue(ACADEMICS_SLOTFILL);
            app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
            app.persistTempContextForSlotFilling();
            logAgentResponse(app, retMessage);
            return app.ask(retMessage); //VS ask?
        }
        var courseName = app.getArgument(Parameters.COURSE_ARG);
        assert(courseName != '', "Empty string found for course_name");
        let finalsData = app.data.finalsData ?
            app.data.finalsData : FINALS_DATA;
        var finalsList = getFinalsData(courseName, finalsData);
        let finalsPrefix = `Sure, I guess I can tell you a bit about my final for ${courseName}.\n`;
        if (finalsList.length > 1) {
            finalsPrefix = finalsPrefix.replace("final", "finals");
            let numFinals = finalsList.length;
            let multiPrefix = `I have a total of ${numFinals} for that class. \n`;
            var retStr = finalsPrefix + multiPrefix + finalsList;
            logAgentResponse(app, retStr);
            return app.tell(retStr);
        } else if (finalsList.length == 1) {
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

    function getFinalsDetProgress(app) {
        console.log('getFinalsDetail');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {

            //REWORK REQUEST FULFILLMENT ----> Tracking, seems that
            //API.AI will not take an event for the same intent and requires
            //A complete second intent for the slot filling example

            //TO TEST OUT EXTENSION and WEB HOOK FILL
            // const params = {
            //   course : 'CS224S'
            // };
            // app.setFollowupEvent('specify-course-event', params);
            const emptySlots = app.getSlotsNeedingFill();
            //assert(emptySlots[0] === 'course', 'Malformed context bound for detailed intent'); 
            // Check for failure insert at
            var retMessage = getRandomValue(ACADEMICS_SLOTFILL); //CHANGE TO FINALS SLOT FILL
            app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
            app.persistTempContextForSlotFilling();
            logAgentResponse(app, retMessage);
            return app.ask(retMessage); //VS ask?
        }
        var courseName = app.getArgument(Parameters.COURSE_ARG);
        assert(courseName != '', "Empty string found for course_name");
        let finalsData = app.data.finalsData ?
            app.data.finalsData : FINALS_DATA;
        var finalsList = getFinalsData(courseName, finalsData);
        var ret;
        let finalsPrefix = `Well, I can mention a bit about the progress of my final for ${courseName}.\n`;
        if (finalsList.length > 1) {
            finalsPrefix = finalsPrefix.replace("final", "finals");
            ret = finalsPrefix;
            for(let finalObj of finalsList){
                let percent = finalObj.progress * 100;
                ret += `I'm around ${percent.toFixed(0)}% done with my ${finalObj.type} for ${finalObj.course}. `;
            }
            logAgentResponse(app, ret);
            return app.tell(ret);
        } else if (finalsList.length == 1) {
            let finalObj = finalsList[0];
            let percent = finalObj.progress * 100;
            ret = finalsPrefix + `I'm around ${percent.toFixed(0)}% done with my ${finalObj.type} for ${finalObj.course}. `;
            logAgentResponse(app, ret);
            return app.tell(ret);
        }

        return;
    }


    function getFinalsDetSpecs(app){
        console.log('getFinalsDetSpecs');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {
            const emptySlots = app.getSlotsNeedingFill();
            var retMessage = getRandomValue(ACADEMICS_SLOTFILL); //CHANGE TO FINALS SLOT FILL
            app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
            app.persistTempContextForSlotFilling();
            logAgentResponse(app, retMessage);
            return app.ask(retMessage); //VS ask?
        }
        var courseName = app.getArgument(Parameters.COURSE_ARG);
        assert(courseName != '', "Empty string found for course_name");
        let finalsData = app.data.finalsData ?
            app.data.finalsData : FINALS_DATA;
        var finalsList = getFinalsData(courseName, finalsData);
        var ret;
        let finalsPrefix = `Well, I can mention a bit about the progress of my final for ${courseName}.\n`;
        if (finalsList.length > 1) {
            finalsPrefix = finalsPrefix.replace("final", "finals");
            ret = finalsPrefix;
            for(let finalObj of finalsList){
                ret += finalObj.getSpecs();
            }
            logAgentResponse(app, ret);
            return app.tell(ret);
        } else if (finalsList.length == 1) {
            let finalObj = finalsList[0];
            ret = finalsPrefix + finalObj.getSpecs();
            logAgentResponse(app, ret);
            return app.tell(ret);
        }
        return;
    }

    function expFinals(app){
        logUserResponse(app);
        let finalsExp = app.data.finalsExp ?
            app.data.finalsExp : FINALS_EXPLANATION;
        var retMessage = getRandomValue(finalsExp);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }

    function expFinalsDetailed(app){
        console.log('expFinalsDetailed');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {
            const emptySlots = app.getSlotsNeedingFill();
            var retMessage = getRandomValue(ACADEMICS_SLOTFILL); //CHANGE TO FINALS SLOT FILL
            app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
            app.persistTempContextForSlotFilling();
            logAgentResponse(app, retMessage);
            return app.ask(retMessage); //VS ask?
        }
        var courseName = app.getArgument(Parameters.COURSE_ARG);
        assert(courseName != '', "Empty string found for course_name");
        console.log("Coursename: ", courseName);
        let finalsData = app.data.finalsData ?
            app.data.finalsData : FINALS_DATA;
        var finalsList = getFinalsData(courseName, finalsData);
        var ret;
        let finalsPrefix = `I could go on and on about my final for ${courseName}.\n`;
        console.log("Prefix: ", finalsPrefix);
        if (finalsList.length > 1) {
            finalsPrefix = finalsPrefix.replace("final", "finals");
            ret = finalsPrefix;
            for(let finalObj of finalsList){
                ret += finalObj.explainDetailed();
            }
            logAgentResponse(app, ret);
            return app.tell(ret);
        } else if (finalsList.length == 1) {
            let finalObj = finalsList[0];
            ret = finalsPrefix + finalObj.explainDetailed();
            logAgentResponse(app, ret);
            return app.tell(ret);
        }
        return;
    }

    function expFinalsSentiment(app){
        console.log('expFinalsSentiment');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {
            const emptySlots = app.getSlotsNeedingFill();
            var retMessage = getRandomValue(ACADEMICS_SLOTFILL); //CHANGE TO FINALS SLOT FILL
            app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
            app.persistTempContextForSlotFilling();
            logAgentResponse(app, retMessage);
            return app.ask(retMessage); //VS ask?
        }
        var courseName = app.getArgument(Parameters.COURSE_ARG);
        assert(courseName != '', "Empty string found for course_name");
        let finalsData = app.data.finalsData ?
            app.data.finalsData : FINALS_DATA;
        var finalsList = getFinalsData(courseName, finalsData);
        var ret;
        let finalsPrefix = `Well, I can mention a bit about the progress of my final for ${courseName}.\n`;
        if (finalsList.length > 1) {
            finalsPrefix = finalsPrefix.replace("final", "finals");
            ret = finalsPrefix;
            for(let finalObj of finalsList){
                ret += finalObj.getSentiment();
            }
            logAgentResponse(app, ret);
            return app.tell(ret);
        } else if (finalsList.length == 1) {
            let finalObj = finalsList[0];
            ret = finalsPrefix + finalObj.getSentiment();
            logAgentResponse(app, ret);
            return app.tell(ret);
        }
        return;
    }

    function expFinalsProgress(app){
        console.log('expFinalsProgress');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {
            const emptySlots = app.getSlotsNeedingFill();
            var retMessage = getRandomValue(ACADEMICS_SLOTFILL); //CHANGE TO FINALS SLOT FILL
            app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
            app.persistTempContextForSlotFilling();
            logAgentResponse(app, retMessage);
            return app.ask(retMessage); //VS ask?
        }
        var courseName = app.getArgument(Parameters.COURSE_ARG);
        assert(courseName != '', "Empty string found for course_name");
        let finalsData = app.data.finalsData ?
            app.data.finalsData : FINALS_DATA;
        var finalsList = getFinalsData(courseName, finalsData);
        var ret;
        let finalsPrefix = `Well, I can mention a bit about the progress of my final for ${courseName}.\n`;
        if (finalsList.length > 1) {
            finalsPrefix = finalsPrefix.replace("final", "finals");
            ret = finalsPrefix;
            for(let finalObj of finalsList){
                ret += finalObj.explainProgress();
            }
            logAgentResponse(app, ret);
            return app.tell(ret);
        } else if (finalsList.length == 1) {
            let finalObj = finalsList[0];
            ret = finalsPrefix + finalObj.explainProgress();
            logAgentResponse(app, ret);
            return app.tell(ret);
        }
        return;
    }

    function expFinalsPlan(app){
        console.log('expFinalsPlan');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {
            const emptySlots = app.getSlotsNeedingFill();
            var retMessage = getRandomValue(ACADEMICS_SLOTFILL); //CHANGE TO FINALS SLOT FILL
            app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
            app.persistTempContextForSlotFilling();
            logAgentResponse(app, retMessage);
            return app.ask(retMessage); //VS ask?
        }
        var courseName = app.getArgument(Parameters.COURSE_ARG);
        assert(courseName != '', "Empty string found for course_name");
        let finalsData = app.data.finalsData ?
            app.data.finalsData : FINALS_DATA;
        var finalsList = getFinalsData(courseName, finalsData);
        var ret;
        let finalsPrefix = `I do have a plan for my final for ${courseName}.\n`;
        if (finalsList.length > 1) {
            finalsPrefix = finalsPrefix.replace("final", "finals");
            ret = finalsPrefix;
            for(let finalObj of finalsList){
                ret += finalObj.explainPlan();
            }
            logAgentResponse(app, ret);
            return app.tell(ret);
        } else if (finalsList.length == 1) {
            let finalObj = finalsList[0];
            ret = finalsPrefix + finalObj.explainPlan();
            logAgentResponse(app, ret);
            return app.tell(ret);
        }
        return;
    }


    function expFinalsStudyHabit(app){
        console.log('expFinalsStudyHabit');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {
            const emptySlots = app.getSlotsNeedingFill();
            var retMessage = getRandomValue(ACADEMICS_SLOTFILL); //CHANGE TO FINALS SLOT FILL
            app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
            app.persistTempContextForSlotFilling();
            logAgentResponse(app, retMessage);
            return app.ask(retMessage); //VS ask?
        }
        var courseName = app.getArgument(Parameters.COURSE_ARG);
        assert(courseName != '', "Empty string found for course_name");
        let finalsData = app.data.finalsData ?
            app.data.finalsData : FINALS_DATA;
        var finalsList = getFinalsData(courseName, finalsData);
        var ret;
        let finalsPrefix = `I do have a plan for my final for ${courseName}.\n`;
        if (finalsList.length > 1) {
            finalsPrefix = finalsPrefix.replace("final", "finals");
            ret = finalsPrefix;
            for(let finalObj of finalsList){
                ret += finalObj.explainStudyHabit();
            }
            logAgentResponse(app, ret);
            return app.tell(ret);
        } else if (finalsList.length == 1) {
            let finalObj = finalsList[0];
            ret = finalsPrefix + finalObj.explainStudyHabit();
            logAgentResponse(app, ret);
            return app.tell(ret);
        }
        return;
    }







    function getRelaxMethods(app){
        console.log('getRelaxMethods');
        logUserResponse(app);
        let relaxMethods = app.data.relaxMethods ?
            app.data.relaxMethods : RELAX_BENEFITS;
        let methods = Object.keys(relaxMethods);
        let methodStr = methods.join(', ');
        let ret = `In terms of relaxation, I tend to do some ${methodStr}`;
        logAgentResponse(app, ret);
        return app.tell(ret);
    }

    function expRelaxMethods(app) {
        console.log('expRelaxMethods');
        logUserResponse(app);
        let relaxMethods = app.data.relaxMethods ?
            app.data.relaxMethods : RELAX_METHODS;
        var retMessage = getRandomValue(relaxMethods);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }

    function expRelaxBenefits(app){
        console.log('getRelaxDet');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {
            const emptySlots = app.getSlotsNeedingFill();
            // assert(emptySlots[0] === 'hobby', 'Malformed context bound for detailed intent');
            var retMessage = getRandomValue(RELAX_SLOTFILL);
            app.setFollowupEvent(Events.SLOT_FILL.replace('*', emptySlots[0]), app.data);
            app.persistTempContextForSlotFilling();
            logAgentResponse(app, retMessage);
            return app.ask(retMessage); //VS ask?
        }
        var relaxName = app.getArgument(Parameters.RELAX_ARG);
        assert(relaxName != null, "Empty string found for relax_name");
        let relaxData = app.data.relaxData ?
            app.data.relaxData : RELAX_DATA;
        var hobbiesBenefit = relaxData[relaxName];
        let relaxPrefix = `I mean, I guess there are many benefits to ${relaxName}. `;
        var retStr = relaxPrefix + hobbiesBenefit;
        logAgentResponse(app, retStr);
        return app.tell(retStr);
    }




    function expHobbies(app){
        console.log('expHobbies');
        logUserResponse(app);
        let hobbiesExp = app.data.hobbiesExp ?
            app.data.hobbiesExp : HOBBIES_EXPLANATION;
        let ret = getRandomValue(hobbiesExp);
        logAgentResponse(app, ret);
        return app.tell(ret);
    }

    function getHobbiesDetail(app) {
        console.log('getHobbiesDetail');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {
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
        let hobbiesDetData = app.data.hobbiesDetData ?
            app.data.hobbiesDetData : HOBBIES_DETAIL;
        var hobbiesDetail = hobbiesDetData[hobbyName]
        let hobbiesPrefix = `Well, there's a bit to me liking ${hobbyName}. `;
        var retStr = hobbiesPrefix + hobbiesDetail;
        logAgentResponse(app, retStr);
        return app.tell(retStr);
    }

    function expHobbiesBenefit(app) {
        console.log('expHobbiesBenefit');
        logUserResponse(app);
        const requiresFilling = app.isSlotFillingRequest();
        if (requiresFilling) {
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
        let hobbiesData = app.data.hobbiesData ?
            app.data.hobbiesData : HOBIES_BENEFIT;
        var hobbiesReasoning = selectReasonForHobby(hobbyName, hobbiesData);
        let hobbiesPrefix = `I mean, I guess there are many reasons why I like ${hobbyName}. `;
        var retStr = hobbiesPrefix + hobbiesReasoning;
        logAgentResponse(app, retStr);
        return app.tell(retStr);
    }

    function launchWelcome(app) {
        
        logUserResponse(app);
        let welcomeGreeting = app.data.welcomeGreeting ?
            app.data.welcomeGreeting : GREETINGS;
        var retMessage = getRandomValue(welcomeGreeting);
        logAgentResponse(app, retMessage);
        return app.tell(retMessage);
    }

    function handleDefault(app){
        logUserResponse(app);
        let running_context = app.coalesceContexts();
        console.log('Checking running_context construction...');
        Object.entries(running_context).forEach( ([key, value]) => {
            console.log(`Key: ${key} => ${value}`);
        });
        let input = app.getRawInput();
    }


    let actionMap = new Map();
    //ACADEMICS MAPPED
    actionMap.set(Actions.GET_ACADEMICS, getAcademics);
    actionMap.set(Actions.GET_ACADEMICS_FUTURE, getAcademicsFuture);
    actionMap.set(Actions.GET_ACADEMICS_GOALS, getAcademicsGoals);
    actionMap.set(Actions.EXP_ACADEMICS, expAcademics);
    actionMap.set(Actions.EXP_ACADEMICS_DETAILED, expAcademicsDetailed);
    actionMap.set(Actions.EXP_ACADEMICS_GOALS, expAcademicsGoals);
    actionMap.set(Actions.EXP_ACADEMICS_FUTURE, expAcademicsFuture);
    actionMap.set(Actions.EXP_ACADEMICS_SENTIMENT, expAcademicsSentiment);

    // HOBBIES MAPPED
    actionMap.set(Actions.GET_HOBBIES_DETAILED, getHobbiesDetail);
    actionMap.set(Actions.EXP_HOBBIES, expHobbies);
    actionMap.set(Actions.EXP_HOBBIES_BENEFIT, expHobbiesBenefit);


    //RELAX MAPPED
    actionMap.set(Actions.GET_RELAX, getRelaxMethods);
    actionMap.set(Actions.EXP_RELAX, expRelaxMethods);
    actionMap.set(Actions.EXP_RELAX_BENEFIT, expRelaxBenefits);


    //FINALS MAPPED
    actionMap.set(Actions.GET_FINALS_DETAILED, getFinalsDetail);
    actionMap.set(Actions.GET_FINALS_DETPROGRESS, getFinalsDetProgress);
    actionMap.set(Actions.GET_FINALS_DETSPECS, getFinalsDetSpecs);
    actionMap.set(Actions.EXP_FINALS, expFinals);
    actionMap.set(Actions.EXP_FINALS_DETAILED, expFinalsDetailed);
    actionMap.set(Actions.EXP_FINALS_SENTIMENT, expFinalsSentiment);
    actionMap.set(Actions.EXP_FINALS_PROGRESS, expFinalsProgress);
    actionMap.set(Actions.EXP_FINALS_PLAN, expFinalsPlan);
    actionMap.set(Actions.EXP_FINALS_STUDYHABIT, expFinalsStudyHabit);

    actionMap.set(Actions.WELCOME, launchWelcome);
    actionMap.set(Actions.FALLBACK, handleDefault);
    app.handleRequest(actionMap);
});