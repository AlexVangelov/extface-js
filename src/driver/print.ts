import { ExtfaceDriver } from './';

export abstract class ExtfacePrintDriver extends ExtfaceDriver {
  static NAME = 'Extface Print Driver';
  static PRINT = true;
}