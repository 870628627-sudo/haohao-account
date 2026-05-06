# 豪豪记账微信小程序

这是根据 `prd.md` 搭建的豪豪记账项目。目前包含两套形态：

- `miniprogram/`：微信小程序版本。
- `web/` + `server.cjs`：网页应用版本，支持注册、登录、用户数据隔离。

## 网页应用启动方式

网页应用不需要云开发，直接用本地 Node 服务即可运行。

```bash
npm.cmd start
```

启动后访问：

```text
http://localhost:5177
```

如果端口被占用，可以换端口：

```bash
$env:PORT=5188; npm.cmd start
```

## 网页版账号和数据隔离

网页版支持邮箱注册登录。

注册后，后端会给每个用户生成一个独立的 `user.id`。之后所有数据都会带上这个 `userId`：

```js
{
  userId: "当前登录用户 id",
  bookId: "personal",
  amount: 12,
  category: "午餐"
}
```

查询账单、预算、固定支出时，后端都会按当前登录用户过滤：

```js
bill.userId === currentUser.id
```

所以：

- A 用户登录后，只能看到 A 的账单。
- B 用户登录后，只能看到 B 的账单。
- 即使两个人使用同一台电脑注册，登录不同账号看到的数据也不同。

当前网页版数据保存在 SQLite 数据库：

```text
data/haohudget.sqlite
```

第一次启动 `server.cjs` 时会自动建库和建表，不需要你手动装数据库软件。

数据库表：

- `users`：用户账号
- `sessions`：登录会话
- `bills`：账单
- `budgets`：预算
- `fixed_items`：固定支出项目

密码不会明文保存，后端会用 Node `crypto.scryptSync` 加盐哈希后保存。

当前版本适合本地开发和早期演示。正式上线时，建议继续使用 SQLite 或迁移到 PostgreSQL/MySQL，并加上 HTTPS、备份、限流和更完整的安全策略。

## 手机端体验

网页应用在手机端会自动切换成类似 App 的底部导航：

- 首页
- 记账
- 账单
- 统计
- 我的

桌面端会保留仪表盘布局，方便同时查看更多信息。

## 腾讯云部署建议

最省事的部署方式是「腾讯云轻量应用服务器 Lighthouse + Node.js + Nginx + HTTPS」。

腾讯云 Lighthouse 提供应用镜像，官方说明里包含 Node.js 等运行环境，适合个人开发者快速部署应用。腾讯云 SSL 证书服务可以申请和管理 HTTPS 证书。

### 1. 准备服务器

1. 购买腾讯云轻量应用服务器。
2. 镜像选择 Node.js 应用镜像，或选择 Ubuntu 后自己安装 Node.js。
3. 安全组/防火墙放行：

```text
22    SSH
80    HTTP
443   HTTPS
5177  临时调试端口，可上线后关闭
```

### 2. 上传项目

可以用 Git，也可以用压缩包上传。

推荐目录：

```text
/www/haohudget
```

服务器上进入项目目录：

```bash
cd /www/haohudget
npm install
```

当前项目没有第三方依赖，`npm install` 主要是为了保留标准流程。

### 3. 启动 Node 服务

临时启动：

```bash
npm start
```

长期运行建议用 PM2：

```bash
npm install -g pm2
pm2 start server.cjs --name haohudget
pm2 save
pm2 startup
```

应用默认运行在：

```text
http://服务器IP:5177
```

### 4. 配置 Nginx 反向代理

安装 Nginx 后，新建站点配置，例如：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5177;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

然后重载 Nginx：

```bash
nginx -t
systemctl reload nginx
```

### 5. 配置域名和 HTTPS

1. 买一个域名，或使用已有域名。
2. 在 DNS 里把域名 A 记录指向服务器公网 IP。
3. 在腾讯云 SSL 证书服务申请证书。
4. 把证书配置到 Nginx。

上线后用户访问：

```text
https://your-domain.com
```

### 6. 数据库文件

SQLite 数据库在：

```text
data/haohudget.sqlite
```

部署时要注意：

- 不要把 `data/haohudget.sqlite` 放到会被覆盖的临时目录。
- 定期备份 `data/haohudget.sqlite`。
- 更新代码前先备份数据库。

