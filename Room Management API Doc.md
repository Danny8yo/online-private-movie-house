# 在线观影室后端API接口文档

## 概述

本文档描述了在线观影室（Social Cinema）房间管理模块的RESTful API接口规范。

### 基本信息

- **Base URL**: `http://localhost:3000/api`
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

### 请求头说明

所有请求需要设置以下请求头：

| Header | Value | 必填 | 说明 |
|--------|-------|------|------|
| Content-Type | application/json | 是 | 请求体格式 |

### 响应格式

所有API响应遵循统一的JSON格式：

#### 成功响应

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": { ... },
  "timestamp": "2026-01-13T10:30:00.000Z"
}
```

#### 错误响应

```json
{
  "success": false,
  "code": 400,
  "message": "错误描述",
  "errorCode": "ERROR_CODE",
  "details": { ... },
  "timestamp": "2026-01-13T10:30:00.000Z"
}
```

### 错误码说明

| HTTP状态码 | 错误码 | 说明 |
|------------|--------|------|
| 400 | BAD_REQUEST | 请求参数错误 |
| 400 | VALIDATION_ERROR | 参数验证失败 |
| 401 | UNAUTHORIZED | 未授权访问 |
| 401 | INVALID_PASSWORD | 房间密码错误 |
| 403 | PERMISSION_DENIED | 权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 404 | ROOM_NOT_FOUND | 房间不存在 |
| 409 | CONFLICT | 资源冲突 |
| 409 | ROOM_FULL | 房间已满 |
| 410 | ROOM_CLOSED | 房间已关闭 |
| 500 | INTERNAL_SERVER_ERROR | 服务器内部错误 |

---

## Socket.IO 实时接口（聊天功能）

本章节描述在线观影室的**实时聊天功能**接口规范，基于 Socket.IO 实现。聊天功能已集成在同步控制子系统中，使用相同的命名空间。

### 连接信息

- **Socket 服务地址**：与 HTTP 服务同源（例如 `http://localhost:3000`）
- **Namespace**：`/sync`（与同步控制共享同一命名空间）
- **Room Channel（服务器内部分组）**：`room:{roomId}`

> 说明：聊天功能强绑定房间，使用聊天功能前必须先通过 REST API 加入房间（`POST /api/rooms/:roomId/join`）获取 `participantId`，并通过 `sync:join` 事件加入同步频道。

### ACK（回执）格式

所有客户端 → 服务端事件都使用 ACK（回调函数）作为统一的成功/失败返回，格式与同步控制子系统相同。

### 聊天错误码

Socket.IO 的错误码与 HTTP 错误码保持同一套语义（便于前后端统一处理）。建议使用以下错误码：

| 错误码 | 说明 | 常见触发场景 |
|--------|------|--------------|
| VALIDATION_ERROR | 参数验证失败 | content 缺失或非法 |
| ROOM_NOT_FOUND | 房间不存在 | 房间ID无效 |
| ROOM_CLOSED | 房间已关闭 | 房间已解散/关闭 |
| NOT_IN_ROOM | 不在房间内 | 未加入房间就尝试聊天，或已退出仍发送 |
| INTERNAL_SERVER_ERROR | 服务器内部错误 | 未捕获异常 |

---

### 事件：发送聊天消息

向当前房间发送一条聊天消息。服务端会验证消息内容、频率限制，并广播给房间内所有成员。

**事件名（Client → Server）**：`chat:send`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 消息内容，1-500字符 |

> **注意**：发送者信息（roomId、participantId、nickname）会自动从 Socket 连接上下文中获取，无需在请求参数中传递。

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| message | object | 发送成功的消息对象 |

**消息对象结构**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 消息ID（服务端生成，用于去重） |
| roomId | string | 房间ID |
| senderId | string | 发送者参与者ID |
| senderNickname | string | 发送者昵称 |
| content | string | 消息内容 |
| type | string | 消息类型（chat/system） |
| timestamp | number | 发送时间戳（毫秒） |

---

### 事件：接收聊天消息（广播）

服务端向房间内所有客户端广播新消息。

**事件名（Server → Client）**：`chat:message`

**消息体**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 消息ID |
| roomId | string | 房间ID |
| senderId | string | 发送者参与者ID |
| senderNickname | string | 发送者昵称 |
| content | string | 消息内容 |
| type | string | 消息类型（chat/system） |
| timestamp | number | 发送时间戳（毫秒） |

**消息示例**

```json
{
  "id": "msg_1234567890",
  "roomId": "123456",
  "senderId": "550e8400-e29b-41d4-a716-446655440000",
  "senderNickname": "影迷小李",
  "content": "大家好，这部电影真好看！",
  "type": "chat",
  "timestamp": 1736899200000
}
```

---

### 前端调用示例（Socket.IO 聊天功能）

> 以下展示聊天功能的完整使用流程。注意：聊天功能与同步控制共享同一 Socket 连接。

