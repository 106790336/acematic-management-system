# ACEMATIC 腾讯云微搭 - 速达ERP集成配置说明

## 一、集成概述

### 1.1 集成目标
- 实现速达ERP与微搭系统的数据自动同步
- 每日自动拉取销售、回款、库存、成本、采购数据
- 为绩效考核和质量管控提供数据源

### 1.2 集成架构
```
速达AI70.engineer ERP
    │
    │ API接口
    ▼
微搭API连接器
    │
    │ 数据转换
    ▼
微搭数据库
    │
    │ 业务逻辑
    ▼
绩效考核/质量管控应用
```

### 1.3 同步数据清单

| 数据类型 | 同步频率 | 用途 | 影响指标 |
|----------|----------|------|----------|
| 销售数据 | 每日 | 营收、毛利计算 | 营销中心营收达成率 |
| 回款数据 | 每日 | 回款率计算 | 营销中心回款达成率 |
| 库存数据 | 每日 | 库存周转、成本控制 | 运营中心库存指标 |
| 成本数据 | 每日 | 成本控制、毛利计算 | 产品中心成本指标 |
| 采购数据 | 每日 | 采购到货、供应商评估 | 运营中心采购指标 |

---

## 二、速达ERP API配置

### 2.1 获取API权限

#### 步骤1：联系速达技术支持
1. 拨打速达客服热线：400-XXX-XXXX
2. 提供企业信息和授权码
3. 申请开通API接口权限

#### 步骤2：获取API密钥
```
API Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
API Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
API Base URL: https://api.suda.com/v2
```

#### 步骤3：配置IP白名单
将以下IP地址加入速达ERP白名单：
```
腾讯云微搭出口IP（需咨询腾讯云获取）
或设置为：0.0.0.0/0（不推荐，仅限测试）
```

### 2.2 API接口文档

#### 接口1：获取销售日报
```http
POST https://api.suda.com/v2/sales/daily
Content-Type: application/json
Authorization: Bearer {API_KEY}

Request Body:
{
  "date": "2026-04-05",          // 查询日期
  "format": "detailed"           // 返回格式：detailed/summary
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "date": "2026-04-05",
    "totalSales": 125000.00,      // 当日销售额
    "totalOrders": 8,             // 订单数量
    "totalCustomers": 5,          // 客户数量
    "details": [
      {
        "orderNo": "SO20260405001",
        "customerName": "XX装饰公司",
        "salesAmount": 50000.00,
        "productCode": "CP-001",
        "productName": "智能面板",
        "quantity": 10,
        "salesman": "张三"
      }
    ]
  }
}
```

#### 接口2：获取回款数据
```http
POST https://api.suda.com/v2/finance/receipts
Content-Type: application/json
Authorization: Bearer {API_KEY}

Request Body:
{
  "startDate": "2026-04-01",
  "endDate": "2026-04-05"
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "totalReceipts": 98000.00,    // 回款总额
    "receiptCount": 6,            // 回款笔数
    "receiptRate": 78.4,          // 回款率（相对于销售额）
    "details": [
      {
        "receiptNo": "RC20260405001",
        "customerName": "XX装饰公司",
        "amount": 30000.00,
        "receiptDate": "2026-04-05",
        "orderNo": "SO20260328001"
      }
    ]
  }
}
```

#### 接口3：获取库存数据
```http
GET https://api.suda.com/v2/inventory/current
Authorization: Bearer {API_KEY}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "totalValue": 580000.00,      // 库存总金额
    "skuCount": 156,              // SKU数量
    "turnoverRate": 8.5,          // 库存周转率
    "items": [
      {
        "materialCode": "WL-001",
        "materialName": "主板",
        "quantity": 500,
        "unitPrice": 120.00,
        "totalValue": 60000.00
      }
    ]
  }
}
```

#### 接口4：获取成本数据
```http
POST https://api.suda.com/v2/cost/daily
Content-Type: application/json
Authorization: Bearer {API_KEY}

Request Body:
{
  "date": "2026-04-05"
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "date": "2026-04-05",
    "productionCost": 85000.00,   // 生产成本
    "materialCost": 62000.00,     // 材料成本
    "laborCost": 15000.00,        // 人工成本
    "otherCost": 8000.00,         // 其他成本
    "totalCost": 170000.00        // 总成本
  }
}
```

