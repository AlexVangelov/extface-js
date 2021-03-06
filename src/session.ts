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

import * as uuid from 'uuid/v4';
import { EventEmitter } from 'events';
let Sync = require('sync');
import { IExtfaceDriverClass, ExtfaceDriver } from './driver';
import { ExtfaceDriverContext } from './driver/context';
let redis = require('redis');

export class ExtfaceSession extends EventEmitter {
  driverInstance: ExtfaceDriver;
  r: any;
  bytesOut: number;
  isConnected: boolean = false;
  uuid: string;

  constructor(deviceId: string, Driver: IExtfaceDriverClass<ExtfaceDriver>, sessionId?: string) {
    super();
    this.uuid = sessionId || uuid();
    this.driverInstance = new Driver(deviceId, this);
    this.r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    this.r.once('ready', () => {
      this.driverInstance.flush();
      this.emit('ready');
    });
  }

  do(fiber: (ds: any) => void, callback?: (err: Error, stats: any) => void): ExtfaceSession {
    let ds = new ExtfaceDriverContext(this.driverInstance);
    let tmo = setTimeout(() => {
      if (!this.isConnected) {
        this.r.unsubscribe();
        this.r.quit();
        this.error(new Error(`Timeout waiting for device to connect (after ${ExtfaceDriverContext.connectTimeoutMs / 1000}s)`));
      } else {
        console.warn('do timeout');
      }
    }, ExtfaceDriverContext.connectTimeoutMs);
    this.r.once('subscribe', (channel, subscriptions) => {
      this.driverInstance.registerSession(() => {
        this.emit('invite');
      });
    });
    this.r.once('message', (channel, out) => {
      this.r.unsubscribe((err, res) => {
        if (!this.isConnected) {
          clearTimeout(tmo); 
          this.isConnected = true;
          this.emit('connected');
          Sync(() => {
            fiber(ds);
            this.done();
          }, (err, result) => {
            callback && callback(err, result);
            if (err) {
              this.error(err);
              this.done();
            }
          });
        }
      });
    });
    this.r.subscribe(this.uuid);
    return this;
  }

  notify(text: string) {
    this.emit('notify', text);
  }

  error(err) {
    this.driverInstance.quit();
    if (this.r) this.r.quit();
    this.emit('error', err);
  }

  done() {
    this.driverInstance.quit();
    if (this.r) this.r.quit();
    this.emit('done');
  }

  rpush(buffer: any, callback: (err: Error, data: any) => void) {
    this.r.rpush(this.uuid, buffer, callback);
  }

  hset(key: string, value: any, callback?: (err: Error, data: any) => void) {
    this.r.hset(`${this.uuid}:status`, key, value, callback);
  }
}