```javascript
import { io } from 'socket.io-client';

// 1) 连接同步控制命名空间（同时支持聊天功能）
const syncSocket = io('http://localhost:3000/sync', {
  transports: ['websocket']
});

// 2) 加入同步频道（必须先通过 REST API 加入房间获取 participantId）
// 加入成功后，自动获得聊天功能
syncSocket.emit('sync:join', {
  roomId: '123456',
  participantId: '550e8400-e29b-41d4-a716-446655440000',
  nickname: '影迷小李'
}, (ack) => {
  if (!ack?.ok) {
    console.error('加入同步频道失败:', ack?.error?.message);
    return;
  }
  console.log('加入同步频道成功，聊天功能已启用');
});

// 3) 监听聊天消息
syncSocket.on('chat:message', (message) => {
  console.log(`[${new Date(message.timestamp).toLocaleTimeString()}] ${message.senderNickname}: ${message.content}`);
});

// 4) 发送聊天消息
const sendMessage = (content) => {
  syncSocket.emit('chat:send', {
    content: content
  }, (ack) => {
    if (!ack?.ok) {
      console.error('发送失败:', ack?.error?.message);
      return;
    }
    console.log('发送成功:', ack.data.message);
  });
};

// 使用示例
sendMessage('大家好，这部电影真好看！');
```

---

## Socket.IO 实时接口（同步控制子系统）

本章节描述在线观影室的**视频同步控制子系统**接口规范，基于 Socket.IO 实现。

### 连接信息

- **Socket 服务地址**：与 HTTP 服务同源（例如 `http://localhost:3000`）
- **Namespace**：`/sync`
- **Room Channel（服务器内部分组）**：`room:{roomId}`

> 说明：同步控制强绑定房间，使用同步功能前必须先通过 REST API 加入房间（`POST /api/rooms/:roomId/join`）获取 `participantId`。只有房间创建者（creator）可以执行同步控制操作。

### ACK（回执）格式

所有客户端 → 服务端事件都使用 ACK（回调函数）作为统一的成功/失败返回，格式与聊天子系统相同。

### 同步控制错误码

| 错误码 | 说明 | 常见触发场景 |
|--------|------|--------------|
| VALIDATION_ERROR | 参数验证失败 | roomId/operatorId/progress/rate 缺失或非法 |
| ROOM_NOT_FOUND | 房间不存在 | roomId 无效 |
| ROOM_CLOSED | 房间已关闭 | 房间已解散/关闭 |
| PERMISSION_DENIED | 权限不足 | 非房主尝试执行同步控制操作 |
| INTERNAL_SERVER_ERROR | 服务器内部错误 | 未捕获异常 |

---

### 事件：加入同步频道

客户端加入某个房间的同步控制频道（Socket.IO room），并获取当前视频状态。加入成功后，服务端会向房间内其他成员广播 `member:joined` 事件。

**事件名（Client → Server）**：`sync:join`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID（6位房间号） |
| participantId | string | 是 | 参与者ID（由加入房间 API 返回） |
| nickname | string | 否 | 用户昵称（用于广播给其他成员，建议填写） |

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| channel | string | 实际加入的 Socket room 名称（`room:{roomId}`） |
| videoState | object | 当前视频状态（包含 source、status、progress、playbackRate、subtitle 等） |
| serverTime | number | 服务端时间戳（毫秒） |
| participants | array | 当前房间的完整成员列表 |

---

### 事件：离开同步频道

客户端主动离开同步控制频道。离开后，服务端会向房间内其他成员广播 `member:left` 事件。

**事件名（Client → Server）**：`sync:leave`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |
| participantId | string | 是 | 参与者ID |

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| message | string | 操作结果消息 |

> **说明**：当 Socket 连接断开时，服务端会自动执行离开逻辑并广播 `member:left` 事件，无需客户端显式调用。

---

### 事件：初始化状态请求

新加入房间的成员请求获取当前视频状态（与 `sync:join` 功能类似，但不需要加入频道）。

**事件名（Client → Server）**：`sync:init`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| videoState | object | 当前视频状态 |
| serverTime | number | 服务端时间戳（毫秒） |

---

### 事件：播放

房间创建者发起播放操作，服务端更新视频状态并广播给房间内所有成员。

**事件名（Client → Server）**：`sync:play`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |
| operatorId | string | 是 | 操作者ID（必须是房间创建者） |

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| event | object | 同步事件对象（见下方说明） |

---

### 事件：暂停

房间创建者发起暂停操作，服务端更新视频状态并广播给房间内所有成员。

**事件名（Client → Server）**：`sync:pause`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |
| operatorId | string | 是 | 操作者ID（必须是房间创建者） |

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| event | object | 同步事件对象 |

---

### 事件：跳转进度

房间创建者发起进度跳转操作，服务端更新视频进度并广播给房间内所有成员。

