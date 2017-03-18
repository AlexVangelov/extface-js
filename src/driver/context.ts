import { ExtfaceDriver } from './';

export class ExtfaceDriverContext {
  sessionId: string;

  constructor(driver: ExtfaceDriver) {
    let origDriver = driver;
    this.sessionId = driver.sessionId;
    do {
      Object.getOwnPropertyNames(driver).forEach((p) => {
        if (p !== 'constructor' && typeof this[p] === 'undefined' && typeof driver[p] === 'function') {
          this[p] = (...a)=> { 
            return origDriver[p].sync(origDriver, ...a); 
          }; 
        }
      });
    } while ((driver = Object.getPrototypeOf(driver)) && driver != Object.prototype);
  }
}