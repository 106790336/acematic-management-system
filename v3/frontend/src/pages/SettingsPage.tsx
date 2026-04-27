import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { FadeIn } from '@/components/MotionPrimitives';
import { Shield, Palette, Check, X, Upload, ImageIcon, Users, Plus, Edit, Trash2, Database, Download, GitBranch, GripVertical, ToggleLeft, ToggleRight, ChevronUp, ChevronDown, UserCircle, ChevronRight } from 'lucide-react';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import { exportToJSON, importFromJSON } from '@/lib/export-utils';
import { useAuth } from '@/hooks/use-auth.tsx';
import { usePermission } from '@/hooks/use-permission';
import { toast } from 'sonner';
import type { Role, Permission, Workflow, WorkflowStep } from '@/types';

const modules = [
  { key: 'dashboard', label: '数据看板' },
  { key: 'strategy', label: '战略管理' },
  { key: 'plan', label: '计划管理' },
  { key: 'task', label: '任务管理' },
  { key: 'execution', label: '执行日志' },
  { key: 'assessment', label: '绩效考核' },
  { key: 'report', label: '报告管理' },
  { key: 'issue', label: '问题管理' },
  { key: 'org', label: '组织人员' },
  { key: 'settings', label: '系统设置' },
  { key: 'role', label: '角色管理' },
];

const entityTypeLabels: Record<string, string> = {
  strategy: '战略审批',
  plan: '计划审批',
  task: '任务审批',
};

const entityTypeColors: Record<string, string> = {
  strategy: 'bg-purple-100 text-purple-800',
  plan: 'bg-blue-100 text-blue-800',
  task: 'bg-green-100 text-green-800',
};

