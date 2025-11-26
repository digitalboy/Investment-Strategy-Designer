```typescript
import React, { useState } from 'react';
import { 
  LineChart, 
  Wallet, 
  Plus, 
  RefreshCw, 
  Search, 
  Bell, 
  Settings, 
  ChevronDown, 
  ArrowUpRight, 
  TrendingUp, 
  Activity,
  Layers,
  Zap,
  Globe
} from 'lucide-react';

// --- 组件：策略卡片 ---
const StrategyCard = ({ title, tags, roi, drawdown, tickers, isPublic, time, type }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
    {/* 顶部装饰条 (Hover时显示) */}
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-400 to-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>

    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${isPublic ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
          {isPublic ? '✓ 公开' : '🔒 私有'}
        </span>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
      
      <div className="text-right">
        <div className="text-2xl font-bold text-emerald-600 flex items-center justify-end gap-1">
          {roi > 0 ? '+' : ''}{roi}%
        </div>
        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">年化收益</div>
      </div>
    </div>

    <div className="mb-4">
      <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-emerald-700 transition-colors">{title}</h3>
      <div className="flex items-center gap-2 mt-2">
        {tickers.map((t, i) => (
          <span key={i} className="text-xs font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
            {t}
          </span>
        ))}
        <span className="text-xs text-gray-400">• {type}</span>
      </div>
    </div>
    
    <div className="flex justify-between items-end mb-4">
       <div className="text-xs text-gray-500">
          <span className="block text-gray-400 text-[10px]">最大回撤</span>
          <span className="font-mono font-medium">{drawdown}%</span>
       </div>
       {/* 迷你图表占位 */}
       <div className="h-8 w-24 bg-gray-50 rounded flex items-center justify-center opacity-50">
          <Activity size={14} className="text-gray-300" />
       </div>
    </div>

    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
      {tags.map((tag, i) => (
        <span key={i} className="text-[10px] bg-blue-50/50 text-slate-500 px-2 py-1 rounded hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-default">
          {tag}
        </span>
      ))}
    </div>
  </div>
);

// --- 主应用组件 ---
export default function QuantDashboard() {
  const [activeTab, setActiveTab] = useState('strategies');

  // 模拟数据
  const strategies = [
    {
      title: "QQQ 抄底策略",
      roi: 22.4,
      drawdown: -35.6,
      tickers: ["QQQ"],
      type: "1 个标的",
      tags: ["Momentum", "Trend", "Buy Only", "Fixed Amount"],
      isPublic: true,
      time: "今天 13:36"
    },
    {
      title: "全天候增强版 444",
      roi: 18.2,
      drawdown: -21.9,
      tickers: ["QQQ", "TLT"],
      type: "2 个标的",
      tags: ["Drawdown", "Contrarian", "Breakout", "Momentum"],
      isPublic: true,
      time: "今天 14:37"
    },
    {
      title: "高股息轮动 Brand3",
      roi: 8.3,
      drawdown: -19.8,
      tickers: ["SCHD"],
      type: "1 个标的",
      tags: ["Momentum", "Trend", "Buy Only", "Low Vol"],
      isPublic: true,
      time: "今天 16:14"
    },
    {
      title: "盘破22 - 突破跟随",
      roi: 7.3,
      drawdown: -32.4,
      tickers: ["IXUS"],
      type: "2 个标的",
      tags: ["Momentum", "Trend", "Breakout", "Two-Way"],
      isPublic: true,
      time: "今天 16:13"
    },
    {
      title: "PPP 稳健型",
      roi: 6.8,
      drawdown: -18.9,
      tickers: ["SCHD"],
      type: "1 个标的",
      tags: ["Momentum", "Trend", "Buy Only", "Fixed Amount"],
      isPublic: true,
      time: "今天 16:37"
    }
  ];

  return (
    <div className="min-h-screen font-sans text-gray-800 bg-slate-50 relative selection:bg-lime-200 selection:text-emerald-900">
      
      {/* 1. 背景网格 (还原图片中的科技感背景) */}
      <div className="absolute inset-0 z-0 pointer-events-none" 
           style={{
             backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             opacity: 0.15
           }}>
      </div>

      {/* 2. 顶部导航栏 */}
      <nav className="relative z-20 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-lime-500 to-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <span className="font-bold font-mono">Q</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">
            QuantStrategy
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center text-sm font-medium text-gray-500 gap-6">
            <a href="#" className="hover:text-emerald-600 transition-colors">控制台</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">回测引擎</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">社区</a>
          </div>
          <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
          <div className="flex items-center gap-3">
             <div className="relative">
                <Bell size={20} className="text-gray-500 hover:text-gray-700 cursor-pointer" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
             </div>
             <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                   DS
                </div>
                <span className="text-sm font-medium text-gray-600 hidden sm:block">中文</span>
                <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
             </div>
          </div>
        </div>
      </nav>

      {/* 3. 主要内容区域 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* --- Hero Banner (应用方案 3C) --- */}
        <div className="w-full rounded-[2rem] p-8 md:p-12 shadow-xl text-white relative overflow-hidden bg-gradient-to-r from-[#84cc16] to-[#059669] transition-all hover:shadow-2xl hover:shadow-emerald-200/50">
            {/* 装饰元素：暖光 */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#facc15] opacity-30 blur-3xl mix-blend-overlay animate-pulse"></div>
            {/* 装饰元素：深度光 */}
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-64 h-64 bg-[#065f46] opacity-10 blur-3xl rounded-full"></div>
            {/* 装饰元素：线条 */}
             <svg className="absolute bottom-0 w-full h-32 opacity-10 pointer-events-none" viewBox="0 0 1440 320" preserveAspectRatio="none">
                <path fill="#fff" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,202.7C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>

            <div className="relative z-10 max-w-3xl">
                <h1 className="text-3xl md:text-4xl font-bold mb-4 flex items-center text-shadow-sm">
                    欢迎回来，策略大师 <span className="ml-3 text-3xl">👋</span>
                </h1>
                <p className="text-lime-50 text-lg md:text-xl font-medium opacity-95 leading-relaxed">
                    市场春意盎然，您的组合表现优异。继续优化策略，或探索社区中的创新想法。
                </p>
                
                <div className="mt-8 flex flex-wrap gap-4">
                  <button className="bg-white text-[#059669] px-6 py-2.5 rounded-xl shadow-lg hover:bg-lime-50 transition-all font-bold flex items-center group">
                      <Zap size={18} className="mr-2 group-hover:text-lime-600 transition-colors" />
                      极速回测
                  </button>
                  <button className="bg-[#064e3b]/20 text-white border border-white/40 px-6 py-2.5 rounded-xl hover:bg-[#064e3b]/30 transition-all font-semibold backdrop-blur-sm flex items-center">
                      <Globe size={18} className="mr-2" />
                      浏览市场
                  </button>
                </div>
            </div>
        </div>

        {/* --- 策略列表 Section --- */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-gray-100">
                <Wallet size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">我的策略</h2>
                <p className="text-sm text-gray-500">管理和优化您的投资策略组合</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors shadow-sm">
                  <RefreshCw size={16} />
                  <span className="hidden sm:inline">刷新数据</span>
               </button>
               {/* 主按钮使用翡翠绿，呼应主题 */}
               <button className="flex items-center gap-2 px-5 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] shadow-lg shadow-emerald-200 text-sm font-medium transition-all transform active:scale-95">
                  <Plus size={18} />
                  新建策略
               </button>
            </div>
          </div>

          {/* 网格布局 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {strategies.map((strategy, index) => (
              <StrategyCard key={index} {...strategy} />
            ))}
            
            {/* 创建新策略占位卡片 */}
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all cursor-pointer group min-h-[240px]">
               <div className="w-16 h-16 rounded-full bg-gray-100 group-hover:bg-white group-hover:shadow-md flex items-center justify-center mb-4 transition-all">
                  <Plus size={32} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
               </div>
               <span className="font-medium group-hover:text-emerald-600 transition-colors">创建新策略</span>
            </div>
          </div>
        </div>

        {/* --- 底部精选榜单 (基于图片底部) --- */}
        <div className="pt-8 border-t border-gray-200">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <TrendingUp size={20} />
                 </div>
                 <div>
                    <h2 className="text-lg font-bold text-gray-800">精选榜单</h2>
                    <p className="text-xs text-gray-500">发现顶尖量化策略</p>
                 </div>
              </div>
              
              <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                 <button className="px-3 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700">最新发布</button>
                 <button className="px-3 py-1 text-xs font-medium rounded-md text-gray-500 hover:bg-gray-50">最受欢迎</button>
                 <button className="px-3 py-1 text-xs font-medium rounded-md text-gray-500 hover:bg-gray-50">收益率</button>
              </div>
           </div>
           
           {/* 简单的榜单列表 */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {[1, 2, 3].map((i) => (
                 <div key={i} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                       <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${i===1 ? 'bg-yellow-100 text-yellow-700' : i===2 ? 'bg-gray-100 text-gray-700' : 'bg-orange-100 text-orange-700'}`}>
                          {i}
                       </span>
                       <div>
                          <div className="font-bold text-sm text-gray-800">Alpha Trend V{i}</div>
                          <div className="text-xs text-gray-400">By QuantMaster</div>
                       </div>
                    </div>
                    <div className="flex gap-8 text-right">
                       <div>
                          <div className="text-emerald-600 font-bold text-sm">+{120 - i * 15}%</div>
                          <div className="text-[10px] text-gray-400">总收益</div>
                       </div>
                       <div className="hidden sm:block">
                          <div className="text-gray-600 font-medium text-sm">1.8{i}</div>
                          <div className="text-[10px] text-gray-400">夏普比率</div>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>

      </main>
    </div>
  );
}
```

1. 核心设计理念

本方案旨在平衡**“新生的活力”与“金融的稳健”。
通过从酸橙绿 (Lime)** 到 翡翠绿 (Emerald) 的色相流动，模拟植物从嫩芽到成熟的自然生长过程，传递出“牛市”、“蓬勃向上”且“收益稳健”的心理暗示。

2. 核心渐变色 (Brand Gradient)

用于页面中最关键的视觉区域（如 Header Banner、主要营销卡片）。

位置

色彩名称

Hex 代码

Tailwind 类名

视觉作用

起点 (0%)

清新酸橙 (Fresh Lime)

#84cc16

bg-lime-500

象征初春新芽、活力、启动。比荧光黄更沉稳，不刺眼。

终点 (100%)

稳重翡翠 (Deep Emerald)

#059669

bg-emerald-600

象征财富积累、成熟、信任。保证白色文字的可读性。

高光装饰

阳光金 (Warm Sunlight)

#facc15

bg-yellow-400

用于右上角的光晕叠加 (Overlay)，模拟阳光洒下的通透感。

CSS 实现代码：

background: linear-gradient(to right, #84cc16, #059669);


3. UI 交互色 (UI Colors)

用于按钮、图标、标签等功能性元素，确保界面层级分明。

A. 主色 (Primary Action)

Hex: #059669 (Emerald-600)

应用： 主要操作按钮（如“新建策略”）、选中状态的图标、重要的正向数据（如 +22.4%）。

设计意图： 使用渐变的深色端作为主交互色，能让页面看起来更干净、统一，且符合“涨=绿”的金融认知。

B. 悬停/点击态 (Hover/Active)

Hex: #047857 (Emerald-700)

应用： 主按钮的悬停状态。

C. 次要背景色 (Secondary Surface)

Hex: #ecfccb (Lime-100) 或 #ecfdf5 (Emerald-50)

应用： 标签背景、浅色卡片背景、Hover 时的弱反馈。

搭配： 配合深色文字使用（如深绿字配浅绿底）。

4. 文字系统 (Typography Colors)

确保在不同背景下的清晰阅读体验。

在深色渐变背景上 (On Gradient)

主标题： #ffffff (纯白) + text-shadow: 0 1px 2px rgba(0,0,0,0.1) (微阴影提升辨识度)。

副文本： #f7fee7 (Lime-50) 或 95% 透明度的白色。

在浅色/白色背景上 (On Light)

主标题： #1f2937 (Gray-800) - 深灰，比纯黑更柔和。

次要信息： #6b7280 (Gray-500) - 中灰。

辅助标签： #4b5563 (Slate-600) - 偏蓝灰，增加科技感。

5. 辅助功能色 (Semantic Colors)

上涨/收益 (Positive): #059669 (Emerald-600) - 统一使用品牌主色，不引入新的绿色。

下跌/亏损 (Negative): #ef4444 (Red-500) - 标准警示红。

中性/私有 (Neutral): #9ca3af (Gray-400) - 用于未公开或不活跃的状态。

6. 设计建议

光影运用： 在使用大面积渐变时，建议在右上角叠加一层 20%-30% 透明度的黄色光晕 (#facc15)，混合模式设为 overlay 或 screen，这是让画面“透气”的关键。

按钮风格： 建议使用圆角矩形（Rounded-xl），配合轻微的阴影，呼应“圆润”、“有机”的生长感，避免过于尖锐的直角。