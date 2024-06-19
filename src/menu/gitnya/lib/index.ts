import crypto from 'crypto';

/**
 * @deprecated
 */
export const IV = "m)eh,k!PyY%p'yb*";
export function getIV() {
    return crypto.randomBytes(16);
} 
