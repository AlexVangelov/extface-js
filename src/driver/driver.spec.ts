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
  let driver: ExtfaceDriver;
  let handler: ExtfaceHandler; //Simulate API Gateway

  beforeEach((done) => {
    driver = new TestDriver1(DEVICE_ID);
    handler = new ExtfaceHandler(DEVICE_ID, driver);
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

  it('handle', (done) => {
    driver.handle('123', (err, bytesProcessed) => {
      expect(err).to.be.null;
      expect(bytesProcessed).to.equal(3);
      done();
    })
  });

  it('push', (done) => {
    driver.push('234', (err, bytesProcessed) => {
      expect(bytesProcessed).to.equal(3);
      done();
    });
  });

  it('session', (done) => {
    let session = TestDriver1.session('abc', 'Test session');
    session.on('done', done);
    session.do((ds: TestDriver1) => {
      let sim = new DeviceSimulator('abc', ds, {});
      sim.cycle(ds.sessionId);
      session.done();
    });
  });

  it('session timeout', (done) => {
    let deviceId = 'abcdef';
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('error', (err)=> {
        expect(err.message).to.equal('Timeout waiting for device to connect');
        done();
      })
      .do((ds: TestDriver1) => {});
  });

  it('session connected', (done) => {
    let deviceId = 'abcdef';
    let onConnected = spy();
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('connected', onConnected)
      .once('done', done)
      .do((ds: TestDriver1) => {
        let sim = new DeviceSimulator(deviceId, ds, {});
        sim.cycle(ds.sessionId);
        expect(onConnected).to.have.been.called();
        done();
      });
  });

  it('session fiber', (done) => {
    let deviceId = 'abcdef';
    let cbs = {
      onConnected: spy()
    }
    let session = TestDriver1.session(deviceId, 'Test session')
      .once('connected', cbs.onConnected)
      .on('message', (text) => {
        console.log(`message: '${text}'`);
      })
      .once('error', (err) => {
        throw err; // expose in test environment
      })
      .once('done', done)
      .do((ds: TestDriver1) => {
        let sim = new DeviceSimulator(deviceId, ds, {});
        sim.cycle(ds.sessionId);
        expect(cbs.onConnected).to.have.been.called();
        let l = ds.push('123');
        expect(l).to.equal(3);
        session.done();
      });
  });

  it('session body', (done) => {
    let session = TestDriver1.session('abc', 'Test session');
    session.on('done', done);
    session.do((ds: IExtfaceDriver) => {
      ds.push('567');
      ds.push('status?');
      if (ds.pull(1) === 'OK') {
        console.log('Extface Rocks!');
        ds.push('1');
        session.notify('Extface Rocks!');
      } else {
        console.log('Extface Sucks!');
        ds.push('2');
      }
      session.done();
    });
  });
});