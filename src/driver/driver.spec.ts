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

import { expect, use, spy } from 'chai';
//import { expect } from 'chai'; //with typings
let spies = require('chai-spies');
use(spies);

let redis = require('redis');

import { ExtfaceDriver } from './';
import { ExtfaceHandler } from '../handler';
import { IExtfaceDriver } from './interface';
import { DeviceSimulator } from '../utils/deviceSimulator';
import { ExtfaceDriverContext } from './context';

const DEVICE_ID = 'abc';

class TestDriver1 extends ExtfaceDriver {
  static NAME = "TestDriver1";

  static handle(deviceId, sessionId, buffer: any, callback?: (err: Error, bytesProcessed: number) => void) {
    let r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    r.rpush(`${deviceId}:${sessionId}`, buffer);
    callback && callback(null, buffer.length); //return number of bytes processed
  }
}
class TestDriver2 extends ExtfaceDriver {
  static NAME = "TestDriver2";
  static PRINT = true;
}

describe('Driver', () => {
  let deviceId = 'abcdef';
  let sim = new DeviceSimulator(deviceId, TestDriver1, {});

  beforeEach((done) => {
    ExtfaceDriverContext.defaultTimeoutMs = 100;
    done();
  });

  it('extend', () => {
    expect(TestDriver1.NAME).to.equal('TestDriver1');
    expect(TestDriver1.RAW).to.be.true;
    expect(TestDriver1.PRINT).to.be.false;
  });

  it('extend meta', () => {
    expect(TestDriver2.NAME).to.equal('TestDriver2');
    expect(TestDriver2.RAW).to.be.true;
    expect(TestDriver2.PRINT).to.be.true;
  });

  // it('handle', (done) => {
  //   driver.handle('123', (err, bytesProcessed) => {
  //     expect(err).to.be.null;
  //     expect(bytesProcessed).to.equal(3);
  //     done();
  //   })
  // });

  // it('push', (done) => {
  //   driver.push('234', (err, bytesProcessed) => {
  //     expect(bytesProcessed).to.equal(3);
  //     done();
  //   });
  // });

  it('session', (done) => {
    let onNotify = spy();
    let session = TestDriver1.session(deviceId, 'Test session');
    session.once('done', ()=>{
      expect(onNotify).to.have.been.called();
      done()
    });
    session.on('notify', onNotify);
    session.do((ds: TestDriver1) => {
      session.notify("Session started");
    });
    session.once('ready', () => {
      sim.cycle(session.uuid);
    });
  });

  it('session timeout', (done) => {
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('error', (err) => {
        expect(err.message).to.equal('Timeout waiting for device to connect (after 0.1s)');
        done();
      })
      .do((ds: TestDriver1) => { });
  });

  it('session device invite', (done) => {
    let onInvite = spy();
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('ready', () => {
        sim.cycle(session.uuid); //for connect
      })
      .once('invite', onInvite)
      .once('done', done)
      .do((ds: TestDriver1) => {
        expect(onInvite).to.have.been.called();
      });
  });

  it('session connected', (done) => {
    let onConnected = spy();
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('ready', () => {
        sim.cycle(session.uuid); //for connect
      })
      .once('connected', onConnected)
      .once('done', done)
      .do((ds: TestDriver1) => {
        expect(onConnected).to.have.been.called();
      });
  });

  it('session fiber', (done) => {
    let cbs = {
      onConnected: spy()
    }
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('ready', () => {
        sim.cycle(session.uuid); //for connect
      })
      .once('connected', cbs.onConnected)
      .once('error', (err) => {
        throw err; // expose in test environment
      })
      .once('done', done)
      .do((ds: TestDriver1) => {
        expect(cbs.onConnected).to.have.been.called();
        let l = ds.push('123');
        expect(l).to.equal(3);
      });
  });

  it('session body', (done) => {
    let session = TestDriver1.session(deviceId, 'Test session');
    session.once('done', done);
    session.do((ds: IExtfaceDriver) => {
      ds.push('567');
      ds.push('status?');
      if (ds.pull(1) === 'OK') {
        console.log('Extface Rocks!');
        ds.push('*1');
        session.notify('Extface Rocks!');
      } else {
        console.log('Extface Sucks!');
        ds.push('*2');
      }
    });
    session.once('ready', () => {
      sim.cycle(session.uuid);
    });
  });

  it('long session', (done) => {
    let session = TestDriver1.session(deviceId, 'Long session')
      .once('ready', () => {
        sim.cycle(session.uuid); //for connect
      })
      .once('error', (err) => {
        throw err; // expose in test environment
      })
      .once('done', done)
      .do((ds: TestDriver1) => {
        for (let i = 0; i < 100; i++) {
          ds.push('123');
        }
      });
  });
});