#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8080/api"

# 登录获取 token
login_data = {"username": "ceo", "password": "123456"}
print(f"登录请求: {json.dumps(login_data)}")
resp = requests.post(f"{BASE_URL}/auth/login", json=login_data)
print(f"登录响应: {resp.status_code}")
print(f"响应内容: {resp.text}")

if resp.status_code == 200:
    data = resp.json()
    if data.get('success'):
        token = data['data']['token']
        print(f"\n获取到 token: {token[:20]}...")
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 测试角色列表 API
        print("\n=== 测试 /workflows/options/roles ===")
        resp = requests.get(f"{BASE_URL}/workflows/options/roles", headers=headers)
        print(f"状态码: {resp.status_code}")
        print(f"响应: {resp.text[:500]}")
        
        # 测试用户列表 API
        print("\n=== 测试 /workflows/options/users ===")
        resp = requests.get(f"{BASE_URL}/workflows/options/users", headers=headers)
        print(f"状态码: {resp.status_code}")
        print(f"响应: {resp.text[:500]}")