**事件名（Client → Server）**：`sync:seek`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |
| operatorId | string | 是 | 操作者ID（必须是房间创建者） |
| progress | number | 是 | 目标进度（秒），必须 >= 0 |

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| event | object | 同步事件对象 |

---

### 事件：改变播放倍速

房间创建者改变播放倍速，服务端更新倍速并广播给房间内所有成员。

**事件名（Client → Server）**：`sync:changeRate`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |
| operatorId | string | 是 | 操作者ID（必须是房间创建者） |
| rate | number | 是 | 新的播放倍速，范围 0.25-4.0 |

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| event | object | 同步事件对象 |

---

### 事件：改变字幕

房间创建者改变字幕设置，服务端更新字幕并广播给房间内所有成员。

**事件名（Client → Server）**：`sync:changeSubtitle`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |
| operatorId | string | 是 | 操作者ID（必须是房间创建者） |
| subtitle | string\|null | 是 | 字幕设置，null 表示关闭字幕 |

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| event | object | 同步事件对象 |

---

### 事件：更换视频源

房间创建者更换视频源，服务端更新视频源并广播给房间内所有成员。

**事件名（Client → Server）**：`sync:changeSource`

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |
| operatorId | string | 是 | 操作者ID（必须是房间创建者） |
| sourceUrl | string\|null | 是 | 新的视频源URL，null 表示清空视频源 |

**ACK 返回 data**

| 字段 | 类型 | 说明 |
|------|------|------|
| event | object | 同步事件对象 |

---

### 事件：接收同步事件（广播）

服务端向房间内所有客户端广播同步事件。客户端收到此事件后，应强制对齐视频状态。

**事件名（Server → Client）**：`sync:event`

**消息体（SyncEvent）**

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 事件类型（CHANGE_SOURCE/PLAY/PAUSE/SEEK/CHANGE_RATE/CHANGE_SUBTITLE） |
| roomId | string | 房间ID |
| operatorId | string | 操作者ID |
| serverTime | number | 服务端时间戳（毫秒） |
| payload | object | 事件载荷，包含当前视频状态信息 |

**payload 对象结构**

| 字段 | 类型 | 说明 |
|------|------|------|
| source | string\|null | 视频源URL |
| status | string | 播放状态（playing/paused/stopped） |
| progress | number | 播放进度（秒） |
| playbackRate | number | 播放倍速 |
| subtitle | string\|null | 字幕设置 |

---

### 事件：成员加入广播

当有新成员加入同步频道时，服务端向房间内其他成员广播成员加入事件。

**事件名（Server → Client）**：`member:joined`

**消息体（MemberEvent）**

| 字段 | 类型 | 说明 |
|------|------|------|
| roomId | string | 房间ID |
| participant | object | 新加入的成员信息 |
| participant.id | string | 成员ID |
| participant.nickname | string | 成员昵称 |
| participants | array | 更新后的完整成员列表 |
| timestamp | number | 事件时间戳（毫秒） |

**participants 数组元素结构**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 成员ID |
| nickname | string | 成员昵称 |
| role | string | 角色（creator/viewer） |
| status | string | 状态（online/offline） |

**消息示例**

```json
{
  "roomId": "123456",
  "participant": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "nickname": "新观众"
  },
  "participants": [
    { "id": "550e8400-e29b-41d4-a716-446655440000", "nickname": "房主", "role": "creator", "status": "online" },
    { "id": "550e8400-e29b-41d4-a716-446655440001", "nickname": "新观众", "role": "viewer", "status": "online" }
  ],
  "timestamp": 1736899200000
}
```

---

### 事件：成员离开广播

当成员离开同步频道（主动离开或断开连接）时，服务端向房间内其他成员广播成员离开事件。

**事件名（Server → Client）**：`member:left`

**消息体（MemberEvent）**

| 字段 | 类型 | 说明 |
|------|------|------|
| roomId | string | 房间ID |
| participant | object | 离开的成员信息 |
| participant.id | string | 成员ID |
| participant.nickname | string | 成员昵称 |
| participants | array | 更新后的完整成员列表 |
| timestamp | number | 事件时间戳（毫秒） |

**消息示例**

```json
{
  "roomId": "123456",
  "participant": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "nickname": "离开的观众"
  },
  "participants": [
    { "id": "550e8400-e29b-41d4-a716-446655440000", "nickname": "房主", "role": "creator", "status": "online" }
  ],
  "timestamp": 1736899260000
}
```

> **说明**：当 Socket 连接断开（如网络中断、关闭浏览器）时，服务端会自动广播 `member:left` 事件。

---

### 前端调用示例（Socket.IO 同步控制）

> 以下展示同步控制模块的完整使用流程。
> 
> **重要提示**：
> - 只有房间创建者（房主）可以执行同步控制操作（play、pause、seek等）
> - 判断是否为房主：比较 `participantId` 是否等于房间详情中的 `creatorId`
> - 房主在播放器中跳转进度时，需要监听播放器的 `seeked` 事件，自动触发 `sync:seek`
> - 使用 `isSyncingSeek` 标志位防止同步事件循环触发

