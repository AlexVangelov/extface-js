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

  constructor(deviceId :string, Driver: IExtfaceDriverClass<ExtfaceDriver>) {
    super();
    this.uuid = uuid();
    this.driverInstance = new Driver(deviceId, this);
  }

  do(callback: (ds: any) => void): ExtfaceSession {
    let ds = new ExtfaceDriverContext(this.driverInstance);
    this.r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    this.r.once('ready', ()=> {
      this.driverInstance.flush();
    });
    this.r.on('subscribe', (channel, subscriptions)=>{
      setTimeout(()=>{
        if (!this.isConnected) {
          this.r.unsubscribe();
          this.r.quit();
          this.emit('error', new Error('Timeout waiting for device to connect'));
        }
      }, 1500); //move me to global setting timeout
    });
    this.r.on('message', (channel, out)=>{
      this.r.unsubscribe();
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
    this.r.subscribe(ds.sessionId);
    return this;
  }

  notify(text: string) {

  }

  done() {
    if (this.r) this.r.quit();
    this.emit('done');
  }

  rpush(buffer: any, callback: (err: Error, data: any)=> void) {
    this.r.rpush(this.uuid, buffer, callback);
  }
}