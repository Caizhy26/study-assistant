# 腾讯云 CloudBase 部署指南

## 项目结构

```
├── server/           # 后端服务（部署到 CloudBase Run）
│   ├── index.mjs     # 后端入口文件
│   └── Dockerfile    # Docker 构建配置
├── src/              # 前端代码（部署到 CloudBase 静态网站托管）
├── dist/             # 前端构建产物
├── package.json      # 项目依赖和脚本
└── vite.config.js    # Vite 配置
```

## 部署步骤

### 1. 前端部署 - CloudBase 静态网站托管

#### 构建配置
- **构建命令**: `npm run build`
- **输出目录**: `dist`
- **Node 版本**: 20.x

#### 环境变量（在 CloudBase 控制台配置）
- `VITE_API_BASE_URL`: 后端服务地址（CloudBase Run 服务域名）

### 2. 后端部署 - CloudBase Run

#### 启动方式
- **启动命令**: `npm start` 或 `node server/index.mjs`
- **端口**: 8787（通过 `PORT` 环境变量读取）

#### 环境变量（在 CloudBase Run 控制台配置）
- `DEEPSEEK_API_KEY`: DeepSeek API 密钥（用于文本聊天）
- `SCNET_API_KEY`: SCNET API 密钥（用于视觉识别，可选）
- `TEXT_API_URL`: 文本 API 地址（可选，默认 DeepSeek）
- `VISION_API_URL`: 视觉 API 地址（可选）
- `CORS_ORIGIN`: 允许的前端域名（可选，默认 *）

#### Docker 部署方式
```bash
# 进入 server 目录
cd server

# 构建 Docker 镜像
docker build -t study-assistant-backend .

# 运行本地测试
docker run -p 8787:8787 --env DEEPSEEK_API_KEY=your-key study-assistant-backend
```

### 3. 本地开发

```bash
# 启动前端开发服务器（端口 52475）
npm run dev

# 启动后端开发服务器（端口 8787）
npm run dev:backend

# 前端通过 /api 路径代理到后端
# 无需配置 VITE_API_BASE_URL
```

## 配置说明

### CloudBase 静态网站托管配置

1. 登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 进入你的云开发环境
3. 点击「静态网站托管」
4. 点击「部署」→「代码部署」
5. 配置：
   - 代码来源：选择 GitHub/GitLab 或上传 ZIP
   - 构建命令：`npm run build`
   - 输出目录：`dist`
6. 点击「部署」

### CloudBase Run 配置

1. 登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 进入你的云开发环境
3. 点击「CloudBase Run」
4. 点击「新建服务」
5. 选择部署方式：
   - **方式一：代码部署**
     - 代码来源：选择 GitHub/GitLab
     - 运行环境：Node.js 20.x
     - 启动命令：`npm start`
     - 工作目录：`server`
   - **方式二：镜像部署**
     - 上传 Docker 镜像到腾讯云容器镜像服务
     - 使用镜像 URL 部署
6. 配置环境变量
7. 点击「创建」

### 环境变量配置位置

- **前端**: CloudBase 静态网站托管 → 环境变量
- **后端**: CloudBase Run → 服务配置 → 环境变量

## 注意事项

1. **不要将 API Key 写入代码或提交到仓库**
2. 前端通过 `VITE_API_BASE_URL` 环境变量指向后端服务
3. 后端服务需要配置 CORS 允许前端域名访问
4. 部署完成后，更新前端的 `VITE_API_BASE_URL` 为 CloudBase Run 服务域名
5. 建议使用 HTTPS 协议

## 验证部署

```bash
# 验证后端服务
curl https://your-cloudbase-run-service/api/health

# 响应示例
{
  "ok": true,
  "mode": "proxy",
  "chatConfigured": true,
  "visionConfigured": false,
  "textApiUrl": "https://api.deepseek.com/chat/completions",
  "visionApiUrl": "https://api.scnet.cn/api/llm/v1/chat/completions"
}
```