```javascript
import { io } from 'socket.io-client';

// 1) 连接同步控制命名空间
const syncSocket = io('http://localhost:3000/sync', {
  transports: ['websocket']
});

// 2) 加入同步频道（必须先通过 REST API 加入房间获取 participantId）
syncSocket.emit('sync:join', {
  roomId: '123456',
  participantId: '550e8400-e29b-41d4-a716-446655440000'
}, (ack) => {
  if (!ack?.ok) {
    console.error('加入同步频道失败:', ack?.error?.message);
    return;
  }
  console.log('加入同步频道成功:', ack.data);
  
  // 初始化视频播放器
  const { videoState, serverTime } = ack.data;
  initializePlayer(videoState, serverTime);
});

// 3) 监听同步事件（所有成员都会收到）
// 防止同步事件触发循环的标志位
let isSyncingSeek = false;

syncSocket.on('sync:event', (event) => {
  console.log('收到同步事件:', event);
  
  // 根据事件类型处理
  switch (event.type) {
    case 'PLAY':
      videoPlayer.play();
      break;
    case 'PAUSE':
      videoPlayer.pause();
      break;
    case 'SEEK':
      // 设置标志位，避免触发播放器的 seeked 事件后再次发送同步请求
      isSyncingSeek = true;
      videoPlayer.currentTime = event.payload.progress;
      // 注意：设置 currentTime 会触发 seeked 事件，但由于 isSyncingSeek 标志，不会再次发送同步请求
      break;
    case 'CHANGE_RATE':
      videoPlayer.playbackRate = event.payload.playbackRate;
      break;
    case 'CHANGE_SOURCE':
      videoPlayer.src = event.payload.source;
      videoPlayer.load();
      break;
    case 'CHANGE_SUBTITLE':
      // 根据播放器实现设置字幕
      if (videoPlayer.textTracks) {
        // HTML5 video 字幕处理
        // 具体实现取决于字幕格式和播放器
      }
      break;
  }
});

// 4) 房间创建者执行同步控制操作
const playVideo = () => {
  syncSocket.emit('sync:play', {
    roomId: '123456',
    operatorId: '550e8400-e29b-41d4-a716-446655440000'
  }, (ack) => {
    if (!ack?.ok) {
      console.error('播放失败:', ack?.error?.message);
      return;
    }
    console.log('播放成功');
  });
};

const pauseVideo = () => {
  syncSocket.emit('sync:pause', {
    roomId: '123456',
    operatorId: '550e8400-e29b-41d4-a716-446655440000'
  }, (ack) => {
    if (!ack?.ok) {
      console.error('暂停失败:', ack?.error?.message);
      return;
    }
    console.log('暂停成功');
  });
};

const seekVideo = (progress) => {
  syncSocket.emit('sync:seek', {
    roomId: '123456',
    operatorId: '550e8400-e29b-41d4-a716-446655440000',
    progress: progress
  }, (ack) => {
    if (!ack?.ok) {
      console.error('跳转失败:', ack?.error?.message);
      return;
    }
    console.log('跳转成功');
  });
};

// 5) 监听视频播放器的进度跳转事件（仅房主需要）
// 当房主在播放器中拖动进度条或跳转时，自动触发全员同步
// 注意：isSyncingSeek 标志位已在步骤3中定义

if (isCreator) {
  // 监听播放器的 seeked 事件（HTML5 video 元素）
  videoPlayer.addEventListener('seeked', (e) => {
    // 如果是因为收到同步事件而跳转的，则不发送同步请求
    if (isSyncingSeek) {
      isSyncingSeek = false;
      return;
    }
    
    // 获取当前播放进度
    const currentTime = videoPlayer.currentTime;
    
    // 自动触发同步
    seekVideo(currentTime);
  });
  
  // 如果使用其他播放器库（如 Video.js、DPlayer 等），监听相应的事件
  // 例如 Video.js:
  // videoPlayer.on('seeked', () => {
  //   if (isSyncingSeek) {
  //     isSyncingSeek = false;
  //     return;
  //   }
  //   seekVideo(videoPlayer.currentTime());
  // });
  
  // 例如 DPlayer:
  // videoPlayer.on('seek', () => {
  //   if (isSyncingSeek) {
  //     isSyncingSeek = false;
  //     return;
  //   }
  //   seekVideo(videoPlayer.video.currentTime);
  // });
}

// 注意：步骤3中已经处理了同步事件的接收，包括SEEK事件的标志位设置
// 这里只需要确保房主监听播放器的跳转事件即可

const changePlaybackRate = (rate) => {
  syncSocket.emit('sync:changeRate', {
    roomId: '123456',
    operatorId: '550e8400-e29b-41d4-a716-446655440000',
    rate: rate
  }, (ack) => {
    if (!ack?.ok) {
      console.error('改变倍速失败:', ack?.error?.message);
      return;
    }
    console.log('改变倍速成功');
  });
};

const changeSource = (sourceUrl) => {
  syncSocket.emit('sync:changeSource', {
    roomId: '123456',
    operatorId: '550e8400-e29b-41d4-a716-446655440000',
    sourceUrl: sourceUrl
  }, (ack) => {
    if (!ack?.ok) {
      console.error('更换视频源失败:', ack?.error?.message);
      return;
    }
    console.log('更换视频源成功');
  });
};
```

