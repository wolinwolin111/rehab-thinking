# RehabMind Android 外壳

这是 RehabMind 手机网页的原生 WebView 外壳，不复制业务逻辑。网页负责康复流程、本机草稿和远端同步；APK 负责可信来源限制、返回栈、断网页、文件下载和 Android 页面状态恢复。

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

构建参数会在 Gradle 配置阶段校验为绝对 HTTP(S) 地址：Release 必须使用 HTTPS，且不允许把用户名、片段或未转义内容带入 APK。WebView 只保留同协议、同主机、同端口和配置路径下的页面；外部 HTTP(S) 链接交给系统浏览器，其他协议拒绝。Debug 版本开启 WebView 调试和脱敏诊断日志，Release 版本关闭调试和日志。

壳层 User-Agent 会追加 `RehabMindApp/<shellVersion>`，便于服务端区分载体；日志只记录页面路径、加载错误类型和壳版本，不记录案例正文、凭据、Cookie 或完整快照。下载只接受可信页面触发的地址，并交由 Android DownloadManager 保存。

仓库中的 GitHub Actions 还提供手动的 unsigned Release candidate 构建，用于测试会话提前验证 Release 行为；它不是正式签名包，也不能替代真机、证书和覆盖升级验收。

## Debug 测试工作台

Debug APK 可以直接把 WebView 地址切到 `/test`，例如模拟器使用 `http://10.0.2.2:3000/test`，真机使用局域网开发地址加 `/test`。测试工作台会复用网页端真实 `RehabMindCompleteDemo`，并按 `scenarioId` 创建隔离测试案例；它不是 APK 内复制的一套康复逻辑。

Pixel 5/iPhone 13 的网页预览可以复用同一批场景卡，但仍只计为移动网页/预览证据。Android M2～M5 必须在真实 emulator、adb、Gradle 和 APK 环境中记录系统镜像、WebView、安装/恢复/升级结果；不能用浏览器视口或测试工作台故障开关代替真机结论。
