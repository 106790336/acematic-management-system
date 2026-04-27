import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FadeIn } from '@/components/MotionPrimitives';
import { CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { usePermission } from '@/hooks/use-permission';
import { toast } from 'sonner';

interface ChangeRequest {
  id: string;
  entityType: string;
  entityId: string;
  requestType: string;
  reason: string;
  status: string;
  requester: { id: string; name: string; department?: { name: string } };
  reviewer?: { id: string; name: string };
  reviewComment?: string;
  createdAt: string;
}

export default function ChangeRequestList() {
  const { isAdmin } = usePermission();
  const [list, setList] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState<ChangeRequest | null>(null);
  const [reviewForm, setReviewForm] = useState({ approved: true, comment: '' });
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const url = filter === 'pending' ? '/change-requests?status=pending' : '/change-requests';
      const res = await apiClient.get(url);
      if (res.data.success) {
        setList(res.data.data?.items || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReview) return;
    try {
      await apiClient.post(`/change-requests/${showReview.id}/review`, reviewForm);
      toast.success(reviewForm.approved ? '已通过' : '已驳回');
      setShowReview(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '操作失败');
    }
  };

  const statusMap: Record<string, { label: string; class: string }> = {
    pending: { label: '待审核', class: 'bg-yellow-100 text-yellow-700' },
    approved: { label: '已通过', class: 'bg-green-100 text-green-700' },
    rejected: { label: '已驳回', class: 'bg-red-100 text-red-700' },
  };

  const entityMap: Record<string, string> = {
    strategy: '战略',
    plan: '计划',
    task: '任务',
  };

  if (!isAdmin()) {
    return (
      <div className="space-y-6">
        <FadeIn>
          <h1 className="font-bold text-2xl">变更审核</h1>
          <p className="text-muted-foreground">您没有权限访问此页面</p>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">变更审核</h1>
            <p className="text-muted-foreground">审核战略/计划/任务的变更申请</p>
          </div>
          <div className="flex gap-2">
            <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
              待审核
            </Button>
            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
              全部
            </Button>
          </div>
        </div>
      </FadeIn>

      <FadeIn>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : list.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {filter === 'pending' ? '暂无待审核的变更申请' : '暂无变更申请记录'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>申请人</TableHead>
                    <TableHead>变更原因</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>申请时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">{entityMap[item.entityType] || item.entityType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>{item.requester?.name}</div>
                        <div className="text-xs text-muted-foreground">{item.requester?.department?.name}</div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate">{item.reason}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusMap[item.status]?.class || ''}>
                          {statusMap[item.status]?.label || item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setShowReview(item); setReviewForm({ approved: true, comment: '' }); }} title="通过">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setShowReview(item); setReviewForm({ approved: false, comment: '' }); }} title="驳回">
                                <XCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
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

      {/* 审核对话框 */}
      <Dialog open={!!showReview} onOpenChange={() => setShowReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewForm.approved ? '通过变更申请' : '驳回变更申请'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mb-4">
            <p className="font-medium">{entityMap[showReview?.entityType || '']}变更申请</p>
            <p className="text-sm text-muted-foreground">申请人：{showReview?.requester?.name}</p>
            <p className="text-sm">变更原因：{showReview?.reason}</p>
          </div>
          <form onSubmit={handleReview} className="space-y-4">
            <div className="space-y-2">
              <Label>审核意见</Label>
              <Textarea 
                value={reviewForm.comment} 
                onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} 
                rows={3} 
                placeholder={reviewForm.approved ? '可选填写意见' : '请填写驳回原因'}
                required={!reviewForm.approved}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowReview(null)}>取消</Button>
              <Button type="submit" className={reviewForm.approved ? '' : 'bg-red-500 hover:bg-red-600'}>
                {reviewForm.approved ? '通过' : '驳回'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
