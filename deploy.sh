#!/bin/bash

# ============================================
# 运营管理系统 - 一键部署脚本
# 适用于：首次部署或更新部署
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() { echo -e "${BLUE}ℹ ${NC}$1"; }
print_success() { echo -e "${GREEN}✓ ${NC}$1"; }
print_warning() { echo -e "${YELLOW}⚠ ${NC}$1"; }
print_error() { echo -e "${RED}✗ ${NC}$1"; }
print_step() { echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${GREEN}$1${NC}"; echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装"
        print_info "安装方法："
        case $1 in
            git) echo "  https://git-scm.com/downloads" ;;
            node) echo "  https://nodejs.org/" ;;
            python3) echo "  https://www.python.org/downloads/" ;;
            vercel) echo "  npm install -g vercel" ;;
            railway) echo "  npm install -g @railway/cli" ;;
        esac
        exit 1
    fi
}

# ============================================
# 主流程
# ============================================

clear
echo -e "${GREEN}"
cat << "EOF"
╔═════════════════════════════════════════════════════╗
║                                                     ║
║      运营管理系统 - 一键部署脚本 v1.0               ║
║                                                     ║
║      目标：零成本云端部署                          ║
║      平台：Railway(后端) + Vercel(前端)            ║
║                                                     ║
╚═════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ============================================
# 步骤0：环境检查
# ============================================
print_step "步骤 0/5：环境检查"

print_info "检查必需工具..."
check_command git
check_command node
check_command python3

print_success "所有必需工具已安装"

# ============================================
# 步骤1：配置后端URL
# ============================================
print_step "步骤 1/5：配置API地址"

echo -e "${YELLOW}请选择操作模式：${NC}"
echo "  1) 首次部署（需要配置后端URL）"
echo "  2) 更新部署（已有后端URL）"
echo "  3) 仅本地测试（不部署到云端）"
echo ""
read -p "请选择 [1-3]: " mode_choice

case $mode_choice in
    1)
        echo ""
        print_warning "首次部署流程："
        echo "  1. 先部署后端到Railway，获取URL"
        echo "  2. 再配置前端，部署到Vercel"
        echo ""
        read -p "是否已部署后端到Railway并获取URL？(y/n): " has_backend_url
        
        if [[ $has_backend_url == "y" || $has_backend_url == "Y" ]]; then
            read -p "请输入Railway后端URL（如：https://xxx.up.railway.app）: " backend_url
            backend_url="${backend_url%/}"  # 移除末尾斜杠
            
            # 更新配置文件
            sed -i.bak "s|https://your-backend-url.railway.app|$backend_url|g" frontend/.env.production
            sed -i.bak "s|https://your-backend-url.railway.app|$backend_url|g" frontend/vercel.json
            sed -i.bak "s|https://your-backend-url.railway.app|$backend_url|g" vercel.json
            rm -f frontend/.env.production.bak frontend/vercel.json.bak vercel.json.bak
            
            print_success "API地址已配置: $backend_url"
        else
            print_info "请按以下步骤操作："
            echo "  1. 访问 https://railway.app 并登录"
            echo "  2. 创建新项目，选择GitHub仓库"
            echo "  3. 等待部署完成，获取域名"
            echo "  4. 重新运行本脚本，选择选项1"
            exit 0
        fi
        ;;
    2)
        print_info "将使用现有配置继续部署..."
        ;;
    3)
        print_info "启动本地开发环境..."
        cd backend && python3 app.py &
        BACKEND_PID=$!
        cd ../frontend && npm install && npm run dev
        exit 0
        ;;
    *)
        print_error "无效选择"
        exit 1
        ;;
esac

# ============================================
# 步骤2：Git操作
# ============================================
print_step "步骤 2/5：代码提交到GitHub"

# 检查是否在git仓库中
if [ ! -d .git ]; then
    print_info "初始化Git仓库..."
    git init
    git branch -M main
fi

