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

import { ExtfaceSession } from '../session';
import { IExtfaceDriver } from './interface';
let redis = require('redis');

export interface IExtfaceDriverClass<T extends ExtfaceDriver> {
  session(deviceId: string, name: string): ExtfaceSession;
  handle(deviceId: string, sessionId: string, buffer: any, callback?: (err: Error, bytesProcessed: number) => void);
  new (...a: any[]): T;
  NAME: string;
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

  constructor(deviceId: string, session: ExtfaceSession) {
    this.deviceId = deviceId;
    this.session = session;
    this.r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
  }

  static handle(deviceId, sessionId, buffer: any, callback?: (err: Error, bytesProcessed: number) => void) {
    callback && callback(null, buffer.length); //return number of bytes processed
  }

  static deviceTimeoutMs = 1900;

  push(buffer: any, callback?: (err: Error, bytesProcessed: number) => void) {
    this.session.hset('break', 0);

    let tmo = setTimeout(() => {
      this.r.unsubscribe(this.session.uuid);
      callback && callback(new Error(`Device timeout (after ${ExtfaceDriver.deviceTimeoutMs}ms)`), 0);
    }, ExtfaceDriver.deviceTimeoutMs);

    let onMessageListener = (channel, out) => {
      if (channel === this.session.uuid && out !== '-1') {
        clearTimeout(tmo);
        this.r.removeListener('message', onMessageListener);
        this.session.bytesOut += parseInt(out);
        this.session.hset('break', 1);
        this.r.unsubscribe(this.session.uuid, (err, res) => {
          callback && callback(err, buffer.length);
        });
      }
    }
    this.r.on('message', onMessageListener);

    this.r.once('subscribe', (channel, subscriptions) => {
      if (channel === this.session.uuid) {
        this.session.rpush(buffer, (err, data) => {
          if (err) {
            clearTimeout(tmo);
            this.r.unsubscribe(this.session.uuid, (err, res) => {
              callback(err, 0);
            });
          }
        });
      }
    });
    this.r.subscribe(this.session.uuid);
  }

  pull(timeout: number, callback: (err: Error, data: any) => void) {
    this.session.hset('break', 1);
    this.r.blpop(this._bufferKey(), timeout, (err, listElement) => {
      let data = ""
      if (listElement) data = listElement[1];
      callback && callback(err, data);
    });
  }

  flush(callback?: (err: Error, data: any) => void) {
    this.r.del(this.session.uuid);
    this.r.del(`${this.deviceId}:${this.session.uuid}`);
  }

  rpush(buffer: any, callback: (err: Error, data: any) => void) {

  }

  checkStatus(callback: (err: Error, data: boolean) => void) {
    callback(null, false);
  }

  quit() {
    this.r.srem(this.deviceId, this.session.uuid);
    this.r.quit();
  }

  registerSession(callback: (err, sessionsCount) => void) {
    this.r.sadd(this.deviceId, this.session.uuid, callback);
  }

  private _bufferKey() {
    return `${this.deviceId}:${this.session.uuid}`;
  }

  static session<T extends ExtfaceDriver>(this: IExtfaceDriverClass<T>, deviceId: string, name: string): ExtfaceSession {
    let session = new ExtfaceSession(deviceId, this);
    return session;
  }
}