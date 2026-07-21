# 设计规范文档

**版本**: v2.0.0
**日期**: 2026-07-20
**作者**: 产品设计师 Agent（v1.0.0）；2026-07-20 按代码实现回写（v2.0.0）

> **重要**：本文档已与 2026-07 的前端实现对齐。如文档与代码再次不一致，以 `src/frontend/src/index.css` 和 `src/frontend/tailwind.config.js` 为准，并及时回写本文档。

---

## 1. 用户画像

### 1.1 主要用户特征

| 维度 | 描述 |
|------|------|
| **年龄** | 50-70岁 |
| **技术能力** | 基础智能机使用能力，能使用微信、拍照 |
| **身体状况** | 可能伴随视力退化、手部颤抖、反应较慢 |
| **心理状态** | 对疾病焦虑，需要温和积极的反馈 |
| **使用场景** | 居家监测、医院复查后、透析日 |

### 1.2 设计目标

- **易用性**: 减少操作步骤，一页只做一件事
- **可读性**: 大字体、高对比度（WCAG AA ≥ 4.5:1）、清晰的信息层级
- **安全感**: 温和的语言，避免制造焦虑
- **及时反馈**: 每个操作都有明确的响应

---

## 2. 色彩系统

> 实现位置：`tailwind.config.js`（功能色/主色）+ `index.css` `:root`/`.dark`（中性色 CSS 变量）。

### 2.1 主色调

| 颜色名称 | 色值 | 用途 |
|----------|------|------|
| **主蓝 primary** | `#3E63DD` | 主品牌色、主要按钮、链接、导航激活态 |
| **深主蓝 primary-dark** | `#2F4FB8` | 按钮悬停态 |
| **浅主蓝 primary-light** | `#E8EEFF` | 选中态背景、信息预警卡片背景 |
| **柔主蓝 primary-soft** | `#F4F7FF` | 大面积浅背景 |

### 2.2 功能色

> 2026-07-20 起 warning/success 已调深以满足白底小字 WCAG AA（≥4.5:1）。

| 颜色名称 | 色值 | 用途 |
|----------|------|------|
| **成功/正常 success** | `#1F7A4D` | 正常指标、成功状态、已服药标记（白底约 5.3:1） |
| **警告 warning** | `#A06200` | 需要注意、轻微异常（白底约 5.0:1） |
| **危险/异常 danger** | `#D9485F` | 紧急预警、严重异常、错误提示 |
| **用药紫 medication** | `#6F5BD3` | 用药相关专属色、与主蓝区分 |
| **浅用药紫 medication-light** | `#F1EEFF` | 用药卡片渐变背景 |

### 2.3 中性色（CSS 变量，深色模式自动切换）

| 变量 | 浅色 | 深色 | 用途 |
|------|------|------|------|
| `--color-bg` | `#F4F6FB` | `#0F1728` | 页面背景（叠加径向渐变） |
| `--color-card` | `rgba(255,255,255,0.82)` | `rgba(18,28,48,0.82)` | 卡片背景（玻璃拟态，配 backdrop-blur） |
| `--color-text-primary` | `#1F2A44` | `#EEF3FF` | 主要文字 |
| `--color-text-secondary` | `#5E6B85` | `#B5C0D8` | 次要文字、标签 |
| `--color-text-helper` | `#5B6478` | `#7F8AA7` | 时间、提示（浅色白底约 5.9:1，2026-07-20 由 `#8A94AB` 调深） |
| `--color-border` | `rgba(145,161,196,0.26)` | `rgba(139,160,206,0.18)` | 边框、分割线 |
| `--color-disabled` | `#B2BCCF` | `#54627F` | 禁用状态 |

**铁律**：禁止硬编码 `bg-white`/`text-black` 等；使用 `bg-gray-bg`、`bg-gray-card`、`text-gray-text-primary`、`text-gray-text-secondary`、`text-gray-text-helper`、`border-gray-border` 等映射类。类名是嵌套结构——`text-gray-secondary` / `text-gray-helper` / `text-gray-hint` 都不存在，写了不会生成任何 CSS（2026-07-20 已全仓清理）。

### 2.4 深色模式

- Tailwind `darkMode: 'class'`，`themeStore` 在 `<html>` 上切换 `.dark` 类
- 中性色全部由 CSS 变量驱动（见 2.3），组件无需感知主题
- **例外**：Recharts 图表的坐标轴、tooltip 颜色是 JS 写死的，不走 CSS 变量，统一使用 `src/frontend/src/utils/chartTheme.ts`（轴 13px，浅色 `#5B6478` / 深色 `#B3B3B3`；tooltip 深色为 `#1F1F1F` 卡片 + `#434343` 边框 + `#E6E6E6` 文字）
- 页面背景为多层径向渐变 + 线性渐变（`index.css` body/`.dark body`），卡片用半透明 + `backdrop-blur-xl` 的玻璃拟态风格

### 2.5 医疗指标颜色规范

