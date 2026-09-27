# Control Console — Source Map

> Source of truth for what's reachable: `src/App.tsx`

Status legend:
- **live** — reachable from `App.tsx` (directly or through another live file)
- **orphan** — exists on disk, nothing live renders it

Endpoint column lists the backend routes the file calls. Live-screen rows
were read directly during the audit. Orphan rows marked
`(not traced — see source)` were not opened; verify the actual endpoints
in the file before resurrecting.

Orphans are resurrectable by re-wiring `App.tsx`; the endpoints they hit
are likely already implemented and mounted in
`packages/core/src/termux-server/TermuxBridgeServer.ts`.

## Screens

| File | Status | Imported by | Backend endpoints |
|---|---|---|---|
| HomeScreen.tsx | live | App.tsx | `POST /projects`, `POST /projects/:id/build` |
| ProjectsListScreen.tsx | live | App.tsx | `GET /projects`, `PATCH /projects/:id` |
| ProjectDetailScreen.tsx | live | App.tsx | `GET /projects/:id`, `POST /projects/:id/build`, `GET /projects/:id/files`, `GET /projects/:id/files/*`, `POST /projects/:id/publish`, `GET /chat/sessions/:id/messages`, `POST /engines/:id/chat`, `POST /engines/twin/chat` |
| PreviewScreen.tsx | live | App.tsx | `GET /projects/:id`, `GET /projects/:id/files`, `GET /projects/:id/preview/*` |
| SkillsScreen.tsx | live | App.tsx | `GET /skills`, `POST /skills/import`, `POST /projects/:id/build` |
| SettingsScreen.tsx | live | App.tsx | `GET /github/status`, `POST /github/credentials`, `DELETE /github/credentials` |
| SystemPower.tsx | live | App.tsx | `GET /system-power/status`, `POST /system-power/toggle` |
| AuthDebugPanel.tsx | live | SystemPower.tsx | `GET /debug/auth-info`, `GET /deepseek/health`, `POST /deepseek/credentials`, `GET /engines/engine_qwen/health`, `GET /qwen/credentials/raw`, `POST /qwen/credentials`, `DELETE /qwen/credentials` |
| KimiPanel.tsx | live | AuthDebugPanel.tsx | `GET /kimi/health`, `GET /kimi/credentials/raw`, `POST /kimi/credentials`, `DELETE /kimi/credentials` |
| AgentSwarm.tsx | orphan | SovereignCommand.tsx | (not traced — see source) |
| CreatorWorkspace.tsx | orphan | — | (not traced — see source) |
| DeepSeekChat.tsx | orphan | — | (not traced — see source) |
| EventsPanel.tsx | orphan | SovereignCommand.tsx | (not traced — see source) |
| FileTreePanel.tsx | orphan | CreatorWorkspace.tsx | (not traced — see source) |
| GodMode.tsx | orphan | — | (not traced — see source) |
| MysticRealm.tsx | orphan | — | (not traced — see source) |
| OmegaSwitch.tsx | orphan | SovereignCommand.tsx | (not traced — see source) |
| SovereignCommand.tsx | orphan | — | (not traced — see source) |
| SystemLogs.tsx | orphan | SovereignCommand.tsx | (not traced — see source) |
| TruthLedger.tsx | orphan | SovereignCommand.tsx | (not traced — see source) |

## Components

| File | Status | Imported by |
|---|---|---|
| AttachmentSheet.tsx | live | App.tsx, HomeScreen, ProjectDetailScreen |
| BuildingIndicator.tsx | live | HomeScreen, ProjectDetailScreen |
| GradientBackground.tsx | live | HomeScreen |
| LovableNavBar.tsx | live | App.tsx |
| ModeSelector.tsx | live | PromptBar, ProjectDetailScreen |
| PromptBar.tsx | live | HomeScreen |
| CommandButton.tsx | orphan | AgentSwarm, OmegaSwitch, SystemLogs, TruthLedger (all orphan) |
| GlassCard.tsx | orphan | 12 orphan files only |
| InfoTile.tsx | orphan | — |
| MemoryHeatGrid.tsx | orphan | — |
| MetricTile.tsx | orphan | AgentSwarm, SovereignCommand (both orphan) |
| MobileTabBar.tsx | orphan | — |
| ModeToggle.tsx | orphan | SovereignCommand (orphan) |
| NebulaBackground.tsx | orphan | SovereignCommand, CreatorWorkspace, GodMode, MysticRealm (all orphan) |
| ProbabilityBar.tsx | orphan | GodMode (orphan) |
| ProjectCard.tsx | orphan | — |
| StatusChip.tsx | orphan | 7 orphan files |
| SubNav.tsx | orphan | SovereignCommand, CreatorWorkspace, GodMode (all orphan) |
| UniversalAnchor.tsx | orphan | — |

## Notes

- Two theme generations coexist in `theme.ts`: `theme` (dark, legacy, used only by orphan components) and `lovable` (light, used by all live screens).
- `SovereignCommand.tsx` is a self-contained ecosystem that imports 6 orphan screens/components but nothing live renders it.
- The `Backend endpoints` column for live screens was read directly from source during the audit; orphan rows were not opened.