# 检查是否有远程仓库
if ! git remote | grep -q origin; then
    echo ""
    print_warning "未配置远程仓库"
    echo -e "${YELLOW}请在GitHub创建仓库后，输入仓库地址${NC}"
    echo "示例：https://github.com/你的用户名/operations-management-system.git"
    echo ""
    read -p "GitHub仓库地址: " repo_url
    git remote add origin $repo_url
fi

# 添加并提交
print_info "检查文件变更..."
git add .

if git diff --staged --quiet; then
    print_warning "没有文件变更，跳过提交"
else
    commit_msg="部署更新 - $(date '+%Y-%m-%d %H:%M:%S')"
    read -p "提交信息 [$commit_msg]: " custom_msg
    commit_msg=${custom_msg:-$commit_msg}
    
    git commit -m "$commit_msg"
    print_success "代码已提交"
fi

# 推送到GitHub
print_info "推送到GitHub..."
git push -u origin main 2>/dev/null || git push origin main

print_success "代码已推送到GitHub"

# ============================================
# 步骤3：部署后端到Railway
# ============================================
print_step "步骤 3/5：部署后端"

if command -v railway &> /dev/null; then
    print_info "检测到Railway CLI，开始部署..."
    
    # 检查是否已登录
    if ! railway status &> /dev/null; then
        print_info "请登录Railway..."
        railway login
    fi
    
    # 部署
    railway up
    
    print_success "后端部署完成"
else
    print_warning "未安装Railway CLI"
    print_info "请手动部署："
    echo "  1. 访问 https://railway.app"
    echo "  2. 使用GitHub账号登录"
    echo "  3. 点击 'New Project' → 'Deploy from GitHub repo'"
    echo "  4. 选择你的仓库"
    echo "  5. 等待自动部署完成"
    echo ""
    print_warning "或安装Railway CLI后重新运行："
    echo "  npm install -g @railway/cli"
fi

# ============================================
# 步骤4：部署前端到Vercel
# ============================================
print_step "步骤 4/5：部署前端"

if command -v vercel &> /dev/null; then
    print_info "检测到Vercel CLI，开始部署..."
    
    # 检查是否已登录
    if [ ! -f ~/.vercel/auth.json ]; then
        print_info "请登录Vercel..."
        vercel login
    fi
    
    # 部署到生产环境
    cd frontend
    vercel --prod
    cd ..
    
    print_success "前端部署完成"
else
    print_warning "未安装Vercel CLI"
    print_info "请手动部署："
    echo "  1. 访问 https://vercel.com"
    echo "  2. 使用GitHub账号登录"
    echo "  3. 点击 'Add New Project'"
    echo "  4. 选择你的GitHub仓库"
    echo "  5. Root Directory 设置为 'frontend'"
    echo "  6. 点击 'Deploy'"
    echo ""
    print_warning "或安装Vercel CLI后重新运行："
    echo "  npm install -g vercel"
fi

# ============================================
# 步骤5：部署完成
# ============================================
print_step "步骤 5/5：部署完成"

echo -e "${GREEN}"
cat << "EOF"
╔═════════════════════════════════════════════════════╗
║                                                     ║
║              🎉 部署成功！                          ║
║                                                     ║
║   访问你的运营管理系统：                            ║
║   - Vercel前端地址（见上方输出）                   ║
║                                                     ║
║   默认账号：                                        ║
║   - 用户名：admin                                   ║
║   - 密码：admin123                                  ║
║                                                     ║
║   后续更新：                                        ║
║   - 修改代码后执行 git push 即可自动部署           ║
║                                                     ║
╚═════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

print_info "有用链接："
echo "  - Railway控制台：https://railway.app/dashboard"
echo "  - Vercel控制台：https://vercel.com/dashboard"
echo "  - GitHub仓库：https://github.com"

echo ""
print_warning "重要提示："
echo "  1. 首次登录后请立即修改admin密码"
echo "  2. 建议配置自定义域名"
echo "  3. 定期备份数据库"
echo ""