---

## API接口列表

### 1. 创建房间

创建一个新的线上观影室。

**请求**

```
POST /api/rooms
```

**请求头**

| Header | Value |
|--------|-------|
| Content-Type | application/json |

**请求体参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 房间名称，1-50字符 |
| capacity | number | 否 | 人数上限，2-100，默认10 |
| password | string | 否 | 房间密码，最长20字符 |
| announcement | string | 否 | 房间公告，最长500字符 |
| creatorNickname | string | 是 | 创建者昵称 |

**请求示例**

```json
{
  "name": "周末观影派对",
  "capacity": 20,
  "password": "123456",
  "announcement": "欢迎来到我的观影室！",
  "creatorNickname": "房主小明"
}
```

**响应示例**

```json
{
  "success": true,
  "code": 201,
  "message": "房间创建成功",
  "data": {
    "room": {
      "id": "123456",
      "name": "周末观影派对",
      "capacity": 20,
      "currentCount": 1,
      "hasPassword": true,
      "announcement": "欢迎来到我的观影室！",
      "status": "waiting",
      "videoState": {
        "source": null,
        "status": "paused",
        "progress": 0,
        "playbackRate": 1,
        "subtitle": null,
        "lastUpdateTime": 1736762400000,
        "currentProgress": 0
      },
      "participants": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "nickname": "房主小明",
          "role": "creator",
          "status": "online",
          "joinTime": "2026-01-13T10:00:00.000Z"
        }
      ],
      "creatorId": "550e8400-e29b-41d4-a716-446655440000",
      "createTime": "2026-01-13T10:00:00.000Z",
      "updateTime": "2026-01-13T10:00:00.000Z"
    },
    "creator": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nickname": "房主小明",
      "role": "creator"
    }
  },
  "timestamp": "2026-01-13T10:00:00.000Z"
}
```

**前端调用示例 (JavaScript/Axios)**

```javascript
import axios from 'axios';

const createRoom = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/rooms', {
      name: '周末观影派对',
      capacity: 20,
      password: '123456',
      announcement: '欢迎来到我的观影室！',
      creatorNickname: '房主小明'
    });
    
    if (response.data.success) {
      const { room, creator } = response.data.data;
      // 保存creator信息到本地存储，后续操作需要用到
      localStorage.setItem('userId', creator.id);
      localStorage.setItem('currentRoomId', room.id);
      console.log('房间创建成功，房间号:', room.id);
    }
  } catch (error) {
    console.error('创建房间失败:', error.response?.data?.message);
  }
};
```

---

### 2. 获取房间列表

获取所有可用房间的列表，支持分页和搜索。

**请求**

