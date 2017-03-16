// For API Gateway (GET -> pull, POST -> push)
import { ExtfaceDriver } from './driver';
let redis = require('redis');

export class ExtfaceHandler {
  deviceId: string;
  jobId: string;
  driver: ExtfaceDriver;

  constructor(deviceId :string, driver :ExtfaceDriver) {
    this.deviceId = deviceId;
    this.driver = driver;
  }

  push(buffer :any, callback :(err: Error, totalBytesProcessed: number)=> void) {
    let totalBytesProcessed = 0;
    let r = redis.createClient();
    let self = this;

    function errorCallback(err :any) {
      r.quit();
      callback(err, totalBytesProcessed);
    }

    r.once('ready', ()=> {
      r.append(this.deviceId, buffer, (err, bytesAppended)=> {
        if (err) return errorCallback(err);
        r.get(this.deviceId, (err, fullBuffer)=> {
          if (err) return errorCallback(err);
          function procBuffer(b :any) {
            if (b.length) {
              self.driver.handle(buffer, (err, bytesProcessed)=>{
                if (err) return errorCallback(err);
                if (bytesProcessed) {
                  totalBytesProcessed += bytesProcessed;
                  let rest = buffer.substr(bytesProcessed);
                  r.set(self.deviceId, rest, (err, value)=>{
                    if (err) return errorCallback(err);
                    procBuffer(rest);
                  })
                }
              });
            } else {
              callback(null, totalBytesProcessed);
            }
          }
          procBuffer(buffer);
        }); //get fullBuffer
      }); //append
    }); //once ready
  }

  pull() {

  }
}