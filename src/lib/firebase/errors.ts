// src/lib/firebase/errors.ts
import { auth } from './client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: any;

  constructor(securityContext: SecurityRuleContext) {
    const authState = auth.currentUser
      ? {
          uid: auth.currentUser.uid,
          token: {
            name: auth.currentUser.displayName,
            picture: auth.currentUser.photoURL,
            email: auth.currentUser.email,
            email_verified: auth.currentUser.emailVerified,
            phone_number: auth.currentUser.phoneNumber,
            // You might need to parse the actual token for custom claims
            // For simplicity, we'll omit custom claims here on the client
          },
        }
      : null;

    const request = {
      auth: authState,
      method: securityContext.operation,
      path: `/databases/(default)/documents/${securityContext.path}`,
      ...(securityContext.requestResourceData && {
        resource: { data: securityContext.requestResourceData },
      }),
    };

    const friendlyMessage = `
Firestore Security Rules Denied Request:
${JSON.stringify(request, null, 2)}
`;

    super(friendlyMessage);
    this.name = 'FirestorePermissionError';
    this.context = request;

    // This is to make the error object more readable in the console.
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
