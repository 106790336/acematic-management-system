import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const config = {
  jwtSecret: env.JWT_SECRET,
};

// 扩展Request类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
        departmentId?: string;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未提供认证令牌',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      username: string;
      role: string;
      departmentId?: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '无效的认证令牌',
    });
  }
};

// 角色权限中间件
export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '未认证',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: '权限不足',
      });
    }

    next();
  };
};

// 权限码验证中间件（基于数据库权限配置）
export const permissionMiddleware = (...requiredPermissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '未认证',
        });
      }

      // CEO 拥有所有权限
      if (req.user.role === 'ceo') {
        return next();
      }

      // 从数据库获取用户权限
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          roleInfo: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      });

      if (!user?.roleInfo) {
        return res.status(403).json({
          success: false,
          error: '无权限配置',
        });
      }

      const userPermissions = user.roleInfo.permissions.map(rp => rp.permission.code);

      // 检查是否拥有所需权限
      const hasAllPermissions = requiredPermissions.every(perm => {
        // 检查精确匹配
        if (userPermissions.includes(perm)) return true;
        // 检查模块通配符
        const module = perm.split(':')[0];
        if (userPermissions.includes(`${module}:*`)) return true;
        // 检查全局通配符
        if (userPermissions.includes('*')) return true;
        return false;
      });

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          error: '权限不足',
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        error: '权限验证失败',
      });
    }
  };
};
