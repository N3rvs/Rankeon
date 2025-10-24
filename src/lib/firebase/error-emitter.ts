// src/lib/firebase/error-emitter.ts
import { EventEmitter } from 'events';
import { FirestorePermissionError } from './errors';

type ErrorEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
};

class ErrorEventEmitter extends EventEmitter {
  emit<E extends keyof ErrorEvents>(event: E, ...args: Parameters<ErrorEvents[E]>): boolean {
    return super.emit(event, ...args);
  }

  on<E extends keyof ErrorEvents>(event: E, listener: ErrorEvents[E]): this {
    return super.on(event, listener);
  }

  off<E extends keyof ErrorEvents>(event: E, listener: ErrorEvents[E]): this {
    return super.off(event, listener);
  }
}

export const errorEmitter = new ErrorEventEmitter();
