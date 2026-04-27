import json, urllib.request

# 测试通过 nginx 访问登录 API
req = urllib.request.Request(
    'http://43.138.204.20/api/auth/login',
    data=json.dumps({'username': 'ceo', 'password': '123456'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print('通过 nginx 登录成功:', resp.read().decode()[:200])
except Exception as e:
    print('通过 nginx 登录失败:', e)
