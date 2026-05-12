# 部署到 GitHub Pages

## GitHub Pages

1. 进入仓库 `Settings > Pages`。
2. 在 `Build and deployment` 中选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
3. 保存后等待一两分钟，GitHub 会生成访问地址。

## Supabase

第一次使用前，记得在 Supabase SQL Editor 里执行 `supabase-schema.sql`。

登录版还需要检查：

1. Authentication > Providers > Email 已启用。
2. Authentication > URL Configuration > Redirect URLs 加入 GitHub Pages 地址，例如：

```text
https://pluto-0607.github.io/room-inventory/
```
