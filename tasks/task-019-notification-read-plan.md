# 变更计划：通知未读计数与批量已读

## 当前状态分析

已完成功能：
- ✅ 通知数据模型和数据库表
- ✅ 单个标记已读 API (PATCH /api/notifications/[id]/read)
- ✅ 通知列表 API (GET /api/notifications)
- ✅ DB 层已存在 `markAllNotificationsAsRead` 函数

## 实现方案

### 1. DB 层增强 (lib/db/notifications.ts)

**新增函数：**
```typescript
markNotificationsAsReadByIds(db, userId, notificationIds): number
```
- 功能：批量标记指定 ID 的通知为已读
- 权限：只更新属于指定用户的通知
- 返回：实际更新的数量
- 约束：验证每个通知 ID 都属于该用户

### 2. Service 层增强 (lib/services/notification.ts)

**新增函数：**

**a) getUnreadCount()**
- 功能：获取当前用户未读通知数量
- 实现：调用 DB 层 `countNotificationsWithFilters`，传入 `isRead: false`
- 返回：`{ count: number }`

**b) markNotificationsAsRead(ids?: string[])**
- 功能：批量标记通知为已读
- 参数：
  - `ids`（可选）：通知 ID 数组，不传则标记全部为已读
- 权限验证：
  - 必须认证
  - 只能操作当前用户的通知
- 返回：`{ updatedCount: number }`
- 实现：
  - 无 ids：调用 `markAllNotificationsAsRead`
  - 有 ids：调用 `markNotificationsAsReadByIds`

### 3. Validator 层扩展 (lib/validators/notification.ts)

**新增 Schema：**

```typescript
// 批量标记已读输入
markNotificationsAsReadSchema = z.object({
  ids: z.array(z.string().min(1)).optional()
})

// 未读计数输出（无需输入）
```

### 4. API 层实现

**a) GET /api/notifications/unread-count**
- 路径：`/app/api/notifications/unread-count/route.ts`
- 方法：GET
- 返回：`{ count: number }`

**b) PATCH /api/notifications/read**
- 路径：`/app/api/notifications/read/route.ts`
- 方法：PATCH
- 请求体：`{ ids?: string[] }`
- 返回：`{ success: true, updatedCount: number }`

### 5. 测试用例

**a) 未读计数测试：**
- 返回当前用户未读数量
- 验证权限隔离

**b) 批量已读测试：**
- 不传 ids 时全部标记为已读
- 指定 ids 正确更新
- 验证只能操作当前用户通知
- 验证幂等性（重复标记不报错）

## 技术约束

- 遵循现有架构分层规则
- 复用现有认证能力 (`requireAuthenticatedUser`)
- 统一错误处理（`AppError`）
- 所有输入必须经过 Zod 校验
- 单元测试覆盖所有逻辑

## 安全保障

- 所有操作都限制在当前用户范围内
- DB 层操作时加入 userId 过滤
- Service 层二次验证所有权
- API 层通过认证中间件保护

## 实施顺序

1. DB 层：添加 `markNotificationsAsReadByIds` 函数
2. Service 层：添加 `getUnreadCount` 和 `markNotificationsAsRead` 函数
3. Validator 层：添加 `markNotificationsAsReadSchema`
4. API 层：创建两个新的路由端点
5. 测试：添加完整单元测试
6. 文档：更新 specs/architecture.md 和 specs/progress.md

## 验收标准

- ✅ 功能闭环可用
- ✅ 权限正确（用户只能操作自己的通知）
- ✅ 数据边界正确（不会影响其他用户数据）
- ✅ 所有逻辑可测试
- ✅ 所有单元测试全部通过
- ✅ lint、typecheck、test 全部通过
