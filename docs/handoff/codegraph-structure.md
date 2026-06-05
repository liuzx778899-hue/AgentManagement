# Codegraph 项目结构

生成时间：2026-06-05

来源命令：`codegraph files`

```text
Project Structure (222 files):

|-- .claude
|   `-- workflows
|       `-- phase3-p0-issues-workflow.js (javascript, 3 symbols)
|-- .github
|   `-- ISSUE_TEMPLATE
|       `-- page-task.yml (yaml, 0 symbols)
|-- docs
|   |-- api
|   |   `-- openapi.yaml (yaml, 0 symbols)
|   `-- archive
|       |-- code-backups
|       |   `-- docs-backup
|       |       `-- components
|       |           |-- AiActions.tsx (tsx, 7 symbols)
|       |           |-- CiPipelinePanel.tsx (tsx, 8 symbols)
|       |           |-- IssueList.tsx (tsx, 8 symbols)
|       |           |-- PullRequestList.tsx (tsx, 8 symbols)
|       |           |-- RoleMdViewer.tsx (tsx, 6 symbols)
|       |           |-- RunnerLogs.tsx (tsx, 9 symbols)
|       |           `-- WorkflowEdge.tsx (tsx, 5 symbols)
|       `-- qa
|           |-- after-fix.yaml (yaml, 0 symbols)
|           |-- fix-check.yaml (yaml, 0 symbols)
|           `-- minimap-check.yml (yaml, 0 symbols)
|-- scripts
|   |-- dev
|   |   `-- glm-rob.js (javascript, 1 symbols)
|   `-- e2e
|       |-- e2e-debug.mjs (javascript, 3 symbols)
|       |-- e2e-full-test.mjs (javascript, 3 symbols)
|       |-- e2e-interaction-test.mjs (javascript, 4 symbols)
|       |-- e2e-test.mjs (javascript, 4 symbols)
|       `-- e2e-workflow-roles.mjs (javascript, 3 symbols)
|-- src
|   |-- __tests__
|   |   |-- components
|   |   |   |-- PwLogStream.test.tsx (tsx, 6 symbols)
|   |   |   |-- PwRunnerPanel.test.tsx (tsx, 8 symbols)
|   |   |   `-- PwWorkflowControl.test.tsx (tsx, 11 symbols)
|   |   |-- sdk
|   |   |   `-- client.test.ts (typescript, 3 symbols)
|   |   |-- server
|   |   |   |-- middleware
|   |   |   |   `-- requestTracing.test.ts (typescript, 15 symbols)
|   |   |   |-- routes
|   |   |   |   |-- agent-service-integration.test.ts (typescript, 6 symbols)
|   |   |   |   |-- git.test.ts (typescript, 12 symbols)
|   |   |   |   |-- memory.test.ts (typescript, 8 symbols)
|   |   |   |   |-- projects.test.ts (typescript, 8 symbols)
|   |   |   |   |-- runner.test.ts (typescript, 16 symbols)
|   |   |   |   |-- settings.test.ts (typescript, 8 symbols)
|   |   |   |   `-- workflow.test.ts (typescript, 16 symbols)
|   |   |   |-- services
|   |   |   |   `-- serviceFactory.test.ts (typescript, 2 symbols)
|   |   |   `-- app.test.ts (typescript, 6 symbols)
|   |   |-- services
|   |   |   |-- api
|   |   |   |   |-- client.test.ts (typescript, 4 symbols)
|   |   |   |   |-- gitApi.test.ts (typescript, 4 symbols)
|   |   |   |   |-- memoryApi.test.ts (typescript, 4 symbols)
|   |   |   |   |-- projectApi.test.ts (typescript, 4 symbols)
|   |   |   |   |-- runnerApi.test.ts (typescript, 4 symbols)
|   |   |   |   |-- settingsApi.test.ts (typescript, 4 symbols)
|   |   |   |   `-- workflowApi.test.ts (typescript, 4 symbols)
|   |   |   `-- local
|   |   |       |-- adapters
|   |   |       |   |-- fileStoreAdapter.test.ts (typescript, 4 symbols)
|   |   |       |   |-- gitAdapter.test.ts (typescript, 4 symbols)
|   |   |       |   |-- githubAdapter.test.ts (typescript, 4 symbols)
|   |   |       |   |-- llmAdapter.test.ts (typescript, 4 symbols)
|   |   |       |   `-- processRunnerAdapter.test.ts (typescript, 4 symbols)
|   |   |       |-- repositories
|   |   |       |   `-- repositories.test.ts (typescript, 6 symbols)
|   |   |       |-- useCases
|   |   |       |   |-- gitStatusUseCase.test.ts (typescript, 5 symbols)
|   |   |       |   |-- projectUseCase.test.ts (typescript, 7 symbols)
|   |   |       |   |-- resolveEventRouteTarget.test.ts (typescript, 6 symbols)
|   |   |       |   |-- runnerUseCase.test.ts (typescript, 5 symbols)
|   |   |       |   |-- taskUseCase.test.ts (typescript, 7 symbols)
|   |   |       |   |-- workflowEventUseCase.test.ts (typescript, 10 symbols)
|   |   |       |   |-- workflowExecutionUseCase.test.ts (typescript, 4 symbols)
|   |   |       |   `-- worktreeUseCase.test.ts (typescript, 5 symbols)
|   |   |       `-- security.test.ts (typescript, 3 symbols)
|   |   |-- ai-assistant.test.tsx (tsx, 11 symbols)
|   |   |-- ai-project-briefing.test.tsx (tsx, 5 symbols)
|   |   |-- capability-center.test.tsx (tsx, 6 symbols)
|   |   |-- git-sync.test.tsx (tsx, 10 symbols)
|   |   |-- integration.test.tsx (tsx, 9 symbols)
|   |   |-- manual-gate.test.tsx (tsx, 8 symbols)
|   |   |-- memory-manager.test.tsx (tsx, 9 symbols)
|   |   |-- model-config.test.tsx (tsx, 11 symbols)
|   |   |-- project-detail.test.tsx (tsx, 7 symbols)
|   |   |-- project-onboarding.test.tsx (tsx, 5 symbols)
|   |   |-- project-workspace.test.tsx (tsx, 10 symbols)
|   |   |-- setup.ts (typescript, 3 symbols)
|   |   |-- ui-integration.test.tsx (tsx, 14 symbols)
|   |   |-- workbench-model.test.ts (typescript, 3 symbols)
|   |   |-- workbench-reducer.test.ts (typescript, 5 symbols)
|   |   `-- workflow-canvas.test.tsx (tsx, 10 symbols)
|   |-- components
|   |   |-- settings
|   |   |   |-- AiAssistantPanel.tsx (tsx, 9 symbols)
|   |   |   |-- CliRunnerPanel.tsx (tsx, 6 symbols)
|   |   |   |-- index.ts (typescript, 1 symbols)
|   |   |   |-- ModelConfigPanel.tsx (tsx, 10 symbols)
|   |   |   |-- ProjectPanel.tsx (tsx, 8 symbols)
|   |   |   |-- SettingsTabs.tsx (tsx, 5 symbols)
|   |   |   `-- UserPanel.tsx (tsx, 6 symbols)
|   |   |-- AgentSettingsPanel.tsx (tsx, 9 symbols)
|   |   |-- AiAssistant.tsx (tsx, 7 symbols)
|   |   |-- AiChatPanel.tsx (tsx, 15 symbols)
|   |   |-- AiProjectBriefing.tsx (tsx, 18 symbols)
|   |   |-- AiWorkflowDesign.tsx (tsx, 16 symbols)
|   |   |-- AppShell.tsx (tsx, 7 symbols)
|   |   |-- CapabilityCenter.tsx (tsx, 11 symbols)
|   |   |-- ExistingProjectImport.tsx (tsx, 27 symbols)
|   |   |-- GateDecisionPanel.tsx (tsx, 9 symbols)
|   |   |-- GitAuthConfig.tsx (tsx, 11 symbols)
|   |   |-- IconBadge.tsx (tsx, 4 symbols)
|   |   |-- ImAdapterSettings.tsx (tsx, 13 symbols)
|   |   |-- ManualGateDecision.tsx (tsx, 8 symbols)
|   |   |-- MemoryManager.tsx (tsx, 21 symbols)
|   |   |-- NewProjectWizard.tsx (tsx, 18 symbols)
|   |   |-- ProgressCheckPanel.tsx (tsx, 10 symbols)
|   |   |-- ProjectCard.tsx (tsx, 14 symbols)
|   |   |-- ProjectDetailPage.tsx (tsx, 31 symbols)
|   |   |-- ProjectManagement.tsx (tsx, 13 symbols)
|   |   |-- ProjectWorkspace.tsx (tsx, 42 symbols)
|   |   |-- PwContextPanel.tsx (tsx, 5 symbols)
|   |   |-- PwGitPanels.tsx (tsx, 13 symbols)
|   |   |-- PwLogStream.tsx (tsx, 5 symbols)
|   |   |-- PwMemoryPanel.tsx (tsx, 6 symbols)
|   |   |-- PwProgressDashboard.tsx (tsx, 10 symbols)
|   |   |-- PwProjectMdPanel.tsx (tsx, 4 symbols)
|   |   |-- PwRunnerPanel.tsx (tsx, 9 symbols)
|   |   |-- PwSettingsPanel.tsx (tsx, 9 symbols)
|   |   |-- PwWorkflowControl.tsx (tsx, 8 symbols)
|   |   |-- RoleMdEditor.tsx (tsx, 8 symbols)
|   |   |-- Settings.tsx (tsx, 14 symbols)
|   |   |-- StepEditModal.tsx (tsx, 6 symbols)
|   |   |-- WorkbenchHome.tsx (tsx, 15 symbols)
|   |   |-- WorkflowBuilder.tsx (tsx, 12 symbols)
|   |   |-- WorkflowCanvas.tsx (tsx, 9 symbols)
|   |   |-- WorkflowManagementOverview.tsx (tsx, 29 symbols)
|   |   `-- WorkflowNode.tsx (tsx, 6 symbols)
|   |-- config
|   |   |-- localEngineering.ts (typescript, 4 symbols)
|   |   `-- product.ts (typescript, 5 symbols)
|   |-- context
|   |   `-- ServiceContext.tsx (tsx, 5 symbols)
|   |-- data
|   |   |-- fixtures.ts (typescript, 4 symbols)
|   |   `-- workflowManagementFixtures.ts (typescript, 18 symbols)
|   |-- domain
|   |   |-- capability.ts (typescript, 8 symbols)
|   |   |-- engineering.ts (typescript, 3 symbols)
|   |   |-- gate.ts (typescript, 3 symbols)
|   |   |-- git.ts (typescript, 10 symbols)
|   |   |-- im.ts (typescript, 7 symbols)
|   |   |-- memory.ts (typescript, 6 symbols)
|   |   |-- model.ts (typescript, 3 symbols)
|   |   |-- notification.ts (typescript, 7 symbols)
|   |   |-- project.ts (typescript, 8 symbols)
|   |   |-- role.ts (typescript, 2 symbols)
|   |   |-- runner.ts (typescript, 3 symbols)
|   |   |-- task.ts (typescript, 6 symbols)
|   |   |-- workbench.ts (typescript, 16 symbols)
|   |   |-- workbenchViewModel.ts (typescript, 8 symbols)
|   |   |-- workflow.ts (typescript, 9 symbols)
|   |   |-- workflowAssignment.ts (typescript, 5 symbols)
|   |   `-- workflowEvent.ts (typescript, 4 symbols)
|   |-- hooks
|   |   `-- useLocalServices.ts (typescript, 15 symbols)
|   |-- scripts
|   |   `-- seed-data.ts (typescript, 11 symbols)
|   |-- sdk
|   |   `-- client.ts (typescript, 30 symbols)
|   |-- server
|   |   |-- middleware
|   |   |   |-- errorHandler.ts (typescript, 3 symbols)
|   |   |   `-- requestTracing.ts (typescript, 7 symbols)
|   |   |-- routes
|   |   |   |-- agent-service.ts (typescript, 26 symbols)
|   |   |   |-- ai.ts (typescript, 9 symbols)
|   |   |   |-- capabilities.ts (typescript, 5 symbols)
|   |   |   |-- git.ts (typescript, 5 symbols)
|   |   |   |-- index.ts (typescript, 28 symbols)
|   |   |   |-- memory.ts (typescript, 6 symbols)
|   |   |   |-- projects.ts (typescript, 7 symbols)
|   |   |   |-- roles.ts (typescript, 7 symbols)
|   |   |   |-- runner.ts (typescript, 6 symbols)
|   |   |   |-- settings.ts (typescript, 8 symbols)
|   |   |   |-- tasks.ts (typescript, 7 symbols)
|   |   |   |-- workflow.ts (typescript, 9 symbols)
|   |   |   `-- workflowEvents.ts (typescript, 4 symbols)
|   |   |-- services
|   |   |   `-- serviceFactory.ts (typescript, 5 symbols)
|   |   |-- app.ts (typescript, 9 symbols)
|   |   `-- index.ts (typescript, 4 symbols)
|   |-- services
|   |   |-- agent-service
|   |   |   |-- audit-log.ts (typescript, 6 symbols)
|   |   |   |-- event-log.ts (typescript, 7 symbols)
|   |   |   |-- index.ts (typescript, 1 symbols)
|   |   |   |-- resultStore.ts (typescript, 8 symbols)
|   |   |   |-- runnerAdapter.ts (typescript, 17 symbols)
|   |   |   `-- task-service.ts (typescript, 23 symbols)
|   |   |-- api
|   |   |   |-- aiApi.ts (typescript, 7 symbols)
|   |   |   |-- capabilitiesApi.ts (typescript, 5 symbols)
|   |   |   |-- client.ts (typescript, 8 symbols)
|   |   |   |-- gitApi.ts (typescript, 8 symbols)
|   |   |   |-- index.ts (typescript, 1 symbols)
|   |   |   |-- memoryApi.ts (typescript, 12 symbols)
|   |   |   |-- projectApi.ts (typescript, 13 symbols)
|   |   |   |-- rolesApi.ts (typescript, 7 symbols)
|   |   |   |-- runnerApi.ts (typescript, 11 symbols)
|   |   |   |-- settingsApi.ts (typescript, 11 symbols)
|   |   |   |-- taskApi.ts (typescript, 14 symbols)
|   |   |   |-- workflowApi.ts (typescript, 14 symbols)
|   |   |   `-- workflowEventApi.ts (typescript, 12 symbols)
|   |   `-- local
|   |       |-- adapters
|   |       |   |-- baseAdapter.ts (typescript, 13 symbols)
|   |       |   |-- fileStoreAdapter.ts (typescript, 17 symbols)
|   |       |   |-- gitAdapter.ts (typescript, 12 symbols)
|   |       |   |-- githubAdapter.ts (typescript, 19 symbols)
|   |       |   |-- index.ts (typescript, 1 symbols)
|   |       |   |-- llmAdapter.ts (typescript, 23 symbols)
|   |       |   `-- processRunnerAdapter.ts (typescript, 19 symbols)
|   |       |-- repositories
|   |       |   |-- index.ts (typescript, 1 symbols)
|   |       |   |-- memoryRepository.ts (typescript, 19 symbols)
|   |       |   |-- notificationRepository.ts (typescript, 11 symbols)
|   |       |   |-- projectRepository.ts (typescript, 17 symbols)
|   |       |   |-- roleRepository.ts (typescript, 14 symbols)
|   |       |   |-- taskRepository.ts (typescript, 18 symbols)
|   |       |   |-- workflowAssignmentRepository.ts (typescript, 12 symbols)
|   |       |   |-- workflowEventRepository.ts (typescript, 10 symbols)
|   |       |   `-- workflowRepository.ts (typescript, 18 symbols)
|   |       |-- security
|   |       |   |-- index.ts (typescript, 22 symbols)
|   |       |   `-- mod.ts (typescript, 1 symbols)
|   |       |-- useCases
|   |       |   |-- aiUseCase.ts (typescript, 10 symbols)
|   |       |   |-- gitStatusUseCase.ts (typescript, 6 symbols)
|   |       |   |-- index.ts (typescript, 1 symbols)
|   |       |   |-- memoryUseCase.ts (typescript, 13 symbols)
|   |       |   |-- projectUseCase.ts (typescript, 16 symbols)
|   |       |   |-- resolveEventRouteTarget.ts (typescript, 8 symbols)
|   |       |   |-- runnerUseCase.ts (typescript, 13 symbols)
|   |       |   |-- settingsUseCase.ts (typescript, 13 symbols)
|   |       |   |-- taskUseCase.ts (typescript, 16 symbols)
|   |       |   |-- workbenchEventIntegration.ts (typescript, 8 symbols)
|   |       |   |-- workflowEventUseCase.ts (typescript, 18 symbols)
|   |       |   |-- workflowExecutionUseCase.ts (typescript, 22 symbols)
|   |       |   `-- worktreeUseCase.ts (typescript, 11 symbols)
|   |       `-- index.ts (typescript, 14 symbols)
|   |-- state
|   |   |-- index.ts (typescript, 1 symbols)
|   |   |-- selectors.ts (typescript, 14 symbols)
|   |   |-- workbenchActions.ts (typescript, 50 symbols)
|   |   |-- WorkbenchProvider.tsx (tsx, 16 symbols)
|   |   `-- workbenchReducer.ts (typescript, 5 symbols)
|   |-- types
|   |   |-- localEngineering.ts (typescript, 12 symbols)
|   |   `-- settings.ts (typescript, 2 symbols)
|   |-- App.tsx (tsx, 20 symbols)
|   |-- main.tsx (tsx, 9 symbols)
|   `-- vite-env.d.ts (typescript, 1 symbols)
|-- eslint.config.js (javascript, 4 symbols)
|-- vite.config.ts (typescript, 3 symbols)
`-- vitest.config.ts (typescript, 3 symbols)

```
