import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './use-auth.tsx';
import { apiClient } from '@/lib/api-client';

interface PermissionContextType {
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: () => boolean;
  isCEO: () => boolean;
  canEditContent: (creatorId: string, module?: string) => boolean;
  canDeleteContent: (creatorId: string, module?: string) => boolean;
  refreshPermissions: () => Promise<void>;
  user: any;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPermissions = async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get('/settings/my-permissions');
      if (res.data.success) {
        setPermissions(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPermissions();
  }, [user?.id]);

  // 检查是否有权限
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // CEO 有所有权限
    if (user.role === 'ceo') return true;
    
    // 检查精确匹配
    if (permissions.includes(permission)) return true;
    
    // 检查模块通配符 (如 'task:*' 匹配 'task:create', 'task:edit' 等)
    const module = permission.split(':')[0];
    if (permissions.includes(`${module}:*`)) return true;
    
    // 检查全局通配符
    if (permissions.includes('*')) return true;
    
    return false;
  };

  // 检查是否是管理员
  const isAdmin = (): boolean => {
    return user?.role === 'ceo' || user?.role === 'executive';
  };

  // 检查是否是CEO
  const isCEO = (): boolean => {
    return user?.role === 'ceo';
  };

  // 检查是否可以编辑内容
  const canEditContent = (creatorId: string, module: string = ''): boolean => {
    if (!user) return false;
    
    // CEO可以编辑所有内容
    if (user.role === 'ceo') return true;
    
    // 高管可以编辑大部分内容
    if (user.role === 'executive') return true;
    
    // 创建者可以编辑自己的内容
    if (user.id === creatorId) {
      if (module && !hasPermission(`${module}:edit`)) {
        return false;
      }
      return true;
    }
    
    return false;
  };

  // 检查是否可以删除内容
  const canDeleteContent = (creatorId: string, module: string = ''): boolean => {
    if (!user) return false;
    
    // 只有CEO可以删除他人内容
    if (user.role === 'ceo') return true;
    
    // 创建者可以删除自己的内容
    if (user.id === creatorId) {
      if (module && !hasPermission(`${module}:delete`)) {
        return false;
      }
      return true;
    }
    
    return false;
  };

  return (
    <PermissionContext.Provider value={{
      permissions,
      loading,
      hasPermission,
      isAdmin,
      isCEO,
      canEditContent,
      canDeleteContent,
      refreshPermissions,
      user,
    }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within PermissionProvider');
  }
  return context;
}
