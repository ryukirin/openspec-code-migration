# OpenSpec Code Migration

[English](README.md) | 简体中文 | [日本語](README.ja.md)

一组 Agent Skills 和一个 [OpenSpec](https://github.com/Fission-AI/OpenSpec) schema，用来做"有证据支撑"的代码迁移。先盘点旧系统，再确定迁移方针并证明它可行，之后由 OpenSpec 编写变更文档并实施。

这些 skill 采用开放的 [Agent Skills](https://agentskills.io) 格式，Claude Code、Codex 以及其他能读取 `SKILL.md` 文件夹的 agent 都可以使用。

## 工作流程

| 步骤 | Skill | 产出 |
|---|---|---|
| 0 | `migration-setup` | 把 `code-migration` schema 安装到项目里（每个项目做一次） |
| 1 | `migration-inventory` | 旧系统的事实和迁移就绪检查，例如"缺少数据库表结构" |
| 2 | `migration-strategy` | 目标技术栈、缺口和缺陷的处理决定，以及可行性证明 |
| 3 | OpenSpec propose | proposal、specs、design（含迁移批次）、test-plan、tasks |
| 4 | OpenSpec apply | 按批次实施 |
| 任意 | `migration-review` | 可选的只读评审：`strategy`、`docs` 或 `code` |

调用 skill 的方式因 agent 而异：Claude Code 里是 `/migration-inventory`，Codex 里是 `$migration-inventory`，也可以直接说出 skill 的名字让 agent 调用。

规划包放在 `migration-plans/<migration-name>/`：

| 文件 | 由谁编写 | 内容 |
|---|---|---|
| `legacy-inventory.md` | migration-inventory | 组件、依赖，以及就绪检查和其中的 `GAP-###` |
| `legacy-baseline.md` | migration-inventory | 旧系统可观察到的行为（`LEGACY-###`）、疑似缺陷、未知行为 |
| `migration-strategy.md` | migration-strategy | 目标与范围、缺口处理策略、行为处置方针、兼容性发现与实验、可行性结论 |

只强制执行低成本的机械检查：

- `migration-strategy` 要求已有带就绪结论的 inventory。
- OpenSpec propose 要求：每个缺口都定了处理策略，每个疑似缺陷都有处置，每个未知行为都有结论，没有 `OPEN` 的条目，并且 `FEASIBILITY` 为 `FEASIBLE` 或 `FEASIBLE_WITH_CONDITIONS`。

评审只作参考：结果在会话里报告，不会阻塞流程。

## 案例：BookShop

[ryukirin/BookShop](https://github.com/ryukirin/BookShop) 是一个课程设计做的网上书店，用这套 skill 从 Java 8 Servlet/JSP + MySQL 迁移到了 Python 3.12 + Flask + SQLite。规划包在 [`migration-plans/bookshop/`](https://github.com/ryukirin/BookShop/tree/master/migration-plans/bookshop)，OpenSpec 变更在 [`openspec/changes/migrate-bookshop-to-flask/`](https://github.com/ryukirin/BookShop/tree/master/openspec/changes/migrate-bookshop-to-flask)。

旧系统有 4 个按 `opttype` 参数分派操作的 Servlet、4 个用字符串拼接 SQL 的 DAO 和 19 个 JSP。没有构建脚本，也没有测试，原来的 MySQL 数据库已经丢失。

| 步骤 | 实际经过 |
|---|---|
| Inventory | 记录了 39 个组件和 73 条可观察行为。就绪检查结论为 **BLOCKED**，有两个缺口：原始建表语句在仓库和 git 历史里都找不到（GAP-001），原始数据也已丢失（GAP-002）。同时指出 Eclipse 工程没有构建脚本，旧系统在本机跑不起来。 |
| Strategy | 向用户确认了 13 项决定。目标是 Python 3.12.10、Flask 3.1.3、waitress 3.0.2，以及使用 STRICT 表和 WAL 的 SQLite。GAP-001 的处理方式是按 DAO 里的 SQL 重建表结构，沿用旧列名并补上约束。GAP-002 的处理方式是用 `init-db` 命令导入演示数据。9 条行为标为 `SECURITY_FIX_REQUIRED`，15 条标为 `BUG_NOT_PRESERVED`。这一步整理出 27 条兼容性发现，并实际跑了 13 个实验，例如对 SQLite 做 20 个并发购买，以及验证 waitress 的真实请求体上限。结论为 `FEASIBLE_WITH_CONDITIONS`。 |
| OpenSpec 变更 | 8 个能力 spec、48 条需求、22 个设计决定、8 个可回滚的批次、45 个测试、61 个任务。`coverage` 和 `lint` 都通过。 |
| 实现 | Flask 应用和 610 个 pytest 测试（单元、Flask 测试客户端、真实 waitress 服务器、仓库扫描）。安全方面的改动包括 SQL 参数化、scrypt 口令哈希、CSRF 令牌和输出自动转义。 |
| 验证 | 610 个测试在本机和 GitHub Actions 的 `windows-latest` 上全部通过，同一次 CI 运行里门禁脚本的 `coverage` 和 `lint` 也通过。回滚做过演练：把实现相关的提交 revert 掉以后，代码树和实现开始前完全一致；另有一个测试会在 CI 里停掉真实的服务器，再从备份恢复数据。页面效果在浏览器里人工检查过。 |
| 结果 | 61 个任务全部完成，并通过 PR #1 合入 `master`。项目没有正式运行环境，所以去掉了正式切换的任务。切换步骤写在 BookShop 的运行说明里，同样的冒烟检查会在 CI 中自动执行。 |

## 环境要求

- OpenSpec CLI 1.13.1 或更高版本，并已为你的 agent 生成 OpenSpec 自带的 skill（`openspec init --tools <your-agent>`）。
- Node.js（OpenSpec 本身也需要）。

## 安装

使用 [skills CLI](https://github.com/vercel-labs/skills)，在项目根目录运行：

```
npx skills add ryukirin/openspec-code-migration
```

也可以把 `skills/` 下的文件夹复制到 agent 的 skill 目录：Claude Code 是 `.claude/skills/`，Codex 和其他读取共享目录的 agent 是 `.agents/skills/`。

然后在项目里运行 `migration-setup` skill。它会把 schema 复制到 `openspec/schemas/code-migration/` 并做校验。更新 skill 之后要再运行一次。

只想用 schema、不用 skill 的话，把 `skills/migration-setup/schema/code-migration/` 复制到 `openspec/schemas/code-migration/`，再运行 `openspec schema validate code-migration`。

## 提供自己的迁移方针

如果你手上已经有迁移方针，可以用文字或文件路径的形式交给 `migration-strategy`。方针里写明的决定会被直接采用，只有方针没覆盖到、或者与证据矛盾的部分才会提问。

```
/migration-strategy java-to-python docs/migration-policy.md
/migration-strategy java-to-python 目标 Python 3.12 + Flask + SQLite，保留所有 URL，密码改为哈希存储
```

## 门禁脚本

schema 自带 `scripts/migration_gate.mjs`。schema 所在目录可以用 `openspec schema which code-migration --json` 查到。

| 命令 | 检查内容 |
|---|---|
| `stage strategy\|propose --root <pack>` | 某一步的前置条件 |
| `lint --root <dir> [--defs <pack>] [patterns]` | 表格列数、引用了却没有定义的 ID、本机绝对路径 |
| `coverage --root <pack> --change <changeRoot>` | LEGACY → 需求、需求 → TEST、TEST → task、BATCH → task |

## 项目约定

项目自己的规则写在项目的 `openspec/config.yaml` 里，不要写进 schema。例如：

```yaml
schema: code-migration
rules:
  test-plan:
    - 标明每个 TEST 是否在 GitHub Actions 里运行。
operations:
  apply:
    guidance:
      - 迁移完成后不要 archive 这个变更。
```

## 许可证

MIT
