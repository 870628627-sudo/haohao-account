# 豪豪记账

豪豪记账是一个可注册登录的网页记账应用，也保留了微信小程序版本代码。

当前主要使用的是网页应用：

- 前端：`web/`
- 后端：`server.cjs`
- 数据库：SQLite，自动创建在 `data/haohudget.sqlite`
- 进程管理：PM2，配置文件 `ecosystem.config.cjs`
- GitHub 仓库：https://github.com/870628627-sudo/haohao-account.git

## 本地启动

在项目根目录执行：

```bash
npm install
npm start
```

默认访问：

```text
http://localhost:5177
```

## 数据存储

应用第一次启动时会自动创建 SQLite 数据库：

```text
data/haohudget.sqlite
```

数据库表：

- `users`：用户账号
- `sessions`：登录会话
- `bills`：账单
- `budgets`：预算
- `fixed_items`：固定支出项目

每个用户注册后都有自己的 `user_id`，账单、预算、固定支出都会按 `user_id` 隔离。

密码不会明文保存，后端会使用 Node `crypto.scryptSync` 加盐哈希后保存。

## 阿里云部署完整步骤

下面按你的真实仓库写：

```text
https://github.com/870628627-sudo/haohao-account.git
```

服务器目录统一使用：

```text
/www/haohao-account
```

## 1. 购买服务器

推荐购买：

```text
阿里云轻量应用服务器
```

建议配置：

```text
地域：不想备案先选中国香港；如果选中国内地并绑定域名，需要备案
镜像：Ubuntu 22.04 或 Ubuntu 24.04
配置：1核1G 起步，2核2G 更稳
```

防火墙/安全组放行：

```text
22    SSH
80    HTTP
443   HTTPS
5177  临时调试端口，上线后可以关闭
```

## 2. 登录服务器

在 PowerShell 或终端里：

```bash
ssh root@你的服务器公网IP
```

## 3. 安装基础环境

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

Node 版本建议是：

```text
v22.x.x
```

## 4. 如果你还没 clone 项目

执行：

```bash
mkdir -p /www
cd /www
git clone https://github.com/870628627-sudo/haohao-account.git
cd haohao-account
```

然后安装依赖：

```bash
npm install
```

## 5. 如果你刚才已经在 /www 里 clone 了怎么办

先看 `/www` 里有什么：

```bash
cd /www
ls
```

### 情况 A：已经有 `/www/haohao-account`

进入目录：

```bash
cd /www/haohao-account
```

确认远程仓库是不是正确：

```bash
git remote -v
```

如果看到：

```text
https://github.com/870628627-sudo/haohao-account.git
```

说明没问题，直接更新代码：

```bash
git pull
npm install
```

### 情况 B：clone 到了别的目录名

比如你看到的是：

```text
/www/account
```

或者：

```text
/www/haohudget
```

先确认里面是不是这个项目：

```bash
cd /www/旧目录名
ls
git remote -v
```

如果远程仓库是：

```text
https://github.com/870628627-sudo/haohao-account.git
```

可以改名：

```bash
cd /www
mv 旧目录名 haohao-account
cd /www/haohao-account
npm install
```

如果旧目录里已经有用户数据，先备份数据库：

```bash
mkdir -p /backup/haohao-account
cp /www/旧目录名/data/haohudget.sqlite /backup/haohao-account/haohudget-$(date +%F).sqlite
```

再改名。

### 情况 C：clone 错了仓库

如果 `git remote -v` 不是你的仓库地址，建议删掉重来。

危险操作前先确认目录：

```bash
pwd
ls
git remote -v
```

确认无误后：

```bash
cd /www
rm -rf 错误目录名
git clone https://github.com/870628627-sudo/haohao-account.git
cd haohao-account
npm install
```

## 6. 试运行

在服务器里：

```bash
cd /www/haohao-account
npm start
```

如果看到：

```text
豪豪记账网页应用已启动：http://localhost:5177
SQLite 数据库：/www/haohao-account/data/haohudget.sqlite
```

说明启动成功。

另开一个 SSH 窗口测试：

```bash
curl http://127.0.0.1:5177
```

