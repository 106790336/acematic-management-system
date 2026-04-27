import json, urllib.request, sys

def test_login():
    data = {'username': 'ceo', 'password': '123456'}
    json_data = json.dumps(data).encode('utf-8')
    print(f'Sending JSON: {json_data}')
    
    req = urllib.request.Request(
        'http://localhost:3000/api/auth/login',
        data=json_data,
        headers={'Content-Type': 'application/json'}
    )
    try:
        resp = urllib.request.urlopen(req)
        result = resp.read().decode()
        print('Login success:', result[:200])
        return True
    except urllib.error.HTTPError as e:
        print('Login failed:', e.code, e.read().decode())
        return False

if __name__ == '__main__':
    test_login()
