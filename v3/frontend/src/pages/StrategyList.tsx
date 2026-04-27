import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FadeIn } from '@/components/MotionPrimitives';
import { Plus, Edit, Trash2, Target, Eye, Download, Send, RotateCcw, CheckCircle, XCircle, FileEdit } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/hooks/use-permission';
import { exportToExcel } from '@/lib/export-utils';
import { toast } from 'sonner';
import type { Strategy } from '@/types';

interface SimplePlan { id: string; title: string; status: string; progress: number; }

export default function StrategyList() {
  const [searchParams] = useSearchParams();
  const { hasPermission, isAdmin, user } = usePermission();
  const [list, setList] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetail, setShowDetail] = useState<Strategy | null>(null);
  const [showReview, setShowReview] = useState<Strategy | null>(null);
  const [showChangeRequest, setShowChangeRequest] = useState<Strategy | null>(null);
  const [editItem, setEditItem] = useState<Strategy | null>(null);
  const [saving, setSaving] = useState(false);
  const [relatedPlans, setRelatedPlans] = useState<SimplePlan[]>([]);
  const [reviewForm, setReviewForm] = useState({ approved: true, comment: '' });
  const [changeForm, setChangeForm] = useState({ reason: '', title: '', description: '', startDate: '', endDate: '' });
  const [form, setForm] = useState({
    title: '',
    description: '',
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
  });

  const canCreate = hasPermission('strategy:create');
  const canEditPerm = hasPermission('strategy:edit');
  const canDeletePerm = hasPermission('strategy:delete');
  const isCEO = user?.role === 'ceo';

  useEffect(() => { loadData(); }, []);

  // 处理 URL 参数（从战略对齐页面跳转过来）
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    const editId = searchParams.get('edit');
    const changeId = searchParams.get('change');
    
    if (editId && list.length > 0) {
      const item = list.find(s => s.id === editId);
      if (item && canEditItem(item)) {
        onEdit(item);
        window.history.replaceState({}, '', '/strategies');
      }
    } else if (changeId && list.length > 0) {
      const item = list.find(s => s.id === changeId);
      if (item && canRequestChangeItem(item)) {
        openChangeRequest(item);
        window.history.replaceState({}, '', '/strategies');
      }
    } else if (highlightId && list.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`strategy-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-purple-500', 'ring-offset-2');
          setTimeout(() => el.classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2'), 3000);
        }
      }, 100);
    }
  }, [searchParams, list]);

  const canEditItem = (item: Strategy) => {
    return item.status === 'draft' && (item.createdById === user?.id || isCEO || user?.role === 'executive');
  };

  const canRequestChangeItem = (item: Strategy) => {
    const effectiveStatuses = ['active', 'pending_acceptance', 'completed'];
    if (!effectiveStatuses.includes(item.status)) return false;
    return item.createdById === user?.id || isCEO;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/strategies?limit=100');
      if (res.data.success) setList(res.data.data?.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadRelatedPlans = async (strategyId: string) => {
    try {
      const res = await apiClient.get(`/strategies/${strategyId}`);
      if (res.data.success && res.data.data.plans) setRelatedPlans(res.data.data.plans);
    } catch (e) { console.error(e); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate) {
      alert('请填写必填项'); return;
    }
    try {
      setSaving(true);
      if (editItem) {
        await apiClient.put(`/strategies/${editItem.id}`, form);
      } else {
        await apiClient.post('/strategies', form);
      }
      setShowDialog(false); resetForm();
      loadData();
    } catch (err: any) { alert(err.response?.data?.error || '操作失败'); }
    finally { setSaving(false); }
  };

  const onEdit = (item: Strategy) => {
    if (item.status !== 'draft') {
      alert('只有草稿状态可以编辑');
      return;
    }
    setEditItem(item);
    setForm({
      title: item.title, description: item.description || '',
      year: item.year,
      startDate: item.startDate.split('T')[0], endDate: item.endDate.split('T')[0],
    });
    setShowDialog(true);
  };

  const onDelete = async (id: string) => {
    const item = list.find(s => s.id === id);
    if (item?.status !== 'draft') {
      alert('只有草稿状态可以删除');
      return;
    }
    if (!confirm('确定删除此战略草稿？')) return;
    try {
      await apiClient.delete(`/strategies/${id}`);
      loadData();
      toast.success('删除成功');
    } catch (err: any) {
      toast.error(err.response?.data?.error || '删除失败');
    }
  };

  const onSubmit = async (id: string) => {
    if (!confirm('确定提交审核？提交后将无法修改。')) return;
    try {
      await apiClient.post(`/strategies/${id}/submit`);
      loadData();
      toast.success('已提交审核');
    } catch (err: any) {
      toast.error(err.response?.data?.error || '提交失败');
    }
  };

  const onWithdraw = async (id: string) => {
    if (!confirm('确定撤回审核？')) return;
    try {
      await apiClient.post(`/strategies/${id}/withdraw`);
      loadData();
      toast.success('已撤回');
    } catch (err: any) {
      toast.error(err.response?.data?.error || '撤回失败');
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReview) return;
    try {
      await apiClient.post(`/strategies/${showReview.id}/review`, reviewForm);
      setShowReview(null);
      setReviewForm({ approved: true, comment: '' });
      loadData();
      toast.success(reviewForm.approved ? '审核通过' : '已驳回');
    } catch (err: any) {
      toast.error(err.response?.data?.error || '审核失败');
    }
  };

  const onViewDetail = (item: Strategy) => {
    setShowDetail(item);
    loadRelatedPlans(item.id);
  };

  const resetForm = () => {
    setEditItem(null);
    setForm({ title: '', description: '', year: new Date().getFullYear(), startDate: '', endDate: '' });
  };

  const statusMap: Record<string, { label: string; class: string }> = {
    draft: { label: '草稿', class: 'bg-gray-100 text-gray-700' },
    pending: { label: '待审核', class: 'bg-yellow-100 text-yellow-700' },
    active: { label: '进行中', class: 'bg-cyan-100 text-cyan-700' },
    in_progress: { label: '进行中', class: 'bg-cyan-100 text-cyan-700' }, // 兼容旧数据
    pending_acceptance: { label: '待验收', class: 'bg-purple-100 text-purple-700' },
    completed: { label: '已完成', class: 'bg-green-100 text-green-700' },
    cancelled: { label: '已取消', class: 'bg-red-100 text-red-700' },
    archived: { label: '已归档', class: 'bg-gray-200 text-gray-600' },
  };

  const canEdit = (item: Strategy) => {
    if (!canEditPerm) return false;
    if (item.status !== 'draft') return false;
    return item.createdById === user?.id || isAdmin();
  };

  const canDelete = (item: Strategy) => {
    if (!canDeletePerm) return false;
    if (item.status !== 'draft') return false;
    return item.createdById === user?.id || isCEO;
  };

  const canWithdraw = (item: Strategy) => {
    return item.status === 'pending' && (item as any).submittedById === user?.id;
  };

  const canReview = (item: Strategy) => {
    return item.status === 'pending' && isCEO;
  };

  // 生效后可以申请变更：进行中 / 已完成状态，且是创建者或CEO
  const canRequestChange = (item: Strategy) => {
    const effectiveStatuses = ['active', 'pending_acceptance', 'completed'];
    if (!effectiveStatuses.includes(item.status)) return false;
    return item.createdById === user?.id || isCEO;
  };

  // 打开变更申请对话框
  const openChangeRequest = (item: Strategy) => {
    setShowChangeRequest(item);
    setChangeForm({
      reason: '',
      title: item.title,
      description: item.description || '',
      startDate: item.startDate ? item.startDate.split('T')[0] : '',
      endDate: item.endDate ? item.endDate.split('T')[0] : '',
    });
  };

  // 提交变更申请
  const submitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showChangeRequest) return;
    if (!changeForm.reason.trim()) {
      toast.error('请填写变更原因');
      return;
    }
    try {
      await apiClient.post('/change-requests', {
        entityType: 'strategy',
        entityId: showChangeRequest.id,
        requestType: 'modify',
        reason: changeForm.reason,
        newData: {
          title: changeForm.title,
          description: changeForm.description,
          startDate: changeForm.startDate,
          endDate: changeForm.endDate,
        },
      });
      toast.success('变更申请已提交，等待审核');
      setShowChangeRequest(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '提交失败');
    }
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">战略管理</h1>
            <p className="text-muted-foreground text-sm">草稿 → 审核 → 生效，生效后需变更申请才能修改</p>
          </div>
          <div className="flex gap-2">
            {isAdmin() && (
              <Button variant="outline" onClick={async () => {
                try {
                  const res = await apiClient.get('/strategies/export/all');
                  if (res.data.success) {
                    const data = res.data.data.map((s: any) => ({
                      标题: s.title, 年度: s.year, 状态: s.status, 进度: s.progress, 描述: s.description || '',
                    }));
                    exportToExcel(data, '战略列表');
                    toast.success('导出成功');
                  }
                } catch (err: any) { toast.error('导出失败'); }
              }}><Download className="w-4 h-4 mr-2" />导出</Button>
            )}
            {canCreate && <Button onClick={() => { resetForm(); setShowDialog(true); }}><Plus className="w-4 h-4 mr-2" />新建战略</Button>}
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <Card>
          <CardContent className="pt-6">
            {loading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
            : list.length === 0 ? <div className="text-center py-12 text-muted-foreground">暂无战略数据</div>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>年度</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>进度</TableHead>
                    <TableHead>关联计划</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map(item => (
                    <TableRow key={item.id} id={`strategy-${item.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{item.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.year}</TableCell>
                      <TableCell><Badge className={statusMap[item.status]?.class || ''}>{statusMap[item.status]?.label || item.status}</Badge></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Progress value={item.progress} className="w-16 h-2" /><span className="text-sm">{item.progress}%</span></div></TableCell>
                      <TableCell><Badge variant="outline">{item.planCount || 0} 个</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {item.status === 'draft' && (
                            <Button variant="ghost" size="sm" onClick={() => onSubmit(item.id)} title="提交审核"><Send className="w-4 h-4 text-yellow-500" /></Button>
                          )}
                          {canWithdraw(item) && (
                            <Button variant="ghost" size="sm" onClick={() => onWithdraw(item.id)} title="撤回审核"><RotateCcw className="w-4 h-4 text-orange-500" /></Button>
                          )}
                          {canReview(item) && (
                            <Button variant="ghost" size="sm" onClick={() => setShowReview(item)} title="审核战略"><CheckCircle className="w-4 h-4 text-green-500" /></Button>
                          )}
                          {canRequestChange(item) && (
                            <Button variant="ghost" size="sm" onClick={() => openChangeRequest(item)} title="申请变更"><FileEdit className="w-4 h-4 text-blue-500" /></Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => onViewDetail(item)} title="查看详情"><Eye className="w-4 h-4" /></Button>
                          {canEdit(item) && <Button variant="ghost" size="sm" onClick={() => onEdit(item)} title="编辑战略"><Edit className="w-4 h-4" /></Button>}
                          {canDelete(item) && <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)} title="删除战略"><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* 新建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? '编辑战略' : '新建战略（草稿）'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>战略名称 *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></div>
            <div className="space-y-2"><Label>描述</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>年度 *</Label><Input type="number" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value) || 2026})} /></div>
              <div className="space-y-2"><Label>开始日期 *</Label><Input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} required /></div>
              <div className="space-y-2"><Label>结束日期 *</Label><Input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} required /></div>
            </div>
            <div className="text-sm text-muted-foreground">保存后将处于草稿状态，需提交审核后生效</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
              <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存草稿'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 审核对话框 */}
      <Dialog open={!!showReview} onOpenChange={() => setShowReview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>审核战略</DialogTitle></DialogHeader>
          <div className="space-y-2 mb-4">
            <p className="font-medium">{showReview?.title}</p>
            <p className="text-sm text-muted-foreground">{showReview?.year}年度</p>
          </div>
          <form onSubmit={handleReview} className="space-y-4">
            <div className="space-y-2">
              <Label>审核结果</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="review" checked={reviewForm.approved} onChange={() => setReviewForm({...reviewForm, approved: true})} className="w-4 h-4" />
                  <CheckCircle className="w-4 h-4 text-green-500" /> 通过
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="review" checked={!reviewForm.approved} onChange={() => setReviewForm({...reviewForm, approved: false})} className="w-4 h-4" />
                  <XCircle className="w-4 h-4 text-red-500" /> 驳回
                </label>
              </div>
            </div>
            <div className="space-y-2"><Label>审核意见</Label><Textarea value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} rows={3} placeholder="请填写审核意见" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowReview(null)}>取消</Button>
              <Button type="submit" className={!reviewForm.approved ? 'bg-red-500 hover:bg-red-600' : ''}>{reviewForm.approved ? '通过' : '驳回'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{showDetail?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">年度：</span>{showDetail?.year}</div>
              <div><span className="text-muted-foreground">状态：</span><Badge className={statusMap[showDetail?.status || '']?.class || ''}>{statusMap[showDetail?.status || '']?.label || showDetail?.status}</Badge></div>
              <div><span className="text-muted-foreground">进度：</span>{showDetail?.progress}%</div>
            </div>
            {showDetail?.description && <p className="text-sm text-muted-foreground">{showDetail.description}</p>}
            <div>
              <h3 className="font-medium mb-2">关联计划 ({relatedPlans.length})</h3>
              {relatedPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无关联计划</p>
              ) : (
                <div className="space-y-2">
                  {relatedPlans.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="font-medium text-sm">{p.title}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={p.progress} className="w-16 h-1.5" />
                        <span className="text-xs text-muted-foreground">{p.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 变更申请对话框 */}
      <Dialog open={!!showChangeRequest} onOpenChange={() => setShowChangeRequest(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>申请变更战略</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground mb-4">
            战略「{showChangeRequest?.title}」已生效，需要提交变更申请经审核后才能修改。
          </div>
          <form onSubmit={submitChangeRequest} className="space-y-4">
            <div className="space-y-2">
              <Label>变更原因 *</Label>
              <Textarea
                value={changeForm.reason}
                onChange={e => setChangeForm({ ...changeForm, reason: e.target.value })}
                rows={3}
                placeholder="请说明为什么需要变更此战略..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>战略名称</Label>
              <Input value={changeForm.title} onChange={e => setChangeForm({ ...changeForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea value={changeForm.description} onChange={e => setChangeForm({ ...changeForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>开始日期</Label><Input type="date" value={changeForm.startDate} onChange={e => setChangeForm({ ...changeForm, startDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>结束日期</Label><Input type="date" value={changeForm.endDate} onChange={e => setChangeForm({ ...changeForm, endDate: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowChangeRequest(null)}>取消</Button>
              <Button type="submit">提交变更申请</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
