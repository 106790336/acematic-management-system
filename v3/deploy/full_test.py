import json, urllib.request, sys

BASE_URL = 'http://localhost:3000/api'
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
    
    # 1. 登录
    print('=== 1. 登录 ===')
    result = request('POST', '/auth/login', {'username': 'ceo', 'password': '123456'}, use_auth=False)
    if result.get('success'):
        TOKEN = result['data']['token']
        print('✓ 登录成功')
    else:
        print('✗ 登录失败:', result)
        return
    
    # 2. 获取战略列表
    print('\n=== 2. 战略列表 ===')
    result = request('GET', '/strategies?limit=1')
    print('✓' if result.get('success') else '✗', '战略列表', result.get('data', {}).get('total', 'N/A'), '条')
    
    # 3. 获取计划列表
    print('\n=== 3. 计划列表 ===')
    result = request('GET', '/plans?limit=1')
    print('✓' if result.get('success') else '✗', '计划列表', result.get('data', {}).get('total', 'N/A'), '条')
    
    # 4. 获取任务列表
    print('\n=== 4. 任务列表 ===')
    result = request('GET', '/tasks-v2?limit=1')
    print('✓' if result.get('success') else '✗', '任务列表', result.get('data', {}).get('total', 'N/A'), '条')
    
    # 5. 获取问题列表
    print('\n=== 5. 问题列表 ===')
    result = request('GET', '/issues?limit=1')
    print('✓' if result.get('success') else '✗', '问题列表', result.get('data', {}).get('total', 'N/A'), '条')
    
    # 6. 获取流程设置
    print('\n=== 6. 流程设置 ===')
    result = request('GET', '/workflows')
    print('✓' if result.get('success') else '✗', '流程设置')
    
    # 7. 获取变更申请列表
    print('\n=== 7. 变更申请列表 ===')
    result = request('GET', '/change-requests?limit=1')
    print('✓' if result.get('success') else '✗', '变更申请列表', result.get('data', {}).get('total', 'N/A'), '条')
    
    print('\n=== 测试完成 ===')

if __name__ == '__main__':
    test_all()
