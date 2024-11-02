// types.d.ts
import 'express';

declare module 'express' {
  export interface Request {
    user?: {
      company_id: number;
      [key: string]: any; // Optionally add other user properties here
    }
  }
}
