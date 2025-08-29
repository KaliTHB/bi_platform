import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

const loginSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
  workspace_slug: Joi.string().min(2).max(100).required(),
});

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).required(),
  workspace_slug: Joi.string().min(2).max(100).optional(),
});

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = loginSchema.validate(req.body);
  
  if (error) {
    logger.warn('Login validation error:', error.details);
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        code: 'VALIDATION_ERROR',
        message: detail.message,
        field: detail.path.join('.'),
      })),
    });
    return;
  }
  
  next();
};

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  const { error } = registerSchema.validate(req.body);
  
  if (error) {
    logger.warn('Register validation error:', error.details);
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({
        code: 'VALIDATION_ERROR',
        message: detail.message,
        field: detail.path.join('.'),
      })),
    });
    return;
  }
  
  next();
};