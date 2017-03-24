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

// For API Gateway (GET -> pull, POST -> push)
import { IExtfaceDriverClass, ExtfaceDriver } from './driver';
let redis = require('redis');

export class ExtfaceHandler {
  deviceId: string;
  sessionId: string;
  driverClass: IExtfaceDriverClass<ExtfaceDriver>;

  constructor(deviceId: string, driverClass: IExtfaceDriverClass<ExtfaceDriver>) {
    this.deviceId = deviceId;
    this.driverClass = driverClass;
  }

  push(buffer: any, callback: (err: Error, totalBytesProcessed: number) => void) {
    let totalBytesProcessed = 0;
    let r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    let self = this;

    let quitAndCallback = (err: any = null)=> {
      r.quit(()=>{
        callback(err, totalBytesProcessed);
      });
    }

    //r.once('ready', ()=> {
    r.append(this.deviceId, buffer, (err, bytesAppended) => {
      if (err) return quitAndCallback(err);
      r.get(this.deviceId, (err, fullBuffer) => {
        if (err) return quitAndCallback(err);
        function procBuffer(b: any) {
          if (b.length) {
            self.driverClass.handle(this.sessionId, buffer, (err, bytesProcessed) => {
              if (err) return quitAndCallback(err);
              if (bytesProcessed) {
                totalBytesProcessed += bytesProcessed;
                let rest = buffer.substr(bytesProcessed);
                r.set(self.deviceId, rest, (err, value) => {
                  if (err) return quitAndCallback(err);
                  procBuffer(rest);
                })
              }
            });
          } else {
            quitAndCallback(null);
          }
        }
        procBuffer(buffer);
      }); //get fullBuffer
    }); //append
    //}); //once ready
  }

  pull(deviceId, wishSessionId: string, callback: (err, data?) => void): string {
    let sessionId = '';
    let r = redis.createClient(process.env.REDIS_PORT, process.env.REDIS_HOST);
    
    let quitAndCallback = (err, data)=>{
      r.quit(()=>{
        callback(err, data);
      });
    };
    
    r.smembers(deviceId, (err, members) => {
      if (members && members.length) {
        if (~members.indexOf(wishSessionId)) {
          sessionId = wishSessionId;
        } else {
          sessionId = members[0];
        }
        cycleData();
      } else {
        quitAndCallback(err, '');
      }
    });

    let cycleData = () => {
      r.publish(sessionId, -1); //~ connected
      let allData = '';
      let recursiveData = () => {
        r.blpop(sessionId, 1, (err, value) => {
          let data = '';
          if (value) {
            data = value[1];
            r.publish(sessionId, data.length);
          }
          if (err || !data) {
            quitAndCallback(err, allData);
          } else {
            allData += data;
            r.smembers(deviceId, (err, members) => {
              if (members && members.length) {
                if (~members.indexOf(sessionId)) {
                  r.hget(`${sessionId}:status`, 'break', (err, data) => {
                    if (data !== '1') recursiveData();
                    else quitAndCallback(err, allData);
                  });
                } else {
                  console.log('no')
                  quitAndCallback(err, allData);
                }
              } else {
                quitAndCallback(err, allData);
              }
            });
          }
        });
      }
      recursiveData();
    }
    return sessionId;
  }

}