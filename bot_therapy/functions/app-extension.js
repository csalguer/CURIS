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

const ApiAiApp = require('actions-on-google').ApiAiApp;


class App extends ApiAiApp {
  constructor(options){
    debug('Extended App constructor');
    super(options);
    this.followupEvent_ = null;
    this.actionIncomplete_ = null;
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