#### 接口5：获取采购数据
```http
POST https://api.suda.com/v2/purchase/daily
Content-Type: application/json
Authorization: Bearer {API_KEY}

Request Body:
{
  "date": "2026-04-05"
}

Response:
{
  "code": 200,
  "message": "success",
  "data": {
    "date": "2026-04-05",
    "totalPurchase": 45000.00,    // 采购总额
    "orderCount": 3,              // 采购订单数
    "arrivalRate": 95.0,          // 到货率
    "details": [
      {
        "poNo": "PO20260405001",
        "supplierName": "XX电子",
        "materialCode": "WL-001",
        "materialName": "主板",
        "quantity": 200,
        "unitPrice": 100.00,
        "totalAmount": 20000.00,
        "arrivalQty": 200,
        "status": "已到货"
      }
    ]
  }
}
```

---

## 三、微搭API连接器配置

### 3.1 创建API连接器

#### 步骤1：进入连接器配置
1. 登录微搭控制台
2. 进入"外部数据源" → "API连接器"
3. 点击"新建连接器"

#### 步骤2：配置基础信息
```yaml
连接器名称: 速达ERP
连接器标识: suda_erp
描述: 速达AI70.engineer ERP系统数据接口
```

#### 步骤3：配置认证信息
```yaml
认证方式: API Key
API Key位置: Header
API Key名称: Authorization
API Key值: Bearer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 步骤4：配置请求设置
```yaml
基础URL: https://api.suda.com/v2
超时时间: 30秒
重试次数: 3
```

### 3.2 配置API方法

#### 方法1：销售日报
```yaml
方法名称: getSalesDaily
请求方式: POST
请求路径: /sales/daily
请求参数:
  - 名称: date
    类型: 字符串
    必填: 是
    描述: 查询日期(YYYY-MM-DD)
  - 名称: format
    类型: 字符串
    必填: 否
    默认值: detailed
    描述: 返回格式

响应结构:
  code: 数字
  message: 字符串
  data:
    date: 字符串
    totalSales: 数字
    totalOrders: 数字
    totalCustomers: 数字
    details: 数组
```

#### 方法2：回款数据
```yaml
方法名称: getReceipts
请求方式: POST
请求路径: /finance/receipts
请求参数:
  - 名称: startDate
    类型: 字符串
    必填: 是
  - 名称: endDate
    类型: 字符串
    必填: 是

响应结构:
  code: 数字
  message: 字符串
  data:
    totalReceipts: 数字
    receiptCount: 数字
    receiptRate: 数字
    details: 数组
```

#### 方法3：库存数据
```yaml
方法名称: getInventory
请求方式: GET
请求路径: /inventory/current

响应结构:
  code: 数字
  message: 字符串
  data:
    totalValue: 数字
    skuCount: 数字
    turnoverRate: 数字
    items: 数组
```

#### 方法4：成本数据
```yaml
方法名称: getCostDaily
请求方式: POST
请求路径: /cost/daily
请求参数:
  - 名称: date
    类型: 字符串
    必填: 是

响应结构:
  code: 数字
  message: 字符串
  data:
    date: 字符串
    productionCost: 数字
    materialCost: 数字
    laborCost: 数字
    otherCost: 数字
    totalCost: 数字
```

#### 方法5：采购数据
```yaml
方法名称: getPurchaseDaily
请求方式: POST
请求路径: /purchase/daily
请求参数:
  - 名称: date
    类型: 字符串
    必填: 是

响应结构:
  code: 数字
  message: 字符串
  data:
    date: 字符串
    totalPurchase: 数字
    orderCount: 数字
    arrivalRate: 数字
    details: 数组
