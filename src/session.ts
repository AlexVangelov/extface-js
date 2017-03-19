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

  do(callback: (ds: any) => void): ExtfaceSession {
    let ds = new ExtfaceDriverContext(this.driverInstance);
    this.r.once('subscribe', (channel, subscriptions) => {
      setTimeout(() => {
        if (!this.isConnected) {
          this.r.unsubscribe();
          this.r.quit();
          this.emit('error', new Error('Timeout waiting for device to connect'));
        }
      }, ExtfaceDriverContext.defaultTimeoutMs);
    });
    this.r.once('message', (channel, out) => {
      this.r.unsubscribe((err, res) => {
        if (!this.isConnected) {
          this.isConnected = true;
          this.emit('connected');
          Sync(() => {
            callback(ds);
          }, (err, result) => {
            if (err) {
              this.emit('error', err);
              this.done();
            }
          });
        }
      });
    });
    this.r.subscribe(ds.sessionId);
    return this;
  }

  notify(text: string) {

  }

  done() {
    if (this.r) this.r.quit();
    this.driverInstance.quit();
    this.emit('done');
  }

  rpush(buffer: any, callback: (err: Error, data: any) => void) {
    this.r.rpush(this.uuid, buffer, callback);
  }
}