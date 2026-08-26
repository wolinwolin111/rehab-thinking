# RehabMind Android 外壳

这是 RehabMind 手机网页的原生 WebView 外壳，不复制业务逻辑。网页负责康复流程、本机草稿和远端同步；APK 负责来源限制、返回栈、断网页和 Android 页面状态恢复。

## 地址配置

- Debug 默认使用 Android 模拟器访问宿主机：`http://10.0.2.2:3000/`。
- 真机 Debug 需要把地址改为电脑局域网 IP，例如：`gradle :app:assembleDebug -PrehabmindDebugUrl=http://192.168.1.20:3000/`。
- Release 默认使用 `https://66.154.101.204/RehabMind/`，正式交付前应通过 `-PrehabmindReleaseUrl=https://正式域名/RehabMind/` 注入有有效证书的地址。

## 构建

在本目录执行：

```text
gradle :app:assembleDebug
gradle :app:assembleRelease -PrehabmindReleaseUrl=https://正式域名/RehabMind/
```

Debug 包仅用于内部验证；Release 包强制 HTTPS、拒绝证书错误，并限制页面导航在配置的主机和路径前缀内。

仓库中的 GitHub Actions 还提供手动的 unsigned Release candidate 构建，用于测试会话提前验证 Release 行为；它不是正式签名包，也不能替代真机、证书和覆盖升级验收。
