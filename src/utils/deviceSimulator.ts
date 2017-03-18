import { ExtfaceHandler } from '../handler';
import { ExtfaceDriver } from '../driver';
require('sync');

export class DeviceSimulator {
  cbs: any;
  pack: Function;
  unpack: Function;
  handler: ExtfaceHandler;

  constructor(deviceId: string, driver: ExtfaceDriver, cbs: any, pack?: Function, unpack?: Function) {
    this.handler = new ExtfaceHandler(deviceId, driver);
    this.cbs = cbs;
    this.pack = pack;
    this.unpack = unpack;
  }

  cycle(sessionId) {
    return (<any>this.handler.pull).sync(null, sessionId);
  }
}