```
GET /api/rooms
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 搜索关键词，匹配房间名称或房间号 |
| status | string | 否 | 房间状态过滤：waiting, playing |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |

**请求示例**

```
GET /api/rooms?keyword=观影&status=waiting&page=1&pageSize=10
```

**响应示例**

```json
{
  "success": true,
  "code": 200,
  "message": "获取房间列表成功",
  "data": {
    "list": [
      {
        "id": "123456",
        "name": "周末观影派对",
        "capacity": 20,
        "currentCount": 5,
        "hasPassword": true,
        "status": "waiting",
        "creatorNickname": "房主小明",
        "createTime": "2026-01-13T10:00:00.000Z"
      },
      {
        "id": "789012",
        "name": "午夜电影院",
        "capacity": 10,
        "currentCount": 3,
        "hasPassword": false,
        "status": "waiting",
        "creatorNickname": "影迷小李",
        "createTime": "2026-01-13T09:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 2,
      "totalPages": 1
    }
  },
  "timestamp": "2026-01-13T10:30:00.000Z"
}
```

**前端调用示例**

```javascript
import axios from 'axios';

const getRoomList = async (keyword = '', page = 1) => {
  try {
    const response = await axios.get('http://localhost:3000/api/rooms', {
      params: {
        keyword,
        page,
        pageSize: 10
      }
    });
    
    if (response.data.success) {
      const { list, pagination } = response.data.data;
      console.log('房间列表:', list);
      console.log('分页信息:', pagination);
      return response.data.data;
    }
  } catch (error) {
    console.error('获取房间列表失败:', error.response?.data?.message);
  }
};
```

---

### 3. 获取房间详情

获取指定房间的详细信息。

**请求**

```
GET /api/rooms/:roomId
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID（6位数字） |

**请求示例**

```
GET /api/rooms/123456
```

**响应示例**

```json
{
  "success": true,
  "code": 200,
  "message": "获取房间详情成功",
  "data": {
    "id": "123456",
    "name": "周末观影派对",
    "capacity": 20,
    "currentCount": 5,
    "hasPassword": true,
    "announcement": "欢迎来到我的观影室！",
    "status": "waiting",
    "videoState": {
      "source": null,
      "status": "paused",
      "progress": 0,
      "playbackRate": 1,
      "subtitle": null,
      "lastUpdateTime": 1736762400000,
      "currentProgress": 0
    },
    "participants": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "nickname": "房主小明",
        "role": "creator",
        "status": "online",
        "joinTime": "2026-01-13T10:00:00.000Z"
      }
    ],
    "creatorId": "550e8400-e29b-41d4-a716-446655440000",
    "createTime": "2026-01-13T10:00:00.000Z",
    "updateTime": "2026-01-13T10:00:00.000Z"
  },
  "timestamp": "2026-01-13T10:30:00.000Z"
}
```

**前端调用示例**

```javascript
const getRoomDetail = async (roomId) => {
  try {
    const response = await axios.get(`http://localhost:3000/api/rooms/${roomId}`);
    
    if (response.data.success) {
      return response.data.data;
    }
  } catch (error) {
    if (error.response?.data?.errorCode === 'ROOM_NOT_FOUND') {
      console.error('房间不存在');
    } else {
      console.error('获取房间详情失败:', error.response?.data?.message);
    }
  }
};
```

---

### 4. 验证房间密码

验证房间密码是否正确（用于加入有密码的房间前的预检查）。

**请求**

```
POST /api/rooms/:roomId/verify-password
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |

**请求体参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| password | string | 是 | 待验证的密码 |

**请求示例**

```json
{
  "password": "123456"
}
```

**响应示例（成功）**

```json
{
  "success": true,
  "code": 200,
  "message": "密码验证成功",
  "data": {
    "valid": true
  },
  "timestamp": "2026-01-13T10:30:00.000Z"
}
```

**响应示例（失败）**

```json
{
  "success": false,
  "code": 401,
  "message": "房间密码错误",
  "errorCode": "INVALID_PASSWORD",
  "timestamp": "2026-01-13T10:30:00.000Z"
}
```

**前端调用示例**

```javascript
const verifyPassword = async (roomId, password) => {
  try {
    const response = await axios.post(
      `http://localhost:3000/api/rooms/${roomId}/verify-password`,
      { password }
    );
    
    return response.data.success;
  } catch (error) {
    if (error.response?.data?.errorCode === 'INVALID_PASSWORD') {
      alert('密码错误，请重新输入');
    }
    return false;
  }
};
```

---

### 5. 加入房间

加入指定的房间。

**请求**

```
POST /api/rooms/:roomId/join
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |

**请求体参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 是 | 用户昵称 |
| password | string | 否 | 房间密码（如果房间设置了密码） |

**请求示例**

```json
{
  "nickname": "观影小王",
  "password": "123456"
}
```

**响应示例**

```json
{
  "success": true,
  "code": 200,
  "message": "加入房间成功",
  "data": {
    "room": {
      "id": "123456",
      "name": "周末观影派对",
      "capacity": 20,
      "currentCount": 6,
      "hasPassword": true,
      "announcement": "欢迎来到我的观影室！",
      "status": "waiting",
      "videoState": { ... },
      "participants": [ ... ],
      "creatorId": "550e8400-e29b-41d4-a716-446655440000",
      "createTime": "2026-01-13T10:00:00.000Z",
      "updateTime": "2026-01-13T10:30:00.000Z"
    },
    "participant": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "nickname": "观影小王",
      "role": "viewer",
      "status": "online",
      "joinTime": "2026-01-13T10:30:00.000Z"
    }
  },
  "timestamp": "2026-01-13T10:30:00.000Z"
}
```

**前端调用示例**

```javascript
const joinRoom = async (roomId, nickname, password = '') => {
  try {
    const response = await axios.post(
      `http://localhost:3000/api/rooms/${roomId}/join`,
      { nickname, password }
    );
    
    if (response.data.success) {
      const { room, participant } = response.data.data;
      // 保存用户信息
      localStorage.setItem('userId', participant.id);
      localStorage.setItem('currentRoomId', room.id);
      console.log('加入房间成功');
      return response.data.data;
    }
  } catch (error) {
    const errorCode = error.response?.data?.errorCode;
    switch (errorCode) {
      case 'ROOM_NOT_FOUND':
        alert('房间不存在');
        break;
      case 'ROOM_FULL':
        alert('房间已满');
        break;
      case 'INVALID_PASSWORD':
        alert('密码错误');
        break;
      case 'ROOM_CLOSED':
        alert('房间已关闭');
        break;
      default:
        alert('加入房间失败');
    }
  }
};
```

---

### 6. 退出房间

退出当前所在的房间。

**请求**

```
POST /api/rooms/:roomId/leave
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |

