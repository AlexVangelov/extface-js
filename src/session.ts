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

  constructor(driverInstance: ExtfaceDriver) {
    super();
    this.driverInstance = driverInstance;
  }

  do(callback: (ds: any) => void): ExtfaceSession {
    let ds = new ExtfaceDriverContext(this.driverInstance);
    this.r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    this.r.once('ready', function () {
      console.log('r ready!');
    });
    this.r.on('subscribe', (channel, subscriptions)=>{
      //invite device here
      setTimeout(()=>{
        if (!this.isConnected) {
          if (this.r) this.r.quit();
          this.emit('error', new Error('Timeout waiting for device to connect'));
        }
      }, 1500); //global setting timeout
      Sync(() => {
        callback(ds);
      }, (err, result) => {
        if (err) {
          this.emit('error', err);
          this.done();
        }
      });
    });
    this.r.on('message', (channel, out)=>{
      if (!this.isConnected) {
        console.log('connected!');
        this.isConnected = true;
        this.emit('connected');
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
}