export interface IExtfaceDriver {
  push(buffer: any, callback?: (err: Error, bytesProcessed: number) => void): void|number;
  pull(timeout: number, callback?: (err: Error, data: any) => void): void|any;
}