```

### 3.3 测试API连接

1. 在连接器配置页面点击"测试"
2. 选择"销售日报"方法
3. 输入测试参数：`{"date": "2026-04-05"}`
4. 点击"发送请求"
5. 查看返回结果

---

## 四、数据同步工作流配置

### 4.1 创建定时工作流

#### 步骤1：创建工作流
1. 进入"工作流" → "新建工作流"
2. 名称：速达ERP数据同步
3. 触发方式：定时触发
4. 触发时间：每天 07:30（早于报告生成时间）

#### 步骤2：配置工作流节点

**节点1：获取销售数据**
```javascript
// 调用速达ERP销售API
async function getSalesData() {
  const yesterday = getYesterday(); // 获取昨天日期
  
  const result = await context.connectors.suda_erp.getSalesDaily({
    date: yesterday,
    format: 'summary'
  });
  
  if (result.code !== 200) {
    throw new Error('获取销售数据失败：' + result.message);
  }
  
  // 将数据写入绩效评分表
  const yearMonth = yesterday.substring(0, 7);
  
  // 更新营销中心营收指标
  await context.model.performance_score.updateOrCreate({
    year_month: yearMonth,
    indicator_code: 'YX_KPI_001'
  }, {
    actual_value: result.data.totalSales,
    data_source: '速达ERP',
    record_time: new Date()
  });
  
  // 记录同步日志
  await context.model.sync_log.create({
    sync_type: '销售数据',
    sync_date: yesterday,
    sync_status: '成功',
    data_count: result.data.totalOrders,
    remark: '销售额：' + result.data.totalSales
  });
}
```

**节点2：获取回款数据**
```javascript
async function getReceiptsData() {
  const yesterday = getYesterday();
  const monthStart = getMonthStart(yesterday);
  
  const result = await context.connectors.suda_erp.getReceipts({
    startDate: monthStart,
    endDate: yesterday
  });
  
  if (result.code !== 200) {
    throw new Error('获取回款数据失败：' + result.message);
  }
  
  const yearMonth = yesterday.substring(0, 7);
  
  // 更新回款指标
  await context.model.performance_score.updateOrCreate({
    year_month: yearMonth,
    indicator_code: 'YX_KPI_002'
  }, {
    actual_value: result.data.receiptRate,
    data_source: '速达ERP',
    record_time: new Date()
  });
  
  await context.model.sync_log.create({
    sync_type: '回款数据',
    sync_date: yesterday,
    sync_status: '成功',
    data_count: result.data.receiptCount,
    remark: '回款率：' + result.data.receiptRate + '%'
  });
}
```

**节点3：获取库存数据**
```javascript
async function getInventoryData() {
  const result = await context.connectors.suda_erp.getInventory();
  
  if (result.code !== 200) {
    throw new Error('获取库存数据失败：' + result.message);
  }
  
  const today = getToday();
  const yearMonth = today.substring(0, 7);
  
  // 更新库存指标
  await context.model.performance_score.updateOrCreate({
    year_month: yearMonth,
    indicator_code: 'CP_KPI_010'
  }, {
    actual_value: result.data.totalValue,
    data_source: '速达ERP',
    record_time: new Date()
  });
  
  await context.model.sync_log.create({
    sync_type: '库存数据',
    sync_date: today,
    sync_status: '成功',
    remark: '库存金额：' + result.data.totalValue
  });
}
```

**节点4：获取成本数据**
```javascript
async function getCostData() {
  const yesterday = getYesterday();
  
  const result = await context.connectors.suda_erp.getCostDaily({
    date: yesterday
  });
  
  if (result.code !== 200) {
    throw new Error('获取成本数据失败：' + result.message);
  }
  
  const yearMonth = yesterday.substring(0, 7);
  
  // 更新成本指标
  await context.model.performance_score.updateOrCreate({
    year_month: yearMonth,
    indicator_code: 'CP_KPI_003'
  }, {
    actual_value: result.data.totalCost,
    data_source: '速达ERP',
    record_time: new Date()
  });
  
  await context.model.sync_log.create({
    sync_type: '成本数据',
    sync_date: yesterday,
    sync_status: '成功',
    remark: '总成本：' + result.data.totalCost
  });
}
```

**节点5：获取采购数据**
```javascript
async function getPurchaseData() {
  const yesterday = getYesterday();
  
  const result = await context.connectors.suda_erp.getPurchaseDaily({
    date: yesterday
  });
  
  if (result.code !== 200) {
    throw new Error('获取采购数据失败：' + result.message);
  }
  
  const yearMonth = yesterday.substring(0, 7);
  
  // 更新采购指标
  await context.model.performance_score.updateOrCreate({
    year_month: yearMonth,
    indicator_code: 'YY_KPI_005'
  }, {
    actual_value: result.data.arrivalRate,
    data_source: '速达ERP',
    record_time: new Date()
  });
  
  await context.model.sync_log.create({
    sync_type: '采购数据',
    sync_date: yesterday,
    sync_status: '成功',
    remark: '到货率：' + result.data.arrivalRate + '%'
  });
}
```

### 4.2 错误处理机制

```javascript
// 在工作流中添加错误处理节点
async function handleError(error) {
  // 记录错误日志
  await context.model.sync_log.create({
    sync_type: '数据同步',
    sync_date: getToday(),
    sync_status: '失败',
    remark: error.message
  });
  
  // 发送预警通知
  await context.connectors.wechat_work.sendMessage({
    touser: '董事长',
    msgtype: 'text',
    text: {
      content: '【数据同步失败】速达ERP数据同步失败，请检查！\n错误信息：' + error.message
    }
  });
}
```

---

## 五、数据映射配置

### 5.1 销售数据映射

| 速达字段 | 微搭字段 | 转换规则 | 目标表 |
|----------|----------|----------|--------|
| totalSales | actual_value | 直接映射 | performance_score |
| date | year_month | 截取年月 | performance_score |
| totalOrders | - | 仅用于日志 | sync_log |

### 5.2 回款数据映射

| 速达字段 | 微搭字段 | 转换规则 | 目标表 |
|----------|----------|----------|--------|
| receiptRate | actual_value | 直接映射 | performance_score |
| totalReceipts | - | 仅用于日志 | sync_log |

### 5.3 库存数据映射

| 速达字段 | 微搭字段 | 转换规则 | 目标表 |
|----------|----------|----------|--------|
| totalValue | actual_value | 直接映射 | performance_score |
| turnoverRate | - | 备用 | - |

### 5.4 成本数据映射

| 速达字段 | 微搭字段 | 转换规则 | 目标表 |
|----------|----------|----------|--------|
| totalCost | actual_value | 直接映射 | performance_score |
| productionCost | - | 备用 | - |

### 5.5 采购数据映射

| 速达字段 | 微搭字段 | 转换规则 | 目标表 |
|----------|----------|----------|--------|
| arrivalRate | actual_value | 直接映射 | performance_score |
| totalPurchase | - | 仅用于日志 | sync_log |

---

## 六、测试验证

### 6.1 单元测试

测试每个API方法的调用：
1. 在连接器页面点击"测试"
2. 输入测试参数
3. 验证返回结果
4. 检查数据写入是否正确

### 6.2 集成测试

1. 手动触发工作流
2. 检查所有数据是否成功同步
3. 验证绩效计算结果
4. 检查预警是否触发

### 6.3 定时测试

1. 设置工作流为每分钟触发（测试用）
2. 观察3-5次自动执行
3. 检查同步日志
4. 恢复正常定时（每日07:30）

---

## 七、常见问题

### Q1: API返回401错误
**原因**: API密钥无效或过期
**解决**: 
1. 检查API Key是否正确
2. 联系速达技术支持确认密钥状态
3. 重新配置连接器认证信息

### Q2: 数据同步失败但无错误日志
**原因**: 网络超时或API限流
**解决**:
1. 增加重试次数
2. 增加请求间隔
3. 检查网络连接

### Q3: 同步的数据与ERP不一致
**原因**: 时区差异或数据延迟
**解决**:
1. 确认ERP数据生成时间
2. 调整同步时间（如改为08:00）
3. 增加数据校验逻辑

### Q4: 历史数据如何补录
**解决**:
1. 创建一次性工作流
2. 循环调用API获取历史数据
3. 批量写入微搭数据库

---

## 附录：API密钥保管

### 安全建议
1. API密钥保存在微搭环境变量中，不要硬编码
2. 定期更换API密钥（建议每季度）
3. 设置IP白名单限制
4. 监控API调用日志

### 环境变量配置
在微搭控制台 → 应用设置 → 环境变量中配置：
```
SUDA_API_KEY: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUDA_API_SECRET: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

在代码中使用：
```javascript
const apiKey = context.env.SUDA_API_KEY;
```

---

**文档版本**: v1.0
**创建日期**: 2026-04-05
**编制人**: AI董事长助理