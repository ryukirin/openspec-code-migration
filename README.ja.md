# OpenSpec Code Migration

[English](README.md) | [简体中文](README.zh-CN.md) | 日本語

根拠に基づいてコード移行を進めるための Agent Skills と [OpenSpec](https://github.com/Fission-AI/OpenSpec) スキーマです。まず旧システムを棚卸しし、移行方針を決めて実現できることを確かめます。そのあと OpenSpec が変更ドキュメントを書き、実装まで進めます。

スキルはオープンな [Agent Skills](https://agentskills.io) 形式なので、Claude Code や Codex をはじめ、`SKILL.md` フォルダを読めるエージェントで使えます。

## ワークフロー

| ステップ | スキル | 成果物 |
|---|---|---|
| 0 | `migration-setup` | `code-migration` スキーマをプロジェクトに入れる（プロジェクトごとに 1 回） |
| 1 | `migration-inventory` | 旧システムの事実と移行準備チェック（例：「データベースのテーブル定義がない」） |
| 2 | `migration-strategy` | 移行先の技術スタック、ギャップと不具合の扱い、実現可能性の検証 |
| 3 | OpenSpec propose | proposal、specs、design（移行バッチを含む）、test-plan、tasks |
| 4 | OpenSpec apply | バッチごとに実装 |
| 随時 | `migration-review` | 任意の読み取り専用レビュー：`strategy`、`docs`、`code` |

スキルの呼び出し方はエージェントによって違います。Claude Code では `/migration-inventory`、Codex では `$migration-inventory` です。スキル名を伝えて呼び出してもらうこともできます。

計画パックは `migration-plans/<migration-name>/` に置きます。

| ファイル | 作成するスキル | 内容 |
|---|---|---|
| `legacy-inventory.md` | migration-inventory | コンポーネント、依存関係、移行準備チェックとその `GAP-###` |
| `legacy-baseline.md` | migration-inventory | 旧システムの観察できる振る舞い（`LEGACY-###`）、不具合の疑い、不明な振る舞い |
| `migration-strategy.md` | migration-strategy | 移行先と範囲、ギャップへの対応方針、振る舞いの扱い、互換性の調査結果と実験、実現可能性の判定 |

強制するのは、手間のかからない機械的なチェックだけです。

- `migration-strategy` を始めるには、準備チェックの結論が出た inventory が必要です。
- OpenSpec propose を始めるには、すべてのギャップに対応方針があり、すべての不具合の疑いに扱いが決まり、すべての不明な振る舞いに結論が出ていて、`OPEN` の項目が残っておらず、`FEASIBILITY` が `FEASIBLE` か `FEASIBLE_WITH_CONDITIONS` である必要があります。

レビューはあくまで参考です。結果は会話の中で報告し、作業を止めることはありません。

## 事例：BookShop

[ryukirin/BookShop](https://github.com/ryukirin/BookShop) は授業の課題で作ったオンライン書店で、このスキルを使って Java 8 Servlet/JSP + MySQL から Python 3.12 + Flask + SQLite に移行しました。計画パックは [`migration-plans/bookshop/`](https://github.com/ryukirin/BookShop/tree/master/migration-plans/bookshop)、OpenSpec の変更は [`openspec/changes/migrate-bookshop-to-flask/`](https://github.com/ryukirin/BookShop/tree/master/openspec/changes/migrate-bookshop-to-flask) にあります。

旧システムには、`opttype` パラメーターで処理を振り分ける Servlet が 4 つ、文字列連結で SQL を組み立てる DAO が 4 つ、JSP が 19 個ありました。ビルドスクリプトもテストもなく、元の MySQL データベースは失われていました。

| ステップ | 実際の経過 |
|---|---|
| Inventory | 39 のコンポーネントと 73 の観察できる振る舞いを記録しました。準備チェックの結論は **BLOCKED** で、ギャップは 2 つです。元のテーブル定義（DDL）がリポジトリにも git の履歴にもないこと（GAP-001）と、元のデータが失われていること（GAP-002）です。あわせて、Eclipse プロジェクトにビルドスクリプトがなく、旧システムを手元で動かせないことも指摘しました。 |
| Strategy | 13 項目をユーザーに確認しました。移行先は Python 3.12.10、Flask 3.1.3、waitress 3.0.2、そして STRICT テーブルと WAL を使う SQLite です。GAP-001 には、DAO の SQL からテーブル定義を作り直し、旧カラム名を残したうえで制約を加える方針をとりました。GAP-002 には、`init-db` コマンドでデモデータを投入する方針をとりました。9 件の振る舞いを `SECURITY_FIX_REQUIRED`、15 件を `BUG_NOT_PRESERVED` としました。このステップで互換性の調査結果を 27 件まとめ、実験を 13 件実際に行いました。たとえば SQLite に対する 20 件の同時購入や、waitress の実際のリクエストサイズ上限の確認です。判定は `FEASIBLE_WITH_CONDITIONS` です。 |
| OpenSpec の変更 | 機能ごとの spec が 8 つ、要件が 48 件、設計上の決定が 22 件、ロールバックできるバッチが 8 つ、テストが 45 件、タスクが 62 件です。`coverage` と `lint` はどちらも通っており、プロジェクトの GitHub Actions でも実行しています。 |
| 実装 | Flask アプリと 256 件の pytest テスト（ユニット、Flask テストクライアント、実際の waitress サーバー、リポジトリのスキャン）で、GitHub Actions の `windows-latest` 上で実行しています。セキュリティ面では、SQL のパラメーター化、scrypt によるパスワードのハッシュ化、CSRF トークン、出力の自動エスケープを入れました。2026 年 10 月時点で 62 タスク中 56 タスクが完了しています。残りは CI の確認、画面の目視チェック、本番の切り替えです。 |

## 動作環境

- OpenSpec CLI 1.13.1 以降。使うエージェント向けに、OpenSpec 自身のスキルを生成しておいてください（`openspec init --tools <your-agent>`）。
- Node.js（OpenSpec 自体も必要とします）。

## インストール

[skills CLI](https://github.com/vercel-labs/skills) を使う場合は、プロジェクトのルートで次を実行します。

```
npx skills add ryukirin/openspec-code-migration
```

`skills/` の下のフォルダを、エージェントのスキル用ディレクトリにコピーしてもかまいません。Claude Code なら `.claude/skills/`、Codex など共有ディレクトリを読むエージェントなら `.agents/skills/` です。

そのあと、プロジェクトで `migration-setup` スキルを実行します。スキーマを `openspec/schemas/code-migration/` にコピーして検証します。スキルを更新したら、もう一度実行してください。

スキルを使わずスキーマだけを使う場合は、`skills/migration-setup/schema/code-migration/` を `openspec/schemas/code-migration/` にコピーし、`openspec schema validate code-migration` を実行します。

## 手元の移行方針を渡す

すでに移行方針がある場合は、テキストかファイルパスで `migration-strategy` に渡せます。方針に書かれた決定はそのまま採用し、書かれていない部分や根拠と食い違う部分だけを質問します。

```
/migration-strategy java-to-python docs/migration-policy.md
/migration-strategy java-to-python 移行先は Python 3.12 + Flask + SQLite、URL はすべて維持、パスワードはハッシュ化
```

## ゲートスクリプト

スキーマには `scripts/migration_gate.mjs` が含まれています。スキーマのディレクトリは `openspec schema which code-migration --json` で確認できます。

| コマンド | チェック内容 |
|---|---|
| `stage strategy\|propose --root <pack>` | 各ステップの前提条件 |
| `lint --root <dir> [--defs <pack>] [patterns]` | 表の列数、定義されないまま参照されている ID、マシン固有の絶対パス |
| `coverage --root <pack> --change <changeRoot>` | LEGACY → 要件、要件 → TEST、TEST → task、BATCH → task |

## プロジェクト固有の取り決め

プロジェクト固有のルールは、スキーマではなく各プロジェクトの `openspec/config.yaml` に書きます。例：

```yaml
schema: code-migration
rules:
  test-plan:
    - 各 TEST を GitHub Actions で実行するかどうかを明記する。
operations:
  apply:
    guidance:
      - 移行が終わっても、この変更は archive しない。
```

## ライセンス

MIT
