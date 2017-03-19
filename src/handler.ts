// For API Gateway (GET -> pull, POST -> push)
import { IExtfaceDriverClass, ExtfaceDriver } from './driver';
let redis = require('redis');

export class ExtfaceHandler {
  deviceId: string;
  sessionId: string;
  driverClass: IExtfaceDriverClass<ExtfaceDriver>;

  constructor(deviceId :string, driverClass :IExtfaceDriverClass<ExtfaceDriver>) {
    this.deviceId = deviceId;
    this.driverClass = driverClass;
  }

  push(buffer :any, callback :(err: Error, totalBytesProcessed: number)=> void) {
    let totalBytesProcessed = 0;
    let r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    let self = this;

    function errorCallback(err :any) {
      r.quit();
      callback(err, totalBytesProcessed);
    }

    //r.once('ready', ()=> {
      r.append(this.deviceId, buffer, (err, bytesAppended)=> {
        if (err) return errorCallback(err);
        r.get(this.deviceId, (err, fullBuffer)=> {
          if (err) return errorCallback(err);
          function procBuffer(b :any) {
            if (b.length) {
              self.driverClass.handle(this.sessionId, buffer, (err, bytesProcessed)=>{
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
              r.quit();
              callback(null, totalBytesProcessed);
            }
          }
          procBuffer(buffer);
        }); //get fullBuffer
      }); //append
    //}); //once ready
  }

  pull(sessionId: string, callback: (err, data?) => void) {
    let r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    r.publish(sessionId, -1); //~ connected
    let allData = '';
    function recursiveData() {
      r.blpop(sessionId, 1, (err, value)=> {
        let data = '';
        if (value) {
          data = value[1];
          r.publish(sessionId, data.length);
        }
        if (err || !data) {
          r.quit();
          callback(err, allData);
        } else {
          allData += data;
          recursiveData();
        }
      });
    }
    recursiveData();
  }
}