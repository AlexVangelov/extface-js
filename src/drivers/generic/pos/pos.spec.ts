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
import { GenericPos } from './';
import { DeviceSimulator } from '../../../utils/deviceSimulator';

describe('GenericPos', () => {
  let sim = new DeviceSimulator('posprintdevice', GenericPos, {});

  it.only('session', (done) => {
    let session = GenericPos.session('posprintdevice', 'Session Test')
      .do((ds) => { });
    session.once('done', done);
    session.once('ready', () => {
      sim.cycle(session.uuid);
    });
  });

  it.only('test page', (done) => {
    let session = GenericPos.printTestPage('posprintdevice', done);
    session.once('ready', () => {
      sim.cycle(session.uuid);
    });
  });
});