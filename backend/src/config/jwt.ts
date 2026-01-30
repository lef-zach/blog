import jwt from 'jsonwebtoken';
import { config } from './index';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

import crypto from 'crypto';

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    jwtid: crypto.randomUUID(),
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
};