如果返回 HTML，说明 Node 服务正常。

临时公网访问：

```text
http://你的服务器公网IP:5177
```

如果打不开，检查阿里云防火墙是否放行 `5177`。

## 7. 用 PM2 长期运行

先停止刚才手动运行的 `npm start`，按 `Ctrl + C`。

安装 PM2：

```bash
npm install -g pm2
```

启动项目：

```bash
cd /www/haohao-account
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

查看状态：

```bash
pm2 status
```

查看日志：

```bash
pm2 logs haohao-account
```

重启：

```bash
pm2 restart haohao-account
```

停止：

```bash
pm2 stop haohao-account
```

## 8. 配置 Nginx 反向代理

新建配置：

```bash
nano /etc/nginx/sites-available/haohao-account
```

写入以下内容，把 `你的域名` 换成真实域名。

如果暂时没有域名，也可以先用服务器 IP，但 Nginx 的 `server_name` 可以先写 `_`：

```nginx
server {
    listen 80;
    server_name _;

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

如果有域名：

```nginx
server {
    listen 80;
    server_name 你的域名 www.你的域名;

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
ln -s /etc/nginx/sites-available/haohao-account /etc/nginx/sites-enabled/haohao-account
nginx -t
systemctl reload nginx
```

访问：

```text
http://你的服务器公网IP
```

或：

```text
http://你的域名
```

## 9. 域名解析

在阿里云「云解析 DNS」里添加：

```text
记录类型：A
主机记录：@ 或 www
记录值：你的服务器公网 IP
```

如果服务器在中国内地，域名通常需要备案后才能正常提供网站服务。

如果服务器在中国香港或海外，通常不需要中国内地 ICP 备案。

## 10. 配置 HTTPS

iPhone 添加到主屏幕和 PWA 体验建议使用 HTTPS。

可以用阿里云 SSL 证书：

1. 进入阿里云「SSL 证书」。
2. 申请免费或付费证书。
3. 完成域名验证。
4. 下载 Nginx 版本证书。
5. 上传到服务器，例如：

```text
/etc/nginx/cert/your-domain.pem
/etc/nginx/cert/your-domain.key
```

修改 Nginx：

```nginx
server {
    listen 80;
    server_name 你的域名 www.你的域名;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 你的域名 www.你的域名;

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

## 11. iPhone 用户怎么用

把 HTTPS 链接发给用户：

```text
https://你的域名
```

用户用 Safari 打开：

1. 点击底部分享按钮。
2. 选择「添加到主屏幕」。
3. 桌面会出现「豪豪记账」图标。
4. 之后从图标打开，体验接近 App。

## 12. 日常更新代码

本地改完并推到 GitHub 后，服务器执行：

```bash
cd /www/haohao-account
git pull
npm install
pm2 restart haohao-account
```

如果你改了数据库结构，更新前先备份数据库。

## 13. 数据库备份

数据库文件：

```text
/www/haohao-account/data/haohudget.sqlite
```

手动备份：

```bash
mkdir -p /backup/haohao-account
cp /www/haohao-account/data/haohudget.sqlite /backup/haohao-account/haohudget-$(date +%F).sqlite
```

恢复时：

```bash
pm2 stop haohao-account
cp /backup/haohao-account/备份文件.sqlite /www/haohao-account/data/haohudget.sqlite
pm2 start haohao-account
```

## 14. 常见问题

### 访问服务器 IP 是 404

先确认 Node 服务是否正常：

```bash
curl http://127.0.0.1:5177
pm2 status
pm2 logs haohao-account
```

如果 `127.0.0.1:5177` 正常，但域名或 IP 访问不正常，通常是 Nginx 没代理到 `5177`。

### 访问 `服务器IP:5177` 打不开

检查阿里云防火墙是否放行 `5177`。

上线后如果 Nginx 代理已经配置好，可以关闭 `5177` 公网端口，只保留 `80/443`。

### PM2 启动失败

查看日志：

```bash
pm2 logs haohao-account
```

常见原因：

- Node 版本太低，不支持 `node:sqlite`
- 没有进入 `/www/haohao-account`
- 项目没有完整拉下来
- 端口 `5177` 被占用
