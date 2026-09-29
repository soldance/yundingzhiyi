# 致谢与参考

本项目在架构设计阶段调研了若干同类开源项目。为保证合规与透明，此处明确区分**思路参考**与**代码复用**的边界。

## 参考项目

### TFT-Copilot

- 仓库：https://github.com/ZhongliangGuo/TFT-Copilot
- 许可：**PolyForm Noncommercial License 1.0.0**（非商业许可）
- 参考内容：**仅架构思路**，无任何代码、文档文本或数据内容复用

借鉴的设计思路（均为通用工程模式）：

- **知识分层**：常驻层（写入系统提示词，保持字节稳定以命中上下文缓存）+ 按需层（按局面首次出现的实体注入详情）+ 工具层
- **确定性核验**：用代码精确计算羁绊数量与激活档位，并规定给出终局阵容前必须先核验
- **一次性注入**：维护已注入集合，同一实体一局只注入一次详情，控制上下文开销
- **局面状态结构**：阶段 / 等级 / 金币 / 血量 / 连胜连败 / 海克斯 / 场上棋子 / 备战席 / 商店 / 装备 / 纹章 / 对手信息

**重要说明**：该项目采用非商业许可，因此本项目：

- ❌ 未复制其任何源代码
- ❌ 未复制其文档文本
- ❌ 未使用其 `knowledge/meta_comps.md` 等数据内容（该文件为其从第三方统计站转写的版权资产）

本项目将自行获取与整理同类数据。

### tft-oracle

- 仓库：https://github.com/gregario/tft-oracle
- 许可：MIT
- 参考内容：将游戏静态数据以服务化方式提供给语言模型的设计取向

### GoldenShovel-S17-Skill

- 仓库：https://github.com/suhuaiyyyy/GoldenShovel-S17-Skill
- 参考内容：以确定性查询脚本 + 结构化数据表（Excel）组织游戏数据的做法

## 数据来源

| 来源 | 用途 | 说明 |
|---|---|---|
| [Community Dragon](https://raw.communitydragon.org/) | 英雄、羁绊、装备、海克斯、数值、图片资源 | Riot 官方公开数据源 |
| [Riot Games 官方公告](https://teamfighttactics.leagueoflegends.com/) | 版本更新说明 | 用于提取补丁改动条目 |

## 声明

本项目为社区粉丝作品，与 Riot Games 无任何关联、未获其赞助或认可。

《英雄联盟》《云顶之弈》（Teamfight Tactics）及相关名称、素材、数据的版权归 Riot Games, Inc. 所有。
