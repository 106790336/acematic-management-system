import json, urllib.request, sys

def test_login():
    req = urllib.request.Request(
        'http://localhost:3000/api/login',
        data=json.dumps({'username': 'ceo', 'password': '123456'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        resp = urllib.request.urlopen(req)
        print('Login success:', resp.read().decode())
        return True
    except urllib.error.HTTPError as e:
        print('Login failed:', e.code, e.read().decode())
        return False

if __name__ == '__main__':
    test_login()
