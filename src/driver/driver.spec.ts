import { expect } from 'chai';
import * as redis from 'redis';

import { ExtfaceDriver } from './';
import { ExtfaceHandler } from '../handler';

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
    driver.push('234', (err, bytesProcessed)=> {

    });
    done();
  });
});