import json, urllib.request

# 测试通过 nginx 的登录
req = urllib.request.Request(
    'http://43.138.204.20/api/auth/login',
    data=json.dumps({'username': 'ceo', 'password': '123456'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print('NGINX SUCCESS:', resp.read().decode()[:200])
except urllib.error.HTTPError as e:
    print('NGINX HTTP ERROR:', e.code, e.read().decode())
except Exception as e:
    print('NGINX ERROR:', e)

# 测试直接访问后端
req2 = urllib.request.Request(
    'http://localhost:3000/api/auth/login',
    data=json.dumps({'username': 'ceo', 'password': '123456'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    resp2 = urllib.request.urlopen(req2)
    print('DIRECT SUCCESS:', resp2.read().decode()[:200])
except urllib.error.HTTPError as e:
    print('DIRECT HTTP ERROR:', e.code, e.read().decode())
except Exception as e:
    print('DIRECT ERROR:', e)