指标状态色统一使用 2.2 的 success/warning/danger。阈值定义以 `docs/medical-spec.md` 为准。注意：他克莫司（血药浓度）**没有通用固定参考范围**，界面只提示"以医生设定目标范围为准/按医嘱处理"，禁止展示 `5-15 ng/mL` 之类的通用正常区间。

---

## 3. 字体规范

### 3.1 字体栈

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif;
```

### 3.2 字号规范（tailwind.config.js `fontSize` token）

| Token | 字号 | 字重 | 行高 | 用途 |
|-------|------|------|------|------|
| `text-title` | 30px | 700 | 1.2 | 页面大标题 |
| `text-page-title` | 22px | 650 | 1.3 | 次级页面标题 |
| `text-card-title` | 18px | 600 | 1.45 | 卡片标题 |
| `text-body` | 16px | 400 | 1.65 | 正文 |
| `text-helper` | 14px | 400 | 1.55 | 标签、说明、医疗提示/免责声明下限 |
| `text-small` | 12px | 400 | 1.5 | 时间戳、单位等次要信息（**医疗安全相关文案禁止使用 12px**，最低 14px） |
| `text-metric` | 30px | 700 | 1.15 | 指标大数值 |

### 3.3 特殊文字

| 类型 | 样式 |
|------|------|
| **指标数值** | `text-metric`（30px/700），颜色随状态变化（success/warning/danger） |
| **预警标题** | 16px, 500, 对应预警级别颜色 |
| **按钮文字** | 16px, 500 |
| **导航文字** | 11-12px（底部胶囊导航） |

---

## 4. 间距与布局

### 4.1 基础间距

实际代码使用 Tailwind 原生间距刻度（`p-4`/`mt-3`/`gap-2` 等）。推荐语义对应：4px 图标间距、8-12px 元素间距、16px 卡片内边距与页面左右边距、20-24px 模块间距。

### 4.2 页面布局

- **移动端（<768px）**：内容容器 `max-w-6xl px-4 py-5`，主体 `pb-24` 给悬浮胶囊底栏让位
- **桌面端（≥768px）**：左侧固定边栏 240px（`md:pl-[240px]`），`#root` 最大宽 1440px，主内容 `max-w-6xl` 居中；Dashboard 在 `lg`/`xl` 断点使用双栏 grid
- **卡片内边距**：`.card` 为 `p-4 md:p-5`

---

## 5. 组件规范

> 实现分两层：`index.css` `@layer components` 的 CSS 类（`.card`、`.btn-primary` 等）+ `src/frontend/src/components/ui/` 的 React 组件（BackButton、SegmentedControl、Spinner、ConfirmDialog）。新页面优先复用这两层，禁止复制粘贴样式串。

### 5.1 按钮

#### 主按钮 `.btn-primary`
- 高度 48px（`h-12`），圆角 16px（`rounded-button`），白字 16px/500
- 背景 primary `#3E63DD`，阴影 `0 10px 24px rgba(62,99,221,0.22)`，hover 上浮 + `primary-dark`

#### 次按钮 `.btn-secondary`
- 同高同圆角，`border-gray-border` + `bg-gray-card` 玻璃拟态，hover 上浮

#### 用药按钮 `.btn-medication`
- 同主按钮规格，背景 medication `#6F5BD3`，阴影 `rgba(111,91,211,0.25)`

#### 危险操作
- 破坏性操作（删除等）统一走 `ConfirmDialog` 确认弹窗（`components/ui/ConfirmDialog.tsx`），**禁止使用 `window.confirm` / `alert()`**
- 图标式危险按钮触摸目标 ≥44px，必须带 `aria-label`

#### React 组件
- `BackButton`：44px 圆形返回按钮，`aria-label="返回"`，全站唯一返回样式
- `Spinner`：加载指示器，sm/md/lg 三档，替换手写 `animate-spin` 块

### 5.2 输入框 `.input-field`

- 高度 48px，圆角 18px（`rounded-input`），16px 文字
- 边框 `border-gray-border`，聚焦 `border-primary` + 阴影 `0 0 0 4px rgba(62,99,221,0.14)`
- 占位符 `text-gray-text-helper`
- iOS 日期输入框已在 `index.css` 用 `-webkit-appearance: none` + `line-height: 1.5` 重置

### 5.3 卡片

#### 标准卡片 `.card`
- 圆角 24px（`rounded-card`），`border-gray-border`，`bg-gray-card` + `backdrop-blur-xl`
- 阴影 `0 18px 45px rgba(25,36,68,0.08)`（`shadow-card`）

#### 变体
- `.card-muted`：弱化面板
- `.card-medication`：用药卡片，medication 紫渐变（深色模式有专门覆写）
- `.card-alert-critical/warning/info`：预警卡片，按级别着色（danger/warning/primary 的 20% 边框 + 浅色底）
- `.metric-panel`：指标面板，圆角 22px

### 5.4 选择器与弹层

- **SegmentedControl**（`components/ui/`）：分段选择器，受控组件，Dashboard/Charts 共用
- **BottomSelector**（底部弹层选择器，目前在 `MedicationForm.tsx` 内）：层级 `z-[60]`（高于底栏 `z-50`）、`max-h-[60vh]` + `pb-20` 防截断、`animate-slide-up` 动画
- **chip `.chip` / `.chip-active`**：筛选小胶囊，32px 高（次要操作，主操作不得用此规格）

