import json, urllib.request

BASE_URL = 'http://43.138.204.20/api'
TOKEN = None

def request(method, path, data=None, use_auth=True):
    url = f'{BASE_URL}{path}'
    headers = {'Content-Type': 'application/json'}
    if use_auth and TOKEN:
        headers['Authorization'] = f'Bearer {TOKEN}'
    
    json_data = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=json_data, headers=headers, method=method)
    
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {'success': False, 'error': f'HTTP {e.code}: {e.read().decode()}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_all():
    global TOKEN
    
    print('=== ACEMATIC 系统全面测试 ===\n')
    
    # 1. 登录
    print('1. 登录测试')
    result = request('POST', '/auth/login', {'username': 'ceo', 'password': '123456'}, use_auth=False)
    if result.get('success'):
        TOKEN = result['data']['token']
        print('   ✓ 登录成功')
    else:
        print('   ✗ 登录失败:', result)
        return
    
    # 2. 获取用户信息
    print('\n2. 用户信息')
    result = request('GET', '/auth/profile')
    if result.get('success'):
        print(f"   ✓ 当前用户: {result['data']['name']} ({result['data']['role']})")
    
    # 3. 战略列表
    print('\n3. 战略管理')
    result = request('GET', '/strategies?limit=1')
    if result.get('success'):
        print(f"   ✓ 战略列表: {result['data']['total']} 条")
    
    # 4. 计划列表
    print('\n4. 计划管理')
    result = request('GET', '/plans?limit=1')
    if result.get('success'):
        print(f"   ✓ 计划列表: {result['data']['total']} 条")
    
    # 5. 任务列表
    print('\n5. 任务管理')
    result = request('GET', '/tasks-v2?limit=1')
    if result.get('success'):
        print(f"   ✓ 任务列表: {result['data']['total']} 条")
    
    # 6. 问题列表
    print('\n6. 问题清单')
    result = request('GET', '/issues?limit=1')
    if result.get('success'):
        print(f"   ✓ 问题列表: {result['data']['total']} 条")
    
    # 7. 流程设置
    print('\n7. 流程设置')
    result = request('GET', '/workflows')
    if result.get('success'):
        print('   ✓ 流程设置已加载')
    
    # 8. 变更申请
    print('\n8. 变更申请')
    result = request('GET', '/change-requests?limit=1')
    if result.get('success'):
        print(f"   ✓ 变更申请: {result['data']['total']} 条")
    
    # 9. 获取设置
    print('\n9. 系统设置')
    result = request('GET', '/settings/brand')
    if result.get('success'):
        print('   ✓ 系统设置已加载')
    
    print('\n=== 测试完成 ===')
    print('系统访问地址: http://43.138.204.20')
    print('测试账号: ceo / 123456')

if __name__ == '__main__':
    test_all()
