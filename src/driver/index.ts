import * as uuid from 'uuid/v4';
import { ExtfaceSession } from '../session';
import { IExtfaceDriver } from './interface';

export interface IExtfaceDriverClass<T extends ExtfaceDriver> {
  new (...a: any[]): T
}

export abstract class ExtfaceDriver implements IExtfaceDriver {
  static NAME: string;//human driver name

  static DEVELOPMENT = true //driver is not ready for production (not passing all tests or has major bugs)

  //Select driver features
  static RAW = true  //responds to #push(data) and #pull
  static PRINT = false //POS, slip printers
  static FISCAL = false //cash registers, fiscal printers
  static REPORT = false //only transmits data that must be parsed by the handler, CDR, report devices

  deviceId: string;
  sessionId: string;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.sessionId = uuid();
  }

  handle(buffer: any, callback: (err: Error, bytesProcessed: number) => void) {
    //console.log(`Extface:${this.deviceId} PUSH ${buffer}`);
    callback(null, buffer.length); //return number of bytes processed
  }

  push(buffer: any, callback?: (err: Error, bytesProcessed: number) => void) {
    setTimeout(()=>{
      console.log('async push', buffer, this.sessionId);
      callback && callback(null, buffer.length);
    },10);
  }

  pull(timeout: number, callback: (err: Error, data: any) => void) {
    setTimeout(()=>{
      callback && callback(null, 'fake data');
    }, timeout*1000);
  }

  flush(callback: (err: Error, data: any) => void) {

  }

  rpush(buffer: any, callback: (err: Error, data: any) => void) {

  }

  notify(message: string) {

  }

  checkStatus(callback: (err: Error, data: boolean) => void) {
    callback(null, false);
  }

  private get _bufferKey() {
    return `${this.deviceId}:${this.sessionId}`;
  }

  static session<T extends ExtfaceDriver>(this: IExtfaceDriverClass<T>, deviceId: string, name: string): ExtfaceSession {
    let session = new ExtfaceSession(new this(deviceId));
    return session;
  }
}