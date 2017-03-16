import * as uuid from 'uuid/v4';
import { ExtfaceJob } from '../job';

export abstract class ExtfaceDriver {
  static NAME: string;//human driver name

  static DEVELOPMENT = true //driver is not ready for production (not passing all tests or has major bugs)

  //Select driver features
  static RAW = true  //responds to #push(data) and #pull
  static PRINT = false //POS, slip printers
  static FISCAL = false //cash registers, fiscal printers
  static REPORT = false //only transmits data that must be parsed by the handler, CDR, report devices

  deviceId: string;
  jobId: string;
  private bufferKey: string;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.jobId = uuid();
    this.bufferKey = `${this.deviceId}:${this.jobId}`;
  }

  handle(buffer: any, callback: (err: Error, bytesProcessed: number) => void) {
    //console.log(`Extface:${this.deviceId} PUSH ${buffer}`);
    callback(null, buffer.length); //return number of bytes processed
  }

  push(buffer: any, callback: (err: Error, bytesProcessed: number) => void) {

  }

  pull(timeout: number, callback: (err: Error, data: any) => void) {

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

}