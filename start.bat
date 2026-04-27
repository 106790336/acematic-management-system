@echo off
chcp 65001 >nul

echo.
echo 🚀 启动运营管理系统（本地开发模式）...
echo.

:: 安装后端依赖
echo 📦 安装后端依赖...
cd backend
pip install -r requirements.txt

:: 启动后端
echo 🔧 启动后端服务...
start cmd /k "python app.py"

:: 等待后端启动
timeout /t 3 /nobreak >nul

:: 安装前端依赖
echo 📦 安装前端依赖...
cd ..\frontend
call npm install

:: 启动前端
echo 🎨 启动前端服务...
call npm run dev

pause
