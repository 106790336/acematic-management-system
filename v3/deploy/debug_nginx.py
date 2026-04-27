import json, urllib.request

# 测试通过 nginx 的登录，添加更多调试信息
class DebugHandler(urllib.request.HTTPHandler):
    def http_request(self, req):
        print(f'Request URL: {req.get_full_url()}')
        print(f'Request Method: {req.get_method()}')
        print(f'Request Headers: {dict(req.headers)}')
        return super().http_request(req)

opener = urllib.request.build_opener(DebugHandler())
urllib.request.install_opener(opener)

data = json.dumps({'username': 'ceo', 'password': '123456'}).encode('utf-8')
req = urllib.request.Request(
    'http://43.138.204.20/api/auth/login',
    data=data,
    headers={'Content-Type': 'application/json'}
)
try:
    resp = urllib.request.urlopen(req)
    print('Response:', resp.read().decode()[:200])
except urllib.error.HTTPError as e:
    print(f'HTTP Error {e.code}: {e.read().decode()}')
except Exception as e:
    print('Error:', e)