## 发给 iPhone 用户使用

当前项目是网页应用/PWA，不是 iOS 原生 App。

最快方式：

1. 部署到腾讯云并配置 HTTPS。
2. 把网址发给 iPhone 用户。
3. 用户用 Safari 打开网址。
4. 点 Safari 底部分享按钮。
5. 选择「添加到主屏幕」。
6. 桌面上会出现「豪豪记账」图标，点开后像 App 一样使用。

我已经加了 PWA 配置：

- `web/manifest.webmanifest`
- `web/service-worker.js`
- `apple-mobile-web-app-*` meta 标签
- `apple-touch-icon`

注意：iPhone 不能像 Android 一样随便安装一个网页生成的安装包。要做真正的 iOS App，一般有两条路：

1. TestFlight：需要 Apple Developer 账号，适合给测试用户安装。
2. App Store：需要 Apple Developer 账号、打包、审核、上架。

如果只是给朋友或少量用户使用，推荐先用 PWA 方式：部署 HTTPS 链接，然后让用户添加到主屏幕。

## 阿里云从购买到部署

豪豪记账是 Node.js 服务端应用，带 SQLite 数据库。不要只买 OSS 静态网站托管，也不要只上传 `web/` 文件夹；必须有一台能长期运行 Node.js 的服务器。

### 方案选择

推荐购买：

```text
阿里云轻量应用服务器
```

适合原因：

- 比 ECS 入门简单。
- 自带防火墙、安全管理、快照等轻量运维能力。
- 适合个人项目、小型网页应用、早期测试。

如果你准备长期正式运营，也可以购买 ECS，但第一版用轻量应用服务器更省心。

### 购买服务器

1. 登录阿里云控制台。
2. 搜索「轻量应用服务器」。
3. 点击「创建服务器」。
4. 地域选择：

```text
如果主要给中国内地用户使用：选杭州、上海、深圳、北京等中国内地域。
如果暂时不想备案：选中国香港或海外地域。
```

注意：如果域名解析到中国内地服务器并对外提供网站服务，需要做 ICP 备案。未备案可能无法通过域名正常访问。

5. 镜像建议选择：

```text
Ubuntu 22.04 / Ubuntu 24.04
```

不建议直接选旧版 Node.js 应用镜像，因为本项目使用 Node 内置 SQLite，需要 Node.js 22 或更高版本。

6. 套餐建议：

```text
1核 1G 或 2核 2G 都可以起步。
```

早期个人使用，1核1G 足够；如果多人用、访问量增长，再升级。

7. 购买完成后，进入服务器详情页，记下：

```text
公网 IP
登录用户名，一般是 root
```

### 放行端口

进入轻量应用服务器的「防火墙」或「安全组」配置，放行：

```text
22    SSH 登录
80    HTTP
443   HTTPS
5177  临时调试用，上线后可关闭
```

### 连接服务器

Windows 可以用：

- 阿里云控制台网页远程连接
- PowerShell SSH
- Xshell / Termius / MobaXterm

PowerShell 示例：

```bash
ssh root@你的服务器公网IP
```

### 安装运行环境

进入服务器后执行：

```bash
apt update
apt install -y curl git nginx
```

安装 Node.js 22：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

检查版本：

```bash
node -v
npm -v
```

Node 版本建议显示：

```text
v22.x.x
```

### 上传项目

推荐用 GitHub 部署。

先在服务器创建目录：

```bash
mkdir -p /www
cd /www
```

如果你的项目已经上传 GitHub：

```bash
git clone https://github.com/你的用户名/haohudget.git
cd haohudget
```

如果你还没上传 GitHub，可以先把本地项目压缩成 zip，用阿里云控制台、WinSCP 或 scp 上传到 `/www/haohudget`。

### 安装依赖并试运行

```bash
cd /www/haohudget
npm install
npm start
```

看到类似输出说明服务启动：

```text
豪豪记账网页应用已启动：http://localhost:5177
SQLite 数据库：/www/haohudget/data/haohudget.sqlite
```

此时在服务器里测试：

```bash
curl http://127.0.0.1:5177
```

