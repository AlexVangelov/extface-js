//    Copyright 2017 Alex Vangelov <email@data.bg>
// 
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
// 
//        http://www.apache.org/licenses/LICENSE-2.0
// 
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

import { ExtfaceDriver } from './';

export class ExtfaceDriverContext {
  sessionId: string;

  constructor(driver: ExtfaceDriver) {
    let origDriver = driver;
    this.sessionId = driver.session.uuid;
    do {
      Object.getOwnPropertyNames(driver).forEach((p) => {
        if (p !== 'constructor' && typeof this[p] === 'undefined' && typeof driver[p] === 'function') {
          this[p] = (...a)=> { 
            return origDriver[p].sync(origDriver, ...a); 
          }; 
        }
      });
    } while ((driver = Object.getPrototypeOf(driver)) && driver != Object.prototype);
  }

  static connectTimeoutMs = 6000;
}