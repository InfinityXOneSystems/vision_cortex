/**
 * 🔐 AUTHENTICATION MIDDLEWARE
 * Vision Cortex compatible auth system
 * 
 * @author Infinity X One Systems
 * @version 2.0.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'premium';
  permissions: string[];
  subscription_tier: 'free' | 'professional' | 'enterprise';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required but not set');
  process.exit(1);
}

/**
 * Validate authentication token (optional)
 */
export const validateAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded.user;
      console.log(`🔐 Authenticated user: ${req.user?.email}`);
    } catch (error) {
      console.warn('⚠️ Invalid token provided');
      // Don't block request, just don't set user
    }
  }
  
  next();
};

/**
 * Require authentication (mandatory)
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide valid authentication token'
    });
    return;
  }
  
  next();
};

/**
 * Require specific role
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }
    
    if (req.user.role !== role && req.user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required_role: role,
        user_role: req.user.role
      });
      return;
    }
    
    next();
  };
};

/**
 * Require premium subscription
 */
export const requirePremium = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
    return;
  }
  
  if (!['professional', 'enterprise'].includes(req.user.subscription_tier)) {
    res.status(403).json({
      success: false,
      error: 'Premium subscription required',
      user_tier: req.user.subscription_tier,
      upgrade_url: 'https://infinityxoneintelligence.com/upgrade'
    });
    return;
  }
  
  next();
};