function ImageUploadField({ label, value, onChange, hint }: { label: string; value?: string; onChange: (url: string) => void; hint: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('文件大小不能超过 2MB'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const endpoint = label.includes('Favicon') ? '/settings/upload/favicon' : '/settings/upload/logo';
      const res = await apiClient.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) onChange(res.data.data.url);
    } catch (err: any) { alert(err.response?.data?.error || '上传失败'); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative group">
            <img src={value} alt={label} className="w-16 h-16 object-contain border rounded-lg bg-white p-1" />
            <button onClick={() => onChange('')} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}
        <div className="flex-1 space-y-1">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-1" />{uploading ? '上传中...' : '上传图片'}
          </Button>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/x-icon,image/webp" onChange={handleUpload} className="hidden" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const { refreshPermissions } = usePermission();
  const [activeTab, setActiveTab] = useState<'role' | 'permission' | 'workflow' | 'brand' | 'backup'>('role');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [brand, setBrand] = useState<any>({ systemName: '', shortName: '', pageTitle: '', primaryColor: '#7c3aed', secondaryColor: '#3b82f6', logoUrl: '', faviconUrl: '', companyName: '', welcomeText: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', label: '', description: '', level: 99 });

  // 流程设置
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [editWorkflow, setEditWorkflow] = useState<Workflow | null>(null);
  const [workflowForm, setWorkflowForm] = useState<{
    name: string;
    description: string;
    entityType: 'strategy' | 'plan' | 'task';
    isActive: boolean;
    steps: { level: number; reviewerType: 'role' | 'user'; roleId: string; reviewerId: string; requireAll: boolean }[];
  }>({
    name: '', description: '', entityType: 'strategy', isActive: true,
    steps: [{ level: 1, reviewerType: 'role', roleId: '', reviewerId: '', requireAll: false }],
  });
  // 流程设置选项（角色/用户列表）
  const [workflowRoles, setWorkflowRoles] = useState<any[]>([]);
  const [workflowUsers, setWorkflowUsers] = useState<any[]>([]);

  const isCEO = currentUser?.role === 'ceo';

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [roleRes, permRes, brandRes, workflowRes] = await Promise.all([
        apiClient.get('/settings/roles'),
        apiClient.get('/settings/permissions'),
        apiClient.get('/settings/brand'),
        apiClient.get('/workflows'),
      ]);
      if (roleRes.data.success) {
        setRoles(roleRes.data.data);
        if (roleRes.data.data.length > 0) {
          const firstRoleId = roleRes.data.data[0].id;
          setSelectedRole(firstRoleId);
          // 加载第一个角色的权限
          const rpRes = await apiClient.get(`/settings/roles/${firstRoleId}/permissions`);
          setRolePerms({ [firstRoleId]: rpRes.data.data?.map((p: Permission) => p.id) || [] });
        }
      }
      if (permRes.data.success) setPermissions(permRes.data.data);
      if (brandRes.data.success) setBrand(brandRes.data.data);
      if (workflowRes.data.success) setWorkflows(workflowRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadRolePermissions = async (roleId: string) => {
    if (rolePerms[roleId]) return;
    try {
      const res = await apiClient.get(`/settings/roles/${roleId}/permissions`);
      setRolePerms({ ...rolePerms, [roleId]: res.data.data?.map((p: Permission) => p.id) || [] });
    } catch (e) { console.error(e); }
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    loadRolePermissions(roleId);
  };

  const togglePerm = (permId: string) => {
    const current = rolePerms[selectedRole] || [];
    const updated = current.includes(permId) ? current.filter(id => id !== permId) : [...current, permId];
    setRolePerms({ ...rolePerms, [selectedRole]: updated });
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      await apiClient.post(`/settings/roles/${selectedRole}/permissions`, { permissionIds: rolePerms[selectedRole] || [] });
      // 刷新当前用户的权限缓存
      await refreshPermissions();
      toast.success('权限保存成功');
    } catch (err: any) { 
      toast.error(err.response?.data?.error || getErrorMessage(err)); 
    }
    finally { setSaving(false); }
  };

  const openCreateRole = () => {
    setEditRole(null);
    setRoleForm({ name: '', label: '', description: '', level: 99 });
    setShowRoleDialog(true);
  };

  const openEditRole = (role: Role) => {
    setEditRole(role);
    setRoleForm({ name: role.name, label: role.label, description: role.description || '', level: role.level || 99 });
    setShowRoleDialog(true);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim() || !roleForm.label.trim()) { alert('请填写角色名称和显示名称'); return; }
    try {
      setSaving(true);
      if (editRole) {
        await apiClient.put(`/settings/roles/${editRole.id}`, roleForm);
      } else {
        await apiClient.post('/settings/roles', roleForm);
      }
      setShowRoleDialog(false);
      loadAll();
    } catch (err: any) { alert(err.response?.data?.error || getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const deleteRole = async (role: Role) => {
    if (role.isSystem) { alert('系统内置角色不可删除'); return; }
    if (!confirm(`确定删除角色 "${role.label}"？`)) return;
    try {
      await apiClient.delete(`/settings/roles/${role.id}`);
      loadAll();
    } catch (err: any) { alert(err.response?.data?.error || getErrorMessage(err)); }
  };

  // ========== 流程设置相关 ==========

  const loadWorkflowOptions = async () => {
    try {
      const [roleRes, userRes] = await Promise.all([
        apiClient.get('/workflows/options/roles'),
        apiClient.get('/workflows/options/users'),
      ]);
      if (roleRes.data.success) setWorkflowRoles(roleRes.data.data);
      if (userRes.data.success) setWorkflowUsers(userRes.data.data);
    } catch (e) { console.error(e); }
  };

  const openCreateWorkflow = (presetType?: 'strategy' | 'plan' | 'task') => {
    setEditWorkflow(null);
    setWorkflowForm({
      name: presetType ? entityTypeLabels[presetType] + '流程' : '',
      description: '',
      entityType: presetType || 'strategy',
      isActive: true,
      steps: [{ level: 1, reviewerType: 'role', roleId: '', reviewerId: '', requireAll: false }],
    });
    loadWorkflowOptions();
    setShowWorkflowDialog(true);
  };

  const openEditWorkflow = (wf: Workflow) => {
    setEditWorkflow(wf);
    setWorkflowForm({
      name: wf.name,
      description: wf.description || '',
      entityType: wf.entityType as 'strategy' | 'plan' | 'task',
      isActive: wf.isActive,
      steps: wf.steps.map(s => ({
        level: s.level,
        reviewerType: s.reviewerType as 'role' | 'user',
        roleId: s.roleId || '',
        reviewerId: s.reviewerId || '',
        requireAll: s.requireAll,
      })),
    });
    loadWorkflowOptions();
    setShowWorkflowDialog(true);
  };

  const addWorkflowStep = () => {
    const nextLevel = workflowForm.steps.length + 1;
    setWorkflowForm({
      ...workflowForm,
      steps: [...workflowForm.steps, { level: nextLevel, reviewerType: 'role', roleId: '', reviewerId: '', requireAll: false }],
    });
  };

  const removeWorkflowStep = (index: number) => {
    if (workflowForm.steps.length <= 1) return;
    const newSteps = workflowForm.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, level: i + 1 }));
    setWorkflowForm({ ...workflowForm, steps: newSteps });
  };

  const moveWorkflowStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...workflowForm.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setWorkflowForm({ ...workflowForm, steps: newSteps.map((s, i) => ({ ...s, level: i + 1 })) });
  };

  const updateWorkflowStep = (index: number, field: string, value: any) => {
    const newSteps = [...workflowForm.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    if (field === 'reviewerType') { newSteps[index].roleId = ''; newSteps[index].reviewerId = ''; }
    setWorkflowForm({ ...workflowForm, steps: newSteps });
  };

  const handleWorkflowSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowForm.name.trim()) { toast.error('请填写流程名称'); return; }
    for (const step of workflowForm.steps) {
      if (step.reviewerType === 'role' && !step.roleId) { toast.error(`第 ${step.level} 级审批未选择角色`); return; }
      if (step.reviewerType === 'user' && !step.reviewerId) { toast.error(`第 ${step.level} 级审批未选择用户`); return; }
    }
    try {
      setSaving(true);
      if (editWorkflow) {
        await apiClient.put(`/workflows/${editWorkflow.id}`, workflowForm);
        toast.success('流程更新成功');
      } else {
        await apiClient.post('/workflows', workflowForm);
        toast.success('流程创建成功');
      }
      setShowWorkflowDialog(false);
      const wfRes = await apiClient.get('/workflows');
      if (wfRes.data.success) setWorkflows(wfRes.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || getErrorMessage(err));
    } finally { setSaving(false); }
  };

  const toggleWorkflow = async (wf: Workflow) => {
    try {
      const res = await apiClient.patch(`/workflows/${wf.id}/toggle`);
      if (res.data.success) {
        setWorkflows(workflows.map(w => w.id === wf.id ? { ...w, isActive: !w.isActive } : w));
        toast.success(wf.isActive ? '流程已禁用' : '流程已启用');
      }
    } catch (err: any) { toast.error(err.response?.data?.error || '操作失败'); }
  };

  const deleteWorkflow = async (wf: Workflow) => {
    if (!confirm(`确定删除流程「${wf.name}」？`)) return;
    try {
      await apiClient.delete(`/workflows/${wf.id}`);
      setWorkflows(workflows.filter(w => w.id !== wf.id));
      toast.success('流程已删除');
    } catch (err: any) { toast.error(err.response?.data?.error || '删除失败'); }
  };

  const saveBrand = async () => {
    try {
      setSaving(true);
      await apiClient.put('/settings/brand', brand);
      alert('品牌配置保存成功');
      window.location.reload();
    } catch (err: any) { alert(err.response?.data?.error || getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 space-y-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-2xl">系统设置</h1>
          <div className="flex gap-2">
            <Button variant={activeTab === 'role' ? 'default' : 'outline'} onClick={() => setActiveTab('role')}>
              <Users className="w-4 h-4 mr-2" />角色管理
            </Button>
            <Button variant={activeTab === 'permission' ? 'default' : 'outline'} onClick={() => setActiveTab('permission')}>
              <Shield className="w-4 h-4 mr-2" />权限配置
            </Button>
            <Button variant={activeTab === 'workflow' ? 'default' : 'outline'} onClick={() => setActiveTab('workflow')}>
              <GitBranch className="w-4 h-4 mr-2" />流程设置
            </Button>
            <Button variant={activeTab === 'brand' ? 'default' : 'outline'} onClick={() => setActiveTab('brand')}>
              <Palette className="w-4 h-4 mr-2" />品牌定制
            </Button>
            {isCEO && (
              <Button variant={activeTab === 'backup' ? 'default' : 'outline'} onClick={() => setActiveTab('backup')}>
                <Database className="w-4 h-4 mr-2" />数据备份
              </Button>
            )}
          </div>
        </div>
      </FadeIn>

      {/* 角色管理 */}
      {activeTab === 'role' && (
        <FadeIn>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>角色管理</CardTitle>
              <Button onClick={openCreateRole}><Plus className="w-4 h-4 mr-2" />新建角色</Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <div className="grid grid-cols-5 gap-4 p-3 bg-muted font-medium text-sm">
                  <div>角色名称</div>
                  <div>显示名称</div>
                  <div>权限数</div>
                  <div>用户数</div>
                  <div className="text-right">操作</div>
                </div>
                {roles.map(role => (
                  <div key={role.id} className="grid grid-cols-5 gap-4 p-3 border-t items-center hover:bg-muted/30">
                    <div className="font-mono text-sm">{role.name}</div>
                    <div className="flex items-center gap-2">
                      {role.label}
                      {role.isSystem && <Badge variant="secondary" className="text-xs">系统</Badge>}
                    </div>
                    <div>{role.permissionCount || 0}</div>
                    <div>{role.userCount || 0}</div>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setActiveTab('permission'); setSelectedRole(role.id); loadRolePermissions(role.id); }} title="配置权限"><Shield className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditRole(role)} title="编辑角色"><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteRole(role)} disabled={role.isSystem} title="删除角色"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* 权限配置 */}
      {activeTab === 'permission' && (
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>权限配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4 flex-wrap">
                {roles.map(r => (
                  <Button key={r.id} variant={selectedRole === r.id ? 'default' : 'outline'} size="sm" onClick={() => handleRoleSelect(r.id)}>
                    {r.label}
                    {r.isSystem && <Badge variant="secondary" className="ml-2 text-xs">系统</Badge>}
                  </Button>
                ))}
              </div>
              {permissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无权限数据</div>
              ) : (
                <div className="space-y-4">
                  {modules.map(mod => {
                    const modPerms = permissions.filter(p => p.module === mod.key);
                    if (modPerms.length === 0) return null;
                    return (
                      <div key={mod.key} className="border rounded-lg p-4">
                        <div className="font-medium mb-2">{mod.label}</div>
                        <div className="flex flex-wrap gap-2">
                          {modPerms.map(p => {
                            const checked = (rolePerms[selectedRole] || []).includes(p.id);
                            return (
                              <div key={p.id} onClick={() => togglePerm(p.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer transition ${checked ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                                {checked ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 opacity-50" />}
                                <span className="text-sm">{p.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex justify-end mt-4">
                <Button onClick={savePermissions} disabled={saving}>{saving ? '保存中...' : '保存权限配置'}</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* 流程设置 */}
      {activeTab === 'workflow' && (
        <FadeIn>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>流程设置</CardTitle>
              <Button onClick={() => openCreateWorkflow()}><Plus className="w-4 h-4 mr-2" />新建流程</Button>
            </CardHeader>
            <CardContent>
              {workflows.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">暂无审批流程</p>
                  <p className="text-sm mb-4">创建流程来配置战略、计划、任务的审批规则</p>
                  <div className="flex justify-center gap-3">
                    <Button variant="outline" onClick={() => openCreateWorkflow('strategy')}>+ 战略审批流程</Button>
                    <Button variant="outline" onClick={() => openCreateWorkflow('plan')}>+ 计划审批流程</Button>
                    <Button variant="outline" onClick={() => openCreateWorkflow('task')}>+ 任务审批流程</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {workflows.map(wf => (
                    <div key={wf.id} className={`border rounded-lg p-5 transition ${!wf.isActive ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className={entityTypeColors[wf.entityType] || 'bg-gray-100 text-gray-800'}>
                            {entityTypeLabels[wf.entityType] || wf.entityType}
                          </Badge>
                          <h3 className="font-semibold text-lg">{wf.name}</h3>
                          {wf.isActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">已启用</Badge>
                          ) : (
                            <Badge variant="secondary">已禁用</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => toggleWorkflow(wf)} title={wf.isActive ? '禁用' : '启用'}>
                            {wf.isActive ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditWorkflow(wf)} title="编辑"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteWorkflow(wf)} title="删除"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                      {wf.description && <p className="text-sm text-muted-foreground mb-3">{wf.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        {wf.steps.sort((a: WorkflowStep, b: WorkflowStep) => a.level - b.level).map((step: WorkflowStep, idx: number) => (
                          <div key={step.id} className="flex items-center gap-2">
                            {idx > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm">
                              <span className="text-muted-foreground">第{step.level}级</span>
                              {step.reviewerType === 'role' ? (
                                <>
                                  <Badge variant="outline">{step.role?.label || '未知角色'}</Badge>
                                  {step.requireAll && <Badge variant="secondary" className="text-xs">会签</Badge>}
                                </>
                              ) : (
                                <Badge variant="outline"><UserCircle className="w-3 h-3 mr-1" />{step.reviewer?.name || '未知用户'}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {(['strategy', 'plan', 'task'] as const).filter(t => !new Set(workflows.map(w => w.entityType)).has(t)).length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <p className="text-sm text-muted-foreground mb-3">未配置的流程类型：</p>
                      <div className="flex gap-3">
                        {(['strategy', 'plan', 'task'] as const).filter(t => !new Set(workflows.map(w => w.entityType)).has(t)).map(t => (
                          <Button key={t} variant="outline" size="sm" onClick={() => openCreateWorkflow(t)}>
                            <Plus className="w-4 h-4 mr-1" />{entityTypeLabels[t]}流程
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">流程说明</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 border rounded-lg"><div className="font-medium mb-1">战略审批</div><div className="text-muted-foreground">战略创建后需经审批流程审核通过方可生效。生效后修改需走变更申请。</div></div>
                <div className="p-3 border rounded-lg"><div className="font-medium mb-1">计划审批</div><div className="text-muted-foreground">部门/个人计划提交后按流程审批。支持多级审批（如：部门负责人→CEO）。</div></div>
                <div className="p-3 border rounded-lg"><div className="font-medium mb-1">任务审批</div><div className="text-muted-foreground">任务提交后由指定审批人确认。生效后核心字段修改需走变更申请。</div></div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* 品牌定制 */}
      {activeTab === 'brand' && (
        <FadeIn>
          <Card>
            <CardHeader><CardTitle>品牌定制</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <ImageUploadField label="Logo" value={brand.logoUrl} onChange={url => setBrand({ ...brand, logoUrl: url })} hint="建议尺寸 200x200px，支持 PNG/SVG/JPG/WebP，最大 2MB" />
                  <ImageUploadField label="Favicon（网站图标）" value={brand.faviconUrl} onChange={url => setBrand({ ...brand, faviconUrl: url })} hint="建议尺寸 32x32px 或 64x64px，支持 ICO/PNG/SVG，最大 2MB" />
                  <div className="space-y-2"><Label>系统名称</Label><Input value={brand.systemName} onChange={e => setBrand({ ...brand, systemName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>简称</Label><Input value={brand.shortName} onChange={e => setBrand({ ...brand, shortName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>浏览器标签标题</Label><Input value={brand.pageTitle || ''} onChange={e => setBrand({ ...brand, pageTitle: e.target.value })} placeholder="如：ACEMATIC运营管理系统" /></div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>公司名称</Label><Input value={brand.companyName || ''} onChange={e => setBrand({ ...brand, companyName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>欢迎语</Label><Input value={brand.welcomeText || ''} onChange={e => setBrand({ ...brand, welcomeText: e.target.value })} /></div>
                  <div className="space-y-2"><Label>主色调</Label><div className="flex gap-2"><Input type="color" value={brand.primaryColor} onChange={e => setBrand({ ...brand, primaryColor: e.target.value })} className="w-12 h-9 p-0" /><Input value={brand.primaryColor} onChange={e => setBrand({ ...brand, primaryColor: e.target.value })} /></div></div>
                  <div className="space-y-2"><Label>辅助色</Label><div className="flex gap-2"><Input type="color" value={brand.secondaryColor} onChange={e => setBrand({ ...brand, secondaryColor: e.target.value })} className="w-12 h-9 p-0" /><Input value={brand.secondaryColor} onChange={e => setBrand({ ...brand, secondaryColor: e.target.value })} /></div></div>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground mb-3">预览效果</div>
                <div className="flex items-center gap-4">
                  {brand.logoUrl ? (
                    <img src={brand.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded-lg border p-1 bg-white" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ background: brand.primaryColor }}>{brand.shortName?.[0] || 'A'}</div>
                  )}
                  <div>
                    <div className="font-bold text-lg">{brand.systemName || '系统名称'}</div>
                    <div className="text-sm text-muted-foreground">{brand.welcomeText || '欢迎使用'}</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={saveBrand} disabled={saving}>{saving ? '保存中...' : '保存品牌配置'}</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* 数据备份还原 */}
      {activeTab === 'backup' && isCEO && (
        <FadeIn>
          <Card>
            <CardHeader><CardTitle>数据备份与还原</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">备份数据</h3>
                  <p className="text-sm text-muted-foreground mb-4">导出系统所有数据（用户、部门、战略、计划、任务等）为 JSON 文件</p>
                  <Button onClick={async () => {
                    try {
                      const res = await apiClient.get('/backup/export');
                      if (res.data.success) {
                        exportToJSON(res.data.data, 'acematic-backup');
                        toast.success('备份成功');
                      }
                    } catch (err: any) {
                      toast.error(err.response?.data?.error || '备份失败');
                    }
                  }}><Download className="w-4 h-4 mr-2" />导出备份</Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">还原数据</h3>
                  <p className="text-sm text-muted-foreground mb-4">从备份文件还原系统数据（会覆盖现有数据）</p>
                  <Button variant="destructive" onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      try {
                        const data = await importFromJSON<any>(file);
                        if (!confirm('确定要还原数据吗？这将覆盖现有数据！')) return;
                        const res = await apiClient.post('/backup/import', { data, options: { skipExisting: true } });
                        toast.success(res.data.message || '还原成功');
                      } catch (err: any) {
                        toast.error(err.message || err.response?.data?.error || '还原失败');
                      }
                    };
                    input.click();
                  }}><Upload className="w-4 h-4 mr-2" />选择备份文件</Button>
                </div>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg">
                <h3 className="font-medium text-destructive mb-2">危险操作</h3>
                <p className="text-sm text-muted-foreground mb-4">重置数据库将删除所有数据，仅保留 CEO 账户</p>
                <Button variant="destructive" onClick={async () => {
                  if (!confirm('确定要重置数据库吗？此操作不可恢复！')) return;
                  if (!confirm('再次确认：所有数据将被删除！')) return;
                  try {
                    await apiClient.post('/backup/reset');
                    toast.success('数据库已重置');
                    setTimeout(() => window.location.href = '/login', 2000);
                  } catch (err: any) {
                    toast.error(err.response?.data?.error || '重置失败');
                  }
                }}>重置数据库</Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* 角色编辑弹窗 */}
      {showRoleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader><CardTitle>{editRole ? '编辑角色' : '新建角色'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleRoleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>角色标识 *</Label><Input value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="如: custom_manager" required disabled={!!editRole?.isSystem} /></div>
                <div className="space-y-2"><Label>显示名称 *</Label><Input value={roleForm.label} onChange={e => setRoleForm({ ...roleForm, label: e.target.value })} placeholder="如: 自定义经理" required /></div>
                <div className="space-y-2"><Label>描述</Label><Input value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} /></div>
                <div className="space-y-2"><Label>级别（数字越小权限越高）</Label><Input type="number" value={roleForm.level} onChange={e => setRoleForm({ ...roleForm, level: parseInt(e.target.value) || 99 })} /></div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowRoleDialog(false)}>取消</Button>
                  <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 流程编辑弹窗 */}
      {showWorkflowDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader><CardTitle>{editWorkflow ? '编辑流程' : '新建流程'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleWorkflowSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>流程名称 *</Label>
                    <Input value={workflowForm.name} onChange={e => setWorkflowForm({ ...workflowForm, name: e.target.value })} placeholder="如：战略审批流程" required />
                  </div>
                  <div className="space-y-2">
                    <Label>适用对象 *</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      value={workflowForm.entityType}
                      disabled={!!editWorkflow}
                      onChange={e => setWorkflowForm({ ...workflowForm, entityType: e.target.value as any })}
                    >
                      <option value="strategy">战略审批</option>
                      <option value="plan">计划审批</option>
                      <option value="task">任务审批</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>流程描述</Label>
                  <Input value={workflowForm.description} onChange={e => setWorkflowForm({ ...workflowForm, description: e.target.value })} placeholder="可选：描述该流程的用途" />
                </div>

                {/* 审批步骤 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">审批步骤</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addWorkflowStep}><Plus className="w-4 h-4 mr-1" />添加步骤</Button>
                  </div>
                  {workflowForm.steps.map((step, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <Badge variant="outline" className="font-medium">第 {step.level} 级审批</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => moveWorkflowStep(index, 'up')} disabled={index === 0}><ChevronUp className="w-4 h-4" /></Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => moveWorkflowStep(index, 'down')} disabled={index === workflowForm.steps.length - 1}><ChevronDown className="w-4 h-4" /></Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeWorkflowStep(index)} disabled={workflowForm.steps.length <= 1}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">审批人类型</Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                            value={step.reviewerType}
                            onChange={e => updateWorkflowStep(index, 'reviewerType', e.target.value)}
                          >
                            <option value="role">按角色</option>
                            <option value="user">指定用户</option>
                          </select>
                        </div>
                        {step.reviewerType === 'role' ? (
                          <div className="space-y-1">
                            <Label className="text-xs">选择角色 *</Label>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                              value={step.roleId}
                              onChange={e => updateWorkflowStep(index, 'roleId', e.target.value)}
                            >
                              <option value="">请选择角色</option>
                              {workflowRoles.map((r: any) => (
                                <option key={r.id} value={r.id}>{r.label} ({r.name})</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Label className="text-xs">选择用户 *</Label>
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                              value={step.reviewerId}
                              onChange={e => updateWorkflowStep(index, 'reviewerId', e.target.value)}
                            >
                              <option value="">请选择用户</option>
                              {workflowUsers.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name} - {(u.department?.name || '')} [{u.role}]</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="space-y-1 flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={step.requireAll}
                              onChange={e => updateWorkflowStep(index, 'requireAll', e.target.checked)}
                              disabled={step.reviewerType !== 'role'}
                              className="rounded border-gray-300"
                            />
                            <span className={step.reviewerType !== 'role' ? 'text-muted-foreground' : ''}>会签（需该角色所有人通过）</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={workflowForm.isActive}
                      onChange={e => setWorkflowForm({ ...workflowForm, isActive: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    启用该流程
                  </label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowWorkflowDialog(false)}>取消</Button>
                    <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
