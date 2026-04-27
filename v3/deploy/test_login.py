import json, urllib.request

req = urllib.request.Request(
    'http://localhost:3000/api/auth/login',
    data=json.dumps({'username': 'ceo', 'password': '123456'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print('SUCCESS:', resp.read().decode()[:200])
except urllib.error.HTTPError as e:
    print('HTTP ERROR:', e.code, e.read().decode())
except Exception as e:
    print('ERROR:', e)
