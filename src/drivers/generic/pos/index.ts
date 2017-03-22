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

import { ExtfacePrintDriver } from '../../../driver/print';
import { IExtfaceDriverClass } from '../../../driver';
import { ExtfaceSession } from '../../../session';

export class GenericPos extends ExtfacePrintDriver {
  static NAME = "Generic POS Print Driver";
  static PRINT = true;
  columns: number;

  constructor(deviceId: string, session: any, columns: number = 30) {
    super(deviceId, session);
    this.columns = columns;
  }

  cutPaper(callback?: (err: Error, bytesOut: number) => void): void | number {
    callback(null, null);
  }

  static printTestPage<T extends ExtfacePrintDriver>(this: IExtfaceDriverClass<T>, deviceId: string, callback?: (err: Error, stats: any) => void): ExtfaceSession {
    let s = this.session(deviceId, "Print test page")
      .do((ds: GenericPos) => {
        s.notify(`Printing Test Page`);
        ds.print('******************************\r\n*')
        ds.print(`Extface Print Test`);
        ds.print('*\r\n******************************\r\n');

        s.notify('Printing driver information');
        ds.print('\r\nDriver:\r\n');
        ds.print('------------------------------\r\n');
        ds.print(`${this.NAME}`);
        ds.print('\r\n');

        ds.print('\r\n');
        ds.print('------------------------------\r\n');
        ds.print(new Date().toString());
        ds.print(`\r\n\r\n`);
        s.notify('Printing finished');
        ds.cutPaper(); //cut paper if implemented
      });
    s.once('error', (err)=>{
      callback && callback(err, 0);
    });
    s.once('done', () => {
      callback && callback(null, {});
    });
    return s;
  }
}