如果返回 HTML，说明 Node 服务正常。

也可以临时访问：

```text
http://你的服务器公网IP:5177
```

如果打不开，检查 5177 端口是否放行。

### 用 PM2 长期运行

安装 PM2：

```bash
npm install -g pm2
```

启动项目：

```bash
cd /www/haohudget
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

查看状态：

```bash
pm2 status
pm2 logs haohudget
```

重启：

```bash
pm2 restart haohudget
```

### 配置 Nginx 反向代理

新建配置文件：

```bash
nano /etc/nginx/sites-available/haohudget
```

写入：

```nginx
server {
    listen 80;
    server_name 你的域名;

    location / {
        proxy_pass http://127.0.0.1:5177;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/haohudget /etc/nginx/sites-enabled/haohudget
nginx -t
systemctl reload nginx
```

现在访问：

```text
http://你的域名
```

应该能看到豪豪记账。

### 域名解析

如果你有域名：

1. 进入阿里云「云解析 DNS」。
2. 找到你的域名。
3. 添加解析记录：

```text
记录类型：A
主机记录：@ 或 www
记录值：你的服务器公网 IP
TTL：默认
```

常见写法：

```text
haohudget.com      -> A -> 服务器公网 IP
www.haohudget.com  -> A -> 服务器公网 IP
```

### 配置 HTTPS

iPhone 添加到主屏幕和 PWA 体验建议必须使用 HTTPS。

方式一：使用阿里云 SSL 证书。

1. 进入阿里云「SSL 证书」。
2. 申请免费或付费证书。
3. 域名验证通过后，下载 Nginx 证书。
4. 上传到服务器，例如：

```text
/etc/nginx/cert/your-domain.pem
/etc/nginx/cert/your-domain.key
```

5. 修改 Nginx：

```nginx
server {
    listen 80;
    server_name 你的域名;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 你的域名;

    ssl_certificate /etc/nginx/cert/your-domain.pem;
    ssl_certificate_key /etc/nginx/cert/your-domain.key;

    location / {
        proxy_pass http://127.0.0.1:5177;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

重载：

```bash
nginx -t
systemctl reload nginx
```

最终访问：

```text
https://你的域名
```

### iPhone 用户使用

部署 HTTPS 后，把链接发给 iPhone 用户：

```text
https://你的域名
```

用户操作：

1. 用 Safari 打开。
2. 点击底部分享按钮。
3. 选择「添加到主屏幕」。
4. 桌面会出现「豪豪记账」图标。
5. 之后从桌面图标打开，体验接近 App。

### 日常更新代码

如果用 GitHub：

```bash
cd /www/haohudget
git pull
npm install
pm2 restart haohudget
```

### 数据备份

数据库文件：

```text
/www/haohudget/data/haohudget.sqlite
```

建议定期备份：

```bash
mkdir -p /backup/haohudget
cp /www/haohudget/data/haohudget.sqlite /backup/haohudget/haohudget-$(date +%F).sqlite
```

更新代码前也先备份这个文件。

## 当前已实现

- 首页月度概览
- 新增收入/支出
- 账单列表和删除
- 月度统计和支出排行
- 月度总预算设置
- 固定支出项目管理和本月记入
- CSV 导出
- 规则版豪豪犀利点评
- 云开发数据服务骨架，本地缓存兜底

## 是否需要买云服务器

不需要单独买云服务器。

建议使用微信小程序自带的「云开发」：

- 云数据库：存账单、预算、固定支出项目。
- 云函数：后续处理登录、导出、统计、权限等逻辑。
- 云存储：后续可临时保存导出文件。

早期用户量不大时，云开发比自己买服务器更省事，也更贴合微信小程序生态。

## 开发启动方式

1. 打开微信开发者工具。
2. 选择「导入项目」。
3. 项目目录选择 `D:\account`。
4. AppID 先使用测试号或你自己的微信小程序 AppID。
5. 导入后可直接预览页面。

## 云开发开通步骤

1. 在微信开发者工具顶部点击「云开发」。
2. 按提示开通一个云开发环境。
3. 创建以下数据库集合：

- `bills`
- `budgets`
- `fixed_items`
- `books`

4. 数据库权限建议：

- 开发阶段：仅创建者可读写。
- 正式阶段：用户只能读写自己的数据。

当前前端从小程序端写入数据库时，微信云数据库会自动带上 `_openid`。后续如果要做共享账本，需要增加 `book_members` 集合和云函数权限校验。

## 从当前项目开始配置登录和用户隔离

你的项目里已经有：

- `cloudfunctions/login/index.js`
- `cloudfunctions/login/package.json`
- `miniprogram/services/store.js`

也就是说，代码结构已经准备好了。你只需要在微信开发者工具里完成下面这些操作。

### 1. 换成自己的小程序 AppID

打开 `project.config.json`，找到：

```json
"appid": "touristappid"
```

替换成你自己的微信小程序 AppID。

如果你暂时没有正式 AppID，也可以先用测试号跑页面，但云开发和 OpenID 相关能力建议用真实小程序 AppID。

### 2. 开通云开发

在微信开发者工具顶部点击「云开发」。

如果是第一次开通：

1. 点击「开通」。
2. 新建一个环境。
3. 环境名称可以写：`haohudget-prod`。
4. 等待环境初始化完成。

开通后，微信开发者工具会自动把当前小程序和云环境关联起来。

### 3. 上传 login 云函数

在左侧资源管理器里找到：

```text
cloudfunctions/login
```

右键 `login` 文件夹，选择：

```text
上传并部署：云端安装依赖
```

部署成功后，可以在「云开发 - 云函数」里看到 `login`。

这个云函数的作用是获取当前微信用户的 `openid`。它不需要用户输入手机号、账号或密码。

### 4. 创建云数据库集合

进入「云开发 - 数据库」，创建这些集合：

```text
bills
budgets
fixed_items
books
```

当前第一版主要会用到：

- `bills`：账单
- `budgets`：月度预算
- `fixed_items`：固定支出项目

`books` 是为后续多账本预留的。

### 5. 设置数据库权限

开发阶段建议先设置为：

```text
仅创建者可读写
```

这样每条从小程序端写入的数据，微信云数据库会自动带上 `_openid`，只有创建这条数据的用户能读写。

同时，代码里也会写入一个 `userId` 字段，值就是当前用户的 `openid`，用于业务查询：

```js
{
  userId: openid,
  bookId: 'personal',
  amount: 12,
  category: '午餐'
}
```

也就是说：

- A 用户新增的账单，只会带 A 的 `openid`。
- B 用户新增的账单，只会带 B 的 `openid`。
- 查询账单时，代码只查当前用户自己的 `userId`。

### 6. 编译并测试

回到小程序模拟器，点击「编译」。

测试流程：

1. 打开「记一笔」。
2. 输入金额。
3. 保存账单。
4. 打开「云开发 - 数据库 - bills」。
5. 查看是否新增了一条数据。

正常情况下，这条数据里会有：

```text
_openid
userId
bookId
amount
category
date
month
```

其中 `_openid` 是微信云开发自动加的，`userId` 是代码主动写入的。

### 7. 怎么验证不同用户数据隔离

最简单的验证方式：

1. 用你的微信开发者工具保存一笔账。
2. 找另一个微信号体验这个小程序，或者用真机预览让另一个微信扫码。
3. 另一个微信号保存一笔账。
4. 回到数据库 `bills` 查看，两个人的数据 `_openid` 和 `userId` 应该不同。
5. 每个人打开小程序时，只能看到自己的账单。

### 8. 是否需要注册登录页面

第一版不需要。

微信小程序的推荐方式是「微信身份静默登录」：

```text
用户打开小程序 -> 调用 login 云函数 -> 得到 openid -> 按 openid 存取数据
```

这比账号密码注册更简单，也更适合记账小程序。

## 云函数

已提供 `cloudfunctions/login` 云函数骨架，用于获取当前用户 OpenID。

在微信开发者工具中：

1. 右键 `cloudfunctions/login`。
2. 选择「上传并部署：云端安装依赖」。

## 重要说明

当前 `project.config.json` 里的 `appid` 是 `touristappid`。正式开发时需要替换成你自己的小程序 AppID。
