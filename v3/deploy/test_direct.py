import json, urllib.request

# 直接测试后端登录
req = urllib.request.Request(
    'http://localhost:3000/api/auth/login',
    data=json.dumps({'username': 'ceo', 'password': '123456'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print('直接访问后端登录成功:', resp.read().decode()[:200])
except Exception as e:
    print('直接访问后端登录失败:', e)
