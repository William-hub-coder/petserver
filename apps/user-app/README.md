# 宠伴用户 App（Flutter 空壳）

底部 Tab：首页 / 找店 / 对话 / 我的。

## 运行

需本机安装 Flutter SDK（本仓库未捆绑 SDK）。首次请生成平台工程目录：

```bash
cd apps/user-app
flutter create . --project-name petpal_user
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3000
```

Android 模拟器访问本机网关时，可将 `API_BASE_URL` 设为 `http://10.0.2.2:3000`。
