import { ExtfaceHandler } from '../handler';
import { ExtfaceDriver, IExtfaceDriverClass } from '../driver';
require('sync');

export class DeviceSimulator {
  cbs: any;
  pack: Function;
  unpack: Function;
  handler: ExtfaceHandler;

  constructor(deviceId: string, driverClass: IExtfaceDriverClass<ExtfaceDriver>, cbs: any, pack?: Function, unpack?: Function) {
    this.handler = new ExtfaceHandler(deviceId, driverClass);
    this.cbs = cbs;
    this.pack = pack;
    this.unpack = unpack;
  }

  cycle(sessionId, callback?: (err: Error, data: any)=>void) {
    return this.handler.pull(sessionId, (err, data)=>{
      callback && callback(err, data);
    });
  }
}