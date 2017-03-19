import { expect, use, spy } from 'chai';
//import { expect } from 'chai'; //with typings
let spies = require('chai-spies');
use(spies);

import * as redis from 'redis';

import { ExtfaceDriver } from './';
import { ExtfaceHandler } from '../handler';
import { IExtfaceDriver } from './interface';
import { DeviceSimulator } from '../utils/deviceSimulator';

const DEVICE_ID = 'abc';

class TestDriver1 extends ExtfaceDriver {
  static NAME = "TestDriver1";
}
class TestDriver2 extends ExtfaceDriver {
  static NAME = "TestDriver2";
  static PRINT = true;
}

describe('Driver', () => {
  let deviceId = 'abcdef';
  let sim = new DeviceSimulator(deviceId, TestDriver1, {});

  beforeEach((done) => {
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
    let session = TestDriver1.session(deviceId, 'Test session');
    session.on('done', done);
    session.do((ds: TestDriver1) => {
      session.done();
    });
    sim.cycle(session.uuid);
  });

  it('session timeout', (done) => {
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('error', (err)=> {
        expect(err.message).to.equal('Timeout waiting for device to connect');
        done();
      })
      .do((ds: TestDriver1) => {});
  });

  it('session connected', (done) => {
    let onConnected = spy();
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('connected', onConnected)
      .once('done', done)
      .do((ds: TestDriver1) => {
        expect(onConnected).to.have.been.called();
        done();
      });
    sim.cycle(session.uuid);
  });

  it('session fiber', (done) => {
    let cbs = {
      onConnected: spy()
    }
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('connected', cbs.onConnected)
      .once('error', (err) => {
        throw err; // expose in test environment
      })
      .once('done', done)
      .do((ds: TestDriver1) => {
        expect(cbs.onConnected).to.have.been.called();
        let l = ds.push('123');
        expect(l).to.equal(3);
        session.done();
      });
    sim.cycle(session.uuid); //for connect
  });

  it('session body', (done) => {
    let session = TestDriver1.session('abc', 'Test session');
    session.on('done', done);
    session.do((ds: IExtfaceDriver) => {
      ds.push('567');
      ds.push('status?');
      sim.cycle(session.uuid);
      if (ds.pull(1) === 'OK') {
        console.log('Extface Rocks!');
        ds.push('*1');
        session.notify('Extface Rocks!');
      } else {
        console.log('Extface Sucks!');
        ds.push('*2');
      }
      session.done();
    });
    sim.cycle(session.uuid);
  });
});