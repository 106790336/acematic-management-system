import { useState, useCallback, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth.tsx';
import { useBrand } from '@/contexts/BrandContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  Target, 
  ClipboardList, 
  Users, 
  Trophy,
  FileText,
  AlertCircle,
  Calendar,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  ShieldCheck,
  GripVertical,
  Clock,
  RotateCcw
} from 'lucide-react';

export default function Layout() {
  const { t } = useTranslation();
  
  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.alignment'), href: '/alignment', icon: GitBranch },
    { name: t('nav.strategy'), href: '/strategy', icon: Target },
    { name: t('nav.plan'), href: '/plan', icon: ClipboardList },
    { name: t('nav.tasks'), href: '/tasks', icon: ClipboardList },
    { name: t('nav.dailyLog'), href: '/daily-log', icon: Calendar },
    { name: t('nav.weeklyReports'), href: '/weekly-reports', icon: FileText },
    { name: t('nav.issues'), href: '/issues', icon: AlertCircle },
    { name: t('nav.department'), href: '/department', icon: Users },
    { name: t('nav.users'), href: '/users', icon: UserIcon },
    { name: t('nav.assessment'), href: '/assessment', icon: Trophy },
    { name: '变更审核', href: '/change-requests', icon: ShieldCheck },
    { name: '审计日志', href: '/audit-logs', icon: Clock },
    { name: '版本管理', href: '/system-versions', icon: RotateCcw },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ];
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { brand } = useBrand();
  const navigate = useNavigate();

  const MIN_WIDTH = 180;
  const MAX_WIDTH = 400;
  const COLLAPSE_THRESHOLD = 100;

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResize = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing || !sidebarRef.current) return;
    const newWidth = e.clientX;
    if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
      setSidebarWidth(newWidth);
      if (sidebarCollapsed && newWidth > COLLAPSE_THRESHOLD) {
        setSidebarCollapsed(false);
      }
    }
  }, [isResizing, sidebarCollapsed]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResize);
      return () => {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResize);
      };
    }
  }, [isResizing, resize, stopResize]);

  const handleLogout = () => {
    logout();
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      ceo: 'CEO',
      executive: '高管',
      manager: '经理',
      employee: '员工',
    };
    return roleMap[role] || role;
  };

  return (
    <div className="min-h-screen flex">
      {/* 侧边栏 - 桌面端 */}
      <aside 
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col",
          "lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          isResizing && "transition-none",
          !isResizing && "transition-all duration-300"
        )}
        style={{ 
          width: sidebarCollapsed ? '70px' : `${sidebarWidth}px`,
          background: 'oklch(0.18 0.02 250)',
        }}
      >
        {/* Logo */}
        <div 
          className="flex items-center justify-between h-16 px-4"
          style={{ borderBottom: '1px solid oklch(0.30 0.02 250)' }}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt="Logo" className="w-9 h-9 object-contain rounded-lg flex-shrink-0" />
            ) : (
            <div 
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ 
                width: '36px',
                height: '36px',
                background: 'oklch(0.75 0.18 75)',
              }}
            >
              <Target className="w-5 h-5" style={{ color: 'oklch(0.18 0.02 250)' }} />
            </div>
            )}
            {!sidebarCollapsed && (
              <div className="truncate">
                <div 
                  className="font-semibold"
                  style={{ 
                    color: 'oklch(0.95 0 0)',
                    fontSize: 'var(--font-size-label)',
                  }}
                >
                  {brand.shortName || '管理系统'}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* 收缩按钮 - 桌面端 */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ color: 'oklch(0.95 0 0)' }}
              title={sidebarCollapsed ? '展开菜单' : '收起菜单'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
            {/* 关闭按钮 - 移动端 */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
              style={{ color: 'oklch(0.95 0 0)' }}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 拖拽调整宽度手柄 - 桌面端 */}
        {!sidebarCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-50 hidden lg:flex items-center justify-center group"
            onMouseDown={startResize}
            style={{ 
              background: isResizing ? 'oklch(0.75 0.18 75)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <div 
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              style={{
                width: '16px',
                height: '48px',
                background: 'oklch(0.30 0.02 250)',
                borderRadius: '4px',
                marginRight: '-8px'
              }}
            >
              <GripVertical className="w-3 h-3" style={{ color: 'oklch(0.70 0 0)' }} />
            </div>
          </div>
        )}

        {/* 导航菜单 */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                    "text-sm font-medium",
                    isActive
                      ? "text-white"
                      : "hover:bg-white/5"
                  )
                }
                style={({ isActive }) => ({
                  background: isActive ? 'oklch(0.75 0.18 75)' : 'transparent',
                  color: isActive ? 'oklch(0.18 0.02 250)' : 'oklch(0.70 0 0)',
                })}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* 底部用户信息 */}
        <div 
          className="p-4"
          style={{ borderTop: '1px solid oklch(0.30 0.02 250)' }}
        >
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarFallback 
                style={{ 
                  background: 'oklch(0.42 0.19 250)',
                  color: 'white',
                }}
              >
                {user?.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div 
                  className="text-sm font-medium truncate"
                  style={{ color: 'oklch(0.95 0 0)' }}
                >
                  {user?.name}
                </div>
                <div 
                  className="text-xs truncate"
                  style={{ color: 'oklch(0.60 0 0)' }}
                >
                  {getRoleName(user?.role || '')}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header 
          className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6"
          style={{ 
            background: 'white',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="hidden sm:block">
              <h1 
                className="font-semibold"
                style={{ 
                  fontSize: 'var(--font-size-title)',
                  color: 'var(--foreground)',
                }}
              >
                {user?.name ? `${user.name}的管理工作台` : '管理工作台'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {/* 用户下拉菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 h-10"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback 
                      style={{ 
                        background: 'oklch(0.42 0.19 250)',
                        color: 'white',
                        fontSize: 'var(--font-size-small)',
                      }}
                    >
                      {user?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium">{user?.name}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <UserIcon className="w-4 h-4 mr-2" />
                  个人中心
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto" style={{ padding: 'var(--spacing-lg)', background: 'var(--background)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