**请求体参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| participantId | string | 是 | 参与者ID（加入房间时返回的ID） |

**请求示例**

```json
{
  "participantId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**响应示例**

```json
{
  "success": true,
  "code": 200,
  "message": "退出房间成功",
  "data": null,
  "timestamp": "2026-01-13T11:00:00.000Z"
}
```

**前端调用示例**

```javascript
const leaveRoom = async () => {
  const roomId = localStorage.getItem('currentRoomId');
  const participantId = localStorage.getItem('userId');
  
  try {
    const response = await axios.post(
      `http://localhost:3000/api/rooms/${roomId}/leave`,
      { participantId }
    );
    
    if (response.data.success) {
      localStorage.removeItem('currentRoomId');
      console.log('已退出房间');
    }
  } catch (error) {
    console.error('退出房间失败:', error.response?.data?.message);
  }
};
```

---

### 7. 解散房间

解散房间（仅房间创建者可操作）。

**请求**

```
DELETE /api/rooms/:roomId
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |

**请求体参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorId | string | 是 | 操作者ID（必须是房间创建者） |

**请求示例**

```json
{
  "operatorId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**响应示例**

```json
{
  "success": true,
  "code": 200,
  "message": "房间已解散",
  "data": null,
  "timestamp": "2026-01-13T12:00:00.000Z"
}
```

**前端调用示例**

```javascript
const dissolveRoom = async () => {
  const roomId = localStorage.getItem('currentRoomId');
  const operatorId = localStorage.getItem('userId');
  
  // 先确认
  if (!confirm('确定要解散房间吗？此操作不可恢复！')) {
    return;
  }
  
  try {
    const response = await axios.delete(
      `http://localhost:3000/api/rooms/${roomId}`,
      { data: { operatorId } }
    );
    
    if (response.data.success) {
      localStorage.removeItem('currentRoomId');
      alert('房间已解散');
      // 跳转到房间列表页
      window.location.href = '/rooms';
    }
  } catch (error) {
    if (error.response?.data?.errorCode === 'PERMISSION_DENIED') {
      alert('只有房间创建者才能解散房间');
    } else {
      alert('解散房间失败');
    }
  }
};
```

---

### 8. 更新房间配置

更新房间配置（仅房间创建者可操作）。

**请求**

```
PATCH /api/rooms/:roomId
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| roomId | string | 是 | 房间ID |

**请求体参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorId | string | 是 | 操作者ID（必须是房间创建者） |
| name | string | 否 | 新的房间名称 |
| capacity | number | 否 | 新的人数上限 |
| password | string | 否 | 新的密码（空字符串表示取消密码） |
| announcement | string | 否 | 新的公告 |

**请求示例**

```json
{
  "operatorId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "周末观影派对 - 新名称",
  "announcement": "今天我们看《星际穿越》！"
}
```

**响应示例**

```json
{
  "success": true,
  "code": 200,
  "message": "房间配置更新成功",
  "data": {
    "id": "123456",
    "name": "周末观影派对 - 新名称",
    "capacity": 20,
    "currentCount": 5,
    "hasPassword": true,
    "announcement": "今天我们看《星际穿越》！",
    "status": "waiting",
    ...
  },
  "timestamp": "2026-01-13T11:00:00.000Z"
}
```

**前端调用示例**

```javascript
const updateRoom = async (updateData) => {
  const roomId = localStorage.getItem('currentRoomId');
  const operatorId = localStorage.getItem('userId');
  
  try {
    const response = await axios.patch(
      `http://localhost:3000/api/rooms/${roomId}`,
      { operatorId, ...updateData }
    );
    
    if (response.data.success) {
      console.log('房间配置更新成功');
      return response.data.data;
    }
  } catch (error) {
    if (error.response?.data?.errorCode === 'PERMISSION_DENIED') {
      alert('只有房间创建者才能修改配置');
    } else {
      alert('更新配置失败');
    }
  }
};

// 使用示例
updateRoom({
  name: '新的房间名称',
  announcement: '新的公告内容'
});
```

---

### 9. 获取房间统计信息

获取当前系统的房间统计数据。

**请求**

```
GET /api/rooms/stats
```

**响应示例**

```json
{
  "success": true,
  "code": 200,
  "message": "获取统计信息成功",
  "data": {
    "totalRooms": 10,
    "totalParticipants": 45,
    "waitingRooms": 6,
    "playingRooms": 4
  },
  "timestamp": "2026-01-13T10:30:00.000Z"
}
```

**前端调用示例**

```javascript
const getRoomStats = async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/rooms/stats');
    
    if (response.data.success) {
      return response.data.data;
    }
  } catch (error) {
    console.error('获取统计信息失败');
  }
};
```

---

## 前端集成指南

### 1. 安装依赖

```bash
npm install axios
```

### 2. 创建API服务封装

建议创建一个统一的API服务文件：

```javascript
// src/api/roomApi.js
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

