# 房间物品记录

一个可以云同步的小型网页应用，用来记录房间里的容器、物品、位置、状态和备注。

## 云同步设置

前端已经配置到这个 Supabase 项目：

```text
https://uliflnwuorjuldlcibnp.supabase.co
```

第一次使用前，需要在 Supabase 后台打开 SQL Editor，执行 `supabase-schema.sql` 里的 SQL。执行后再打开 `index.html`，右上角显示“云端已同步”就代表连接成功。

## 手机使用

把这个网页部署到 GitHub Pages、Netlify 或 Vercel 后，手机和电脑打开同一个网址就能编辑同一份云端数据。

如果只是直接双击打开 `index.html`，电脑上可以用；手机需要能访问到这几个文件，通常还是建议部署成网页。

## 数据备份

页面右上角可以导出 JSON 或 CSV。

- JSON 包含 `containers` 和 `items`，可以再次导入应用。
- CSV 适合用 Excel 查看和打印。

## 安全提醒

当前 SQL 是“无登录的私人小工具”配置：任何拿到网页地址和 Supabase publishable key 的人，都可能读写数据。后续如果要更安全，可以加 Supabase 邮箱登录和按用户隔离的数据策略。
