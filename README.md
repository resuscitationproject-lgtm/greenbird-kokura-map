# グリーンバード小倉 ゴミ拾いマップ

小倉周辺のゴミ拾い報告を、Leafletのヒートマップで可視化する静的Webアプリです。
GitHub PagesとFirebase Firestoreで動作し、ビルド作業は不要です。

## Firebaseの準備

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成します。
2. Firestore Databaseを作成します。本番公開時は「本番環境モード」を選びます。
3. FirebaseプロジェクトにWebアプリを追加します。
4. 表示された設定値を `js/firebase-config.js` の `firebaseConfig` に貼り付けます。
5. Firestoreの「ルール」に `firestore.rules` の内容を貼り付けて公開します。

FirebaseのWeb設定値は公開される前提の識別情報です。実際のアクセス制御は
Firestore Security Rulesで行うため、テストモードのまま公開しないでください。

## ローカル確認

位置情報は安全な接続（HTTPS）または `localhost` でのみ利用できます。ファイルを直接開かず、
このフォルダをローカルWebサーバーで配信してください。

```sh
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

## GitHub Pagesで公開

1. このフォルダの内容をGitHubリポジトリへ追加します。
2. リポジトリの `Settings` > `Pages` を開きます。
3. `Deploy from a branch` を選択し、公開ブランチと `/ (root)` を指定します。
4. 表示されたHTTPSのURLへアクセスします。

## ファイル構成

```text
.
├── index.html
├── input.html
├── firestore.rules
└── js/
    ├── firebase-config.js
    ├── app.js
    └── input.js
```
