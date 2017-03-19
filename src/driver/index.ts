import { ExtfaceSession } from '../session';
import { IExtfaceDriver } from './interface';
let redis = require('redis');

export interface IExtfaceDriverClass<T extends ExtfaceDriver> {
  handle(sessionId: string, buffer: any, callback: (err: Error, bytesProcessed: number) => void);
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
  session: ExtfaceSession;
  private r: any;

  constructor(deviceId: string, session) {
    this.deviceId = deviceId;
    this.session = session;
    this.r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
  }

  static handle(sessionId, buffer: any, callback: (err: Error, bytesProcessed: number) => void) {
    //console.log(`Extface:${this.deviceId} PUSH ${buffer}`);
    callback(null, buffer.length); //return number of bytes processed
  }

  push(buffer: any, callback?: (err: Error, bytesProcessed: number) => void) {
    let tmo = setTimeout(() => {
      this.r.unsubscribe();
      callback && callback(new Error('Timeout waiting on queue'), 0);
    }, 1000);
    this.r.on('message', (channel, out) => {
      if (out !== '-1') {
        clearTimeout(tmo);
        this.session.bytesOut += parseInt(out);
        this.r.unsubscribe((err, res)=> {
          callback && callback(err, buffer.length);
        });
      }
    });
    this.r.on('subscribe', () => {
      this.session.rpush(buffer, (err, data)=>{
        if (err) {
          clearTimeout(tmo);
          this.r.unsubscribe((err, res)=>{
            callback(err, 0);
          });
        }
      });
    });
    this.r.subscribe(this.session.uuid);
  }

  pull(timeout: number, callback: (err: Error, data: any) => void) {
    setTimeout(() => {
      callback && callback(null, 'OK');
    }, 0);
  }

  flush(callback?: (err: Error, data: any) => void) {
    //console.log('flush!');
  }

  rpush(buffer: any, callback: (err: Error, data: any) => void) {

  }

  notify(message: string) {

  }

  checkStatus(callback: (err: Error, data: boolean) => void) {
    callback(null, false);
  }

  quit() {
    this.r.quit();
  }

  private get _bufferKey() {
    return `${this.deviceId}:${this.session}`;
  }

  static session<T extends ExtfaceDriver>(this: IExtfaceDriverClass<T>, deviceId: string, name: string): ExtfaceSession {
    let session = new ExtfaceSession(deviceId, this);
    return session;
  }
}