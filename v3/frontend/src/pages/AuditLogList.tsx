import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn } from '@/components/MotionPrimitives';
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Calendar,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/hooks/use-permission';
import { toast } from 'sonner';
import type { AuditLog } from '@/types/audit';
import { AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_OPTIONS, getAuditActionLabel, getAuditEntityLabel } from '@/types/audit';

export default function AuditLogList() {
  const { isAdmin: checkIsAdmin } = usePermission();
  const isAdmin = checkIsAdmin();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [showDetail, setShowDetail] = useState<AuditLog | null>(null);
  
  // 筛选条件
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await apiClient.get(`/audit-logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.data?.items || []);
        setTotal(res.data.data?.total || 0);
      }
    } catch (e) {
      console.error(e);
      toast.error('加载审计日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, filters.action, filters.entityType, filters.status]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        loadData();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search, filters.startDate, filters.endDate]);

  const handleExport = async () => {
    try {
      const res = await apiClient.get('/audit-logs/export/all');
      if (res.data.success) {
        const data = res.data.data;
        const csv = convertToCSV(data);
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `审计日志_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.success('导出成功');
      }
    } catch (e) {
      toast.error('导出失败');
    }
  };

  const convertToCSV = (data: AuditLog[]) => {
    const headers = ['时间', '操作人', '部门', '操作类型', '对象类型', '对象名称', '描述', '状态', 'IP地址'];
    const rows = data.map(log => [
      log.createdAt,
      log.userName,
      log.departmentName || '-',
      getAuditActionLabel(log.action),
      getAuditEntityLabel(log.entityType),
      log.entityName || '-',
      log.description,
      log.status === 'success' ? '成功' : '失败',
      log.ipAddress || '-',
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'success') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />成功</Badge>;
    }
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />失败</Badge>;
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-blue-50 text-blue-700 border-blue-200',
      update: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      delete: 'bg-red-50 text-red-700 border-red-200',
      submit: 'bg-purple-50 text-purple-700 border-purple-200',
      review: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      login: 'bg-green-50 text-green-700 border-green-200',
      logout: 'bg-gray-50 text-gray-700 border-gray-200',
    };
    return <Badge variant="outline" className={colors[action] || 'bg-gray-50 text-gray-700 border-gray-200'}>
      {getAuditActionLabel(action)}
    </Badge>;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <FadeIn className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">操作审计日志</h1>
          <p className="text-muted-foreground mt-1">记录系统所有操作，确保可追溯性</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />
            筛选
          </Button>
          {isAdmin && (
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          )}
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选面板 */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">操作类型</label>
                <Select value={filters.action} onValueChange={(v) => setFilters({ ...filters, action: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部操作" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部操作</SelectItem>
                    {AUDIT_ACTION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">对象类型</label>
                <Select value={filters.entityType} onValueChange={(v) => setFilters({ ...filters, entityType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部类型</SelectItem>
                    {AUDIT_ENTITY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">状态</label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部状态</SelectItem>
                    <SelectItem value="success">成功</SelectItem>
                    <SelectItem value="failed">失败</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">搜索</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索操作人、描述..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">开始日期</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">结束日期</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总记录数</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日操作</p>
                <p className="text-2xl font-bold text-green-600">
                  {logs.filter(l => l.createdAt.startsWith(new Date().toISOString().split('T')[0])).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">成功操作</p>
                <p className="text-2xl font-bold text-blue-600">
                  {logs.filter(l => l.status === 'success').length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">失败操作</p>
                <p className="text-2xl font-bold text-red-600">
                  {logs.filter(l => l.status === 'failed').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle>操作记录</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无操作记录</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>操作人</TableHead>
                    <TableHead>操作类型</TableHead>
                    <TableHead>对象</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{log.userName}</div>
                            <div className="text-xs text-muted-foreground">{log.departmentName || '-'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <span className="text-muted-foreground">{getAuditEntityLabel(log.entityType)}</span>
                          {log.entityName && (
                            <div className="font-medium truncate max-w-[150px]">{log.entityName}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px] truncate">
                        {log.description}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setShowDetail(log)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    共 {total} 条记录，第 {page} / {totalPages} 页
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>操作详情</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">操作时间</label>
                  <p className="font-medium">{new Date(showDetail.createdAt).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">操作状态</label>
                  <p>{getStatusBadge(showDetail.status)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">操作人</label>
                  <p className="font-medium">{showDetail.userName} ({showDetail.userRole})</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">所属部门</label>
                  <p className="font-medium">{showDetail.departmentName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">操作类型</label>
                  <p>{getActionBadge(showDetail.action)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">对象类型</label>
                  <p className="font-medium">{getAuditEntityLabel(showDetail.entityType)}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">操作描述</label>
                <p className="font-medium p-3 bg-muted rounded-lg mt-1">{showDetail.description}</p>
              </div>

              {showDetail.entityName && (
                <div>
                  <label className="text-sm text-muted-foreground">对象名称</label>
                  <p className="font-medium">{showDetail.entityName}</p>
                </div>
              )}

              {showDetail.changedFields && (
                <div>
                  <label className="text-sm text-muted-foreground">变更字段</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {JSON.parse(showDetail.changedFields).map((field: string) => (
                      <Badge key={field} variant="secondary">{field}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {showDetail.oldData && (
                <div>
                  <label className="text-sm text-muted-foreground">变更前数据</label>
                  <pre className="text-xs bg-muted p-3 rounded-lg mt-1 overflow-auto max-h-40">
                    {JSON.stringify(JSON.parse(showDetail.oldData), null, 2)}
                  </pre>
                </div>
              )}

              {showDetail.newData && (
                <div>
                  <label className="text-sm text-muted-foreground">变更后数据</label>
                  <pre className="text-xs bg-muted p-3 rounded-lg mt-1 overflow-auto max-h-40">
                    {JSON.stringify(JSON.parse(showDetail.newData), null, 2)}
                  </pre>
                </div>
              )}

              {showDetail.errorMessage && (
                <div>
                  <label className="text-sm text-muted-foreground">错误信息</label>
                  <p className="text-red-600 p-3 bg-red-50 rounded-lg mt-1">{showDetail.errorMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm text-muted-foreground">IP地址</label>
                  <p className="font-medium">{showDetail.ipAddress || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">请求路径</label>
                  <p className="font-medium">{showDetail.requestMethod} {showDetail.requestPath}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