### 5.5 导航

#### 移动端底部导航（BottomNav）
- 悬浮胶囊样式：`fixed bottom-3 left-3 right-3`，圆角 28px，4 项 grid
- 图标 20px + 11px 文字，`safe-bottom` 安全区适配
- 激活态 `.nav-item.active`：白底（深色 10% 白）+ primary 文字 + 柔和阴影

#### 桌面端左侧边栏
- 固定 240px 宽，含品牌卡 + 导航项，与移动端共用 BottomNav 组件

---

## 6. 页面清单

以 `src/frontend/src/App.tsx` 路由定义为唯一事实来源。核心路由：`/login`、`/register`、`/forgot-password`、`/privacy-policy`（公开）；`/onboarding`（登录后引导）；`/`（Dashboard）、`/records`、`/records/new`、`/records/:id`、`/charts`、`/medications`、`/medications/new`、`/alerts`、`/profile`、`/settings`、`/reminder-settings`、`/privacy-security`、`/help-center`、`/insights`（需登录+完成引导）。

---

## 7. 无障碍设计

### 7.1 视觉无障碍

- **最小字号**: 16px（正文）；医疗安全提示/免责声明 ≥14px
- **颜色对比度**: ≥ 4.5:1（helper/warning/success 已于 2026-07-20 调深达标）
- **不单独依赖颜色**: 图标+文字双重提示；图表图例文字+色块双编码

### 7.2 交互无障碍

- **主操作点击区域**: ≥ 48x48px；**次级/图标按钮**: ≥ 44x44px
- **支持键盘操作**: Tab 导航、Enter 确认
- **焦点可见**: 清晰的焦点样式
- **图标按钮必须带 `aria-label`**；表单 label 用 `htmlFor` 关联 input

### 7.3 内容无障碍

- **图片必须包含 alt 文本**
- **错误提示明确**: 说明错误原因和修正方法
- **避免闪烁**: 不使用闪烁或自动播放内容

---

## 8. 动画与过渡

### 8.1 过渡时间

| 类型 | 时长 | 用途 |
|------|------|------|
| **快速** | 150ms | 按钮悬停、小状态变化 |
| **标准** | 200ms | 卡片展开、菜单显示（`.btn-*` hover 用 `duration-200`） |
| **慢速** | 250-300ms | 页面切换、模态框、BottomSelector（`slide-up 0.25s ease-out`） |

### 8.2 缓动函数

- **标准**: `ease-in-out`；**进入**: `ease-out`；**退出**: `ease-in`

### 8.3 常用动画

- **按钮悬停**: 上浮 `-translate-y-0.5` + 阴影加深 200ms
- **加载**: Spinner 旋转 `animate-spin`
- **底部弹层**: `animate-slide-up`

---

## 9. 图标规范

### 9.1 图标尺寸

| 用途 | 尺寸 |
|------|------|
| **底部导航图标** | 20px |
| **按钮图标** | 20px |
| **列表图标** | 24px |
| **状态图标** | 16px |
| **大图标** | 48px |

### 9.2 图标颜色

- **默认**: `text-gray-text-secondary`
- **激活**: primary `#3E63DD`
- **成功/警告/危险**: success `#1F7A4D` / warning `#A06200` / danger `#D9485F`
- **用药**: medication `#6F5BD3`

### 9.3 推荐图标

| 功能 | 图标建议 |
|------|----------|
| 首页 | home |
| 记录 | file-text |
| 图表 | trend-line |
| 用药 | pill/medicine-bottle |
| 我的 | user |
| 添加 | plus |
| 编辑 | edit |
| 删除 | trash |
| 拍照 | camera |
| 提醒 | bell |
| 警告 | alert-triangle |
| 成功 | check-circle |
| 关闭 | x |
| 返回 | chevron-left / arrow-left（BackButton 统一） |
| 更多 | more-horizontal |

---

## 10. 响应式断点

移动端优先，单一断点策略：

| 断点 | 宽度 | 布局 |
|------|------|------|
| **Mobile** | < 768px | 单列 + 悬浮胶囊底栏 |
| **Desktop** | ≥ 768px（`md`） | 左侧边栏 240px + 内容区（`#root` 最大 1440px，主内容 `max-w-6xl`）；`lg`/`xl` 起 Dashboard 双栏 |

---

## 11. 设计原则总结

1. **老年友好**: 大字体、大按钮、高对比度（≥4.5:1）、简洁布局
2. **简洁清晰**: 一页只做一件事，减少认知负担
3. **及时反馈**: 每个操作都有明确响应，避免用户困惑
4. **积极安抚**: 使用温和积极的语言，避免制造焦虑
5. **医疗严谨**: 指标展示准确，颜色区分明确；医疗提示 ≥14px 且对比度达标；血药浓度无通用固定范围
6. **用药突出**: 紫色标识用药相关功能，与主蓝区分

---

**文档结束**