// 创建axios实例
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  response => response,
  error => {
    const errorData = error.response?.data;
    console.error('API Error:', errorData?.message || error.message);
    return Promise.reject(error);
  }
);

// 房间相关API
export const roomApi = {
  // 获取房间列表
  getList: (params) => apiClient.get('/rooms', { params }),
  
  // 获取房间详情
  getDetail: (roomId) => apiClient.get(`/rooms/${roomId}`),
  
  // 创建房间
  create: (data) => apiClient.post('/rooms', data),
  
  // 加入房间
  join: (roomId, data) => apiClient.post(`/rooms/${roomId}/join`, data),
  
  // 退出房间
  leave: (roomId, participantId) => 
    apiClient.post(`/rooms/${roomId}/leave`, { participantId }),
  
  // 解散房间
  dissolve: (roomId, operatorId) => 
    apiClient.delete(`/rooms/${roomId}`, { data: { operatorId } }),
  
  // 更新房间
  update: (roomId, data) => apiClient.patch(`/rooms/${roomId}`, data),
  
  // 验证密码
  verifyPassword: (roomId, password) => 
    apiClient.post(`/rooms/${roomId}/verify-password`, { password }),
  
  // 获取统计信息
  getStats: () => apiClient.get('/rooms/stats')
};

export default roomApi;
```

### 3. 在Vue组件中使用

```vue
<template>
  <div class="room-list">
    <div v-for="room in rooms" :key="room.id" class="room-item">
      <h3>{{ room.name }}</h3>
      <p>房间号: {{ room.id }}</p>
      <p>人数: {{ room.currentCount }}/{{ room.capacity }}</p>
      <p v-if="room.hasPassword">🔒 需要密码</p>
      <button @click="handleJoin(room)">加入房间</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import roomApi from '@/api/roomApi';

export default {
  setup() {
    const rooms = ref([]);
    
    const loadRooms = async () => {
      try {
        const response = await roomApi.getList({ page: 1, pageSize: 20 });
        rooms.value = response.data.data.list;
      } catch (error) {
        console.error('加载房间列表失败');
      }
    };
    
    const handleJoin = async (room) => {
      const nickname = prompt('请输入您的昵称:');
      if (!nickname) return;
      
      let password = '';
      if (room.hasPassword) {
        password = prompt('请输入房间密码:');
        if (!password) return;
      }
      
      try {
        const response = await roomApi.join(room.id, { nickname, password });
        const { participant } = response.data.data;
        localStorage.setItem('userId', participant.id);
        localStorage.setItem('currentRoomId', room.id);
        // 跳转到房间页面
        window.location.href = `/room/${room.id}`;
      } catch (error) {
        alert(error.response?.data?.message || '加入房间失败');
      }
    };
    
    onMounted(loadRooms);
    
    return { rooms, handleJoin };
  }
};
</script>
```

---

## 附录

### A. 数据模型

#### Room（房间）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 房间ID（6位数字） |
| name | string | 房间名称 |
| capacity | number | 人数上限 |
| currentCount | number | 当前人数 |
| hasPassword | boolean | 是否有密码 |
| announcement | string | 房间公告 |
| status | string | 房间状态（waiting/playing/closed） |
| videoState | VideoState | 视频状态 |
| participants | Participant[] | 参与者列表 |
| creatorId | string | 创建者ID |
| createTime | string | 创建时间（ISO8601） |
| updateTime | string | 更新时间（ISO8601） |

#### VideoState（视频状态）

| 字段 | 类型 | 说明 |
|------|------|------|
| source | string | 视频源URL |
| status | string | 播放状态（playing/paused/stopped） |
| progress | number | 播放进度（秒） |
| playbackRate | number | 播放倍速 |
| subtitle | string | 字幕设置 |
| lastUpdateTime | number | 最后更新时间戳 |
| currentProgress | number | 当前计算进度 |

#### Participant（参与者）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 参与者ID |
| nickname | string | 昵称 |
| role | string | 角色（creator/viewer） |
| status | string | 状态（online/offline） |
| joinTime | string | 加入时间（ISO8601） |

### B. 常见问题

**Q: 如何处理房间密码？**
A: 加入有密码的房间时，需要在请求体中传递password字段。可以先调用验证密码接口进行预检查。

**Q: 如何判断当前用户是否是房间创建者？**
A: 比较localStorage中保存的userId与房间详情中的creatorId是否一致。

**Q: 服务重启后数据会丢失吗？**
A: 是的，当前版本使用内存存储，服务重启后数据会丢失。后续版本会添加持久化存储。
