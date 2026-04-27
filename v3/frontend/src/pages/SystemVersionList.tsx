import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  GitBranch, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  User, 
  FileText,
  Shield
} from 'lucide-react';
import { SystemVersion, VERSION_STATUS_MAP } from '@/types/system-version';
import { api } from '@/lib/api';

export default function SystemVersionList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // const { toast } = useToast(); // 改用 sonner 的 toast
  
  const [versions, setVersions] = useState<SystemVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<SystemVersion | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');
  const [deployForm, setDeployForm] = useState({ version: '', name: '', changes: '' });
  const [submitting, setSubmitting] = useState(false);

  // 检查权限
  const canManageVersions = user?.role === 'admin' || user?.role === 'ceo';

  useEffect(() => {
    if (!canManageVersions) {
      toast.error('权限不足', {
        description: '只有管理员或CEO可以访问版本管理'
      });
      navigate('/');
      return;
    }
    fetchVersions();
  }, [canManageVersions, navigate]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/system-versions');
      if (response.data.success) {
        setVersions(response.data.data);
      }
    } catch (error) {
      toast.error('获取版本列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedVersion || !rollbackReason.trim()) return;
    
    try {
      setSubmitting(true);
      const response = await api.post(`/system-versions/${selectedVersion.id}/rollback`, {
        reason: rollbackReason
      });
      
      if (response.data.success) {
        toast.success('回滚成功', {
          description: `已回滚到版本 ${selectedVersion.version}`
        });
        setShowRollbackDialog(false);
        setRollbackReason('');
        fetchVersions();
      }
    } catch (error: any) {
      toast.error('回滚失败', {
        description: error.response?.data?.error || '未知错误'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeploy = async () => {
    if (!deployForm.version.trim() || !deployForm.name.trim()) return;
    
    try {
      setSubmitting(true);
      const changes = deployForm.changes.split('\n').filter(c => c.trim());
      
      const response = await api.post('/system-versions', {
        version: deployForm.version,
        name: deployForm.name,
        changes
      });
      
      if (response.data.success) {
        toast.success('部署成功', {
          description: `版本 ${deployForm.version} 已部署`
        });
        setShowDeployDialog(false);
        setDeployForm({ version: '', name: '', changes: '' });
        fetchVersions();
      }
    } catch (error: any) {
      toast.error('部署失败', {
        description: error.response?.data?.error || '未知错误'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = VERSION_STATUS_MAP[status];
    return (
      <Badge variant={status === 'active' ? 'default' : status === 'rolled_back' ? 'destructive' : 'secondary'}>
        {config?.label || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeVersion = versions.find(v => v.status === 'active');

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <GitBranch className="h-8 w-8" />
            系统版本管理
          </h1>
          <p className="text-muted-foreground mt-1">
            管理系统版本部署与回滚，确保系统稳定性
          </p>
        </div>
        <Button onClick={() => setShowDeployDialog(true)} className="gap-2">
          <CheckCircle className="h-4 w-4" />
          部署新版本
        </Button>
      </div>

      {/* 当前版本卡片 */}
      {activeVersion && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              当前运行版本
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-muted-foreground">版本号</Label>
                <p className="text-2xl font-bold">{activeVersion.version}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">版本名称</Label>
                <p className="text-lg">{activeVersion.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">部署时间</Label>
                <p className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(activeVersion.deployedAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            {activeVersion.changes && (
              <div className="mt-4">
                <Label className="text-muted-foreground">变更说明</Label>
                <div className="mt-1 p-3 bg-white rounded-md border">
                  <ul className="list-disc list-inside space-y-1">
                    {JSON.parse(activeVersion.changes).map((change: string, i: number) => (
                      <li key={i} className="text-sm">{change}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 版本历史列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            版本历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div key={version.id}>
                  <div className="flex items-start justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold">{version.version}</span>
                        {getStatusBadge(version.status)}
                        {version.status === 'active' && (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            运行中
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">{version.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          部署: {version.deployedBy?.name || '未知'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(version.deployedAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      {version.rollbackReason && (
                        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          <AlertTriangle className="h-4 w-4 mt-0.5" />
                          <div>
                            <span className="font-medium">回滚原因: </span>
                            {version.rollbackReason}
                            {version.rolledBackBy && (
                              <span className="text-muted-foreground ml-2">
                                (操作人: {version.rolledBackBy.name})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {version.status !== 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVersion(version);
                            setShowRollbackDialog(true);
                          }}
                          className="gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          回滚到此版本
                        </Button>
                      )}
                    </div>
                  </div>
                  {index < versions.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 回滚确认对话框 */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              确认回滚版本
            </DialogTitle>
            <DialogDescription>
              您即将回滚到版本 <strong>{selectedVersion?.version}</strong>。
              此操作将恢复系统到该版本的状态，请谨慎操作。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">回滚原因 <span className="text-red-500">*</span></Label>
              <Textarea
                id="reason"
                placeholder="请输入回滚原因（必填）..."
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5" />
                <div>
                  <p className="font-medium">注意事项：</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>回滚操作不可撤销</li>
                    <li>当前版本的数据变更可能会丢失</li>
                    <li>所有操作将被记录在审计日志中</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRollback}
              disabled={!rollbackReason.trim() || submitting}
            >
              {submitting ? '回滚中...' : '确认回滚'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 部署新版本对话框 */}
      <Dialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              部署新版本
            </DialogTitle>
            <DialogDescription>
              部署新版本前，请确保已完成所有测试并备份数据。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="version">版本号 <span className="text-red-500">*</span></Label>
              <Input
                id="version"
                placeholder="例如: v1.2.0 或 20260427_080000"
                value={deployForm.version}
                onChange={(e) => setDeployForm({ ...deployForm, version: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">版本名称 <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                placeholder="例如: 新增审计日志功能"
                value={deployForm.name}
                onChange={(e) => setDeployForm({ ...deployForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="changes">变更说明（每行一条）</Label>
              <Textarea
                id="changes"
                placeholder="- 新增功能A&#10;- 修复问题B&#10;- 优化性能C"
                value={deployForm.changes}
                onChange={(e) => setDeployForm({ ...deployForm, changes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeployDialog(false)}>
              取消
            </Button>
            <Button 
              onClick={handleDeploy}
              disabled={!deployForm.version.trim() || !deployForm.name.trim() || submitting}
            >
              {submitting ? '部署中...' : '确认部署'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
