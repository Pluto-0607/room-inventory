# 房间物品记录

一个可以云同步的小型网页应用，用来记录房间里的容器、物品、位置、状态和备注。

## 云同步设置

前端已经配置到这个 Supabase 项目：

```text
https://uliflnwuorjuldlcibnp.supabase.co
```

第一次使用前，需要在 Supabase 后台打开 SQL Editor，执行 `supabase-schema.sql` 里的 SQL。执行后再打开网页，输入邮箱获取登录链接，右上角显示“云端已同步”就代表连接成功。

还需要在 Supabase 后台确认：

- Authentication > Providers > Email 已启用。
- Authentication > URL Configuration 里把 GitHub Pages 地址加入 Redirect URLs。

## 手机使用

把这个网页部署到 GitHub Pages、Netlify 或 Vercel 后，手机和电脑打开同一个网址，用同一个邮箱登录，就能编辑同一份云端数据。

## 数据备份

页面右上角可以导出 JSON 或 CSV。

- JSON 包含 `containers` 和 `items`，可以再次导入应用。
- CSV 适合用 Excel 查看和打印。

## 安全提醒

当前版本使用 Supabase 邮箱登录和 Row Level Security。仓库即使公开，别人看到 Supabase publishable key，也只能访问自己账号下的数据，不能读写你的数据。
