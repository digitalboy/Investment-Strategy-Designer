// This file contains JavaScript code for the UI prototype. It handles user interactions and updates the UI based on user input.

// 应用状态管理
const AppState = {
  setup: {
    symbol: "",
    startDate: "",
    endDate: "",
    capital: 0,
  },
  triggers: [],
  chartInstance: null,
};

// DOM 元素引用
const Elements = {
  welcomeState: document.getElementById("welcome-state"),
  dashboardView: document.getElementById("dashboard-view"),
  editorView: document.getElementById("editor-view"),
  discoveryView: document.getElementById("discovery-view"),
  strategyDetailModal: document.getElementById("strategy-detail-modal"),

  infoSymbol: document.getElementById("info-symbol"),
  infoDaterange: document.getElementById("info-daterange"),
  infoCapital: document.getElementById("info-capital"),

  triggersList: document.getElementById("triggers-list"),
  btnRunBacktest: document.getElementById("btn-run-backtest"),
  backtestHint: document.getElementById("backtest-hint"),

  setupDialog: document.getElementById("setup-dialog"),
  triggerDialog: document.getElementById("trigger-dialog"),
  loadingDialog: document.getElementById("loading-dialog"),
  resultsDialog: document.getElementById("results-dialog"),

  inputSymbol: document.getElementById("input-symbol"),
  inputStartDate: document.getElementById("input-start-date"),
  inputEndDate: document.getElementById("input-end-date"),
  inputCapital: document.getElementById("input-capital"),

  selectConditionType: document.getElementById("select-condition-type"),
  conditionParams: document.getElementById("condition-params"),
  selectActionType: document.getElementById("select-action-type"),
  actionParams: document.getElementById("action-params"),
  checkboxCooldown: document.getElementById("checkbox-cooldown"),
  cooldownParams: document.getElementById("cooldown-params"),
  inputCooldownDays: document.getElementById("input-cooldown-days"),
};

// 配置定义 (保持逻辑不变，优化渲染 HTML)
const ConditionConfigs = {
  drawdown: {
    name: "价格从高点回撤",
    params: [
      {
        label: "下跌超过",
        type: "number",
        id: "threshold",
        suffix: "%",
        default: 15,
      },
      {
        label: "从过去",
        type: "number",
        id: "period",
        default: 60,
        suffix: "日高点",
      },
    ],
    getDescription: (params) =>
      `价格从 <span class="font-bold text-indigo-600">${params.period}日</span> 高点下跌超过 <span class="font-bold text-indigo-600">${params.threshold}%</span>`,
  },
  "price-streak": {
    name: "价格连续涨跌",
    params: [
      {
        label: "连续",
        type: "select",
        id: "direction",
        options: [
          { value: "up", text: "上涨" },
          { value: "down", text: "下跌" },
        ],
        default: "down",
      },
      { label: "", type: "number", id: "days", default: 3, suffix: "天" },
    ],
    getDescription: (params) =>
      `价格连续 <span class="font-bold text-indigo-600">${
        params.direction === "up" ? "上涨" : "下跌"
      } ${params.days}天</span>`,
  },
  "new-high-low": {
    name: "价格创下新高/新低",
    params: [
      {
        label: "创下过去",
        type: "number",
        id: "period",
        default: 52,
        suffix: "周",
      },
      {
        label: "",
        type: "select",
        id: "type",
        options: [
          { value: "high", text: "新高" },
          { value: "low", text: "新低" },
        ],
        default: "low",
      },
    ],
    getDescription: (params) =>
      `价格创下 <span class="font-bold text-indigo-600">${params.period}周${
        params.type === "high" ? "新高" : "新低"
      }</span>`,
  },
  "period-return": {
    name: "周期内涨跌幅",
    params: [
      {
        label: "过去",
        type: "number",
        id: "period",
        default: 20,
        suffix: "日",
      },
      {
        label: "",
        type: "select",
        id: "direction",
        options: [
          { value: "up", text: "上涨" },
          { value: "down", text: "下跌" },
        ],
        default: "down",
      },
      {
        label: "超过",
        type: "number",
        id: "threshold",
        suffix: "%",
        default: 10,
      },
    ],
    getDescription: (params) =>
      `过去 ${params.period} 日 <span class="font-bold text-indigo-600">${
        params.direction === "up" ? "上涨" : "下跌"
      }超过 ${params.threshold}%</span>`,
  },
  rsi: {
    name: "RSI 指标",
    params: [
      {
        label: "RSI",
        type: "number",
        id: "period",
        default: 14,
        suffix: "周期",
      },
      {
        label: "",
        type: "select",
        id: "comparison",
        options: [
          { value: "below", text: "低于" },
          { value: "above", text: "高于" },
        ],
        default: "below",
      },
      { label: "数值", type: "number", id: "threshold", default: 30 },
    ],
    getDescription: (params) =>
      `${params.period}周期 RSI <span class="font-bold text-indigo-600">${
        params.comparison === "below" ? "低于" : "高于"
      } ${params.threshold}</span>`,
  },
};

const ActionConfigs = {
  buy: {
    name: "买入",
    params: [
      {
        label: "方式",
        type: "select",
        id: "method",
        options: [
          { value: "fixed", text: "固定金额" },
          { value: "percent-cash", text: "可用现金%" },
          { value: "percent-total", text: "账户总值%" },
        ],
        default: "fixed",
      },
      { label: "数值", type: "number", id: "amount", default: 1000 },
    ],
    getDescription: (params) => {
      const amount = `<span class="font-bold text-emerald-600">${params.amount}</span>`;
      if (params.method === "fixed") return `买入 ${amount} 元`;
      if (params.method === "percent-cash") return `买入可用现金的 ${amount}%`;
      return `买入账户总值的 ${amount}%`;
    },
  },
  sell: {
    name: "卖出",
    params: [
      {
        label: "方式",
        type: "select",
        id: "method",
        options: [
          { value: "percent-position", text: "持仓%" },
          { value: "all", text: "全部持仓" },
        ],
        default: "percent-position",
      },
      {
        label: "比例",
        type: "number",
        id: "amount",
        default: 10,
        conditional: "method:percent-position",
      },
    ],
    getDescription: (params) => {
      if (params.method === "all")
        return '<span class="font-bold text-red-600">卖出全部持仓</span>';
      return `卖出持仓的 <span class="font-bold text-red-600">${params.amount}%</span>`;
    },
  },
};

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  // 设置当前日期
  document.getElementById("report-date").textContent =
    new Date().toLocaleDateString();
});

function initEventListeners() {
  // 导航
  document
    .getElementById("btn-create-strategy")
    .addEventListener("click", () => toggleModal(Elements.setupDialog, true));
  document
    .getElementById("btn-cancel-setup")
    .addEventListener("click", () => toggleModal(Elements.setupDialog, false));
  document
    .getElementById("btn-confirm-setup")
    .addEventListener("click", confirmSetup);
  document.getElementById("btn-reset").addEventListener("click", resetStrategy);

  // 触发器
  document
    .getElementById("btn-add-trigger")
    .addEventListener("click", openTriggerDialog);
  document
    .getElementById("btn-cancel-trigger")
    .addEventListener("click", () =>
      toggleModal(Elements.triggerDialog, false)
    );
  document
    .getElementById("btn-add-trigger-confirm")
    .addEventListener("click", confirmTrigger);

  // 动态表单
  Elements.selectConditionType.addEventListener(
    "change",
    renderConditionParams
  );
  Elements.selectActionType.addEventListener("change", renderActionParams);
  Elements.checkboxCooldown.addEventListener("change", (e) => {
    const params = Elements.cooldownParams;
    if (e.target.checked) {
      params.classList.remove("hidden");
    } else {
      params.classList.add("hidden");
    }
  });

  // 回测
  Elements.btnRunBacktest.addEventListener("click", runBacktest);
  document
    .getElementById("btn-close-results")
    .addEventListener("click", () =>
      toggleModal(Elements.resultsDialog, false)
    );
}

// --- New Features for V2.1 ---

function showSection(sectionId) {
  // Hide all main views
  Elements.welcomeState.classList.add("hidden");
  Elements.dashboardView.classList.add("hidden");
  Elements.editorView.classList.add("hidden");
  Elements.discoveryView.classList.add("hidden");

  // Reset nav buttons
  const navDiscovery = document.getElementById("nav-discovery");
  const navDashboard = document.getElementById("nav-dashboard");

  navDiscovery.classList.remove("text-indigo-600");
  navDiscovery.classList.add("text-slate-500");
  navDashboard.classList.remove("text-indigo-600");
  navDashboard.classList.add("text-slate-500");

  // Show selected view
  if (sectionId === "dashboard") {
    navDashboard.classList.add("text-indigo-600");
    navDashboard.classList.remove("text-slate-500");
    Elements.dashboardView.classList.remove("hidden");
  } else if (sectionId === "editor") {
    navDashboard.classList.add("text-indigo-600");
    navDashboard.classList.remove("text-slate-500");
    Elements.editorView.classList.remove("hidden");
  } else if (sectionId === "discovery") {
    navDiscovery.classList.add("text-indigo-600");
    navDiscovery.classList.remove("text-slate-500");
    Elements.discoveryView.classList.remove("hidden");
  }
}

function createNewStrategy() {
  // Reset editor state
  document.getElementById("strategy-name-input").value = "未命名策略";
  document
    .getElementById("public-toggle")
    .setAttribute("aria-checked", "false");
  const btn = document.getElementById("public-toggle");
  const knob = btn.querySelector("span");
  btn.classList.add("bg-slate-200");
  btn.classList.remove("bg-indigo-600");
  knob.classList.remove("translate-x-5");
  knob.classList.add("translate-x-0");

  AppState.triggers = [];
  renderTriggersList();

  showSection("editor");
}

function editStrategy(id) {
  // Mock load strategy data
  const strategyNames = {
    s1: "稳健定投 Plus",
    s2: "纳指激进策略",
    s3: "标普500 均线策略",
    s4: "全天候配置",
  };

  document.getElementById("strategy-name-input").value =
    strategyNames[id] || "我的策略";

  // Mock triggers for demo
  if (id === "s1") {
    AppState.triggers = [
      {
        id: 1,
        type: "drawdown",
        descHtml:
          '价格从 <span class="font-bold text-indigo-600">20日高点</span> 下跌超过 <span class="font-bold text-indigo-600">5%</span>',
      },
    ];
  } else {
    AppState.triggers = [];
  }
  renderTriggersList();

  showSection("editor");
}
function openStrategyDetail(id) {
  Elements.strategyDetailModal.classList.remove("hidden");
  document.body.style.overflow = "hidden"; // Prevent background scrolling
}

function closeStrategyDetail() {
  Elements.strategyDetailModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function togglePublicSwitch() {
  const btn = document.getElementById("public-toggle");
  const isChecked = btn.getAttribute("aria-checked") === "true";
  const newState = !isChecked;

  btn.setAttribute("aria-checked", newState);

  const knob = btn.querySelector("span");
  if (newState) {
    btn.classList.remove("bg-slate-200");
    btn.classList.add("bg-indigo-600");
    knob.classList.add("translate-x-5");
    knob.classList.remove("translate-x-0");
  } else {
    btn.classList.add("bg-slate-200");
    btn.classList.remove("bg-indigo-600");
    knob.classList.remove("translate-x-5");
    knob.classList.add("translate-x-0");
  }
}

function saveStrategy() {
  const name = document.getElementById("strategy-name-input").value;
  const isPublic =
    document.getElementById("public-toggle").getAttribute("aria-checked") ===
    "true";
  const triggerCount = AppState.triggers.length;

  // Mock save
  const btn = document.querySelector('button[onclick="saveStrategy()"]');
  const originalText = btn.innerHTML;

  btn.innerHTML =
    '<i class="fa-solid fa-circle-check animate-bounce"></i> 已保存';
  btn.classList.remove("bg-indigo-600", "hover:bg-indigo-500");
  btn.classList.add("bg-green-600", "hover:bg-green-500");

  setTimeout(() => {
    btn.innerHTML = originalText;
    btn.classList.add("bg-indigo-600", "hover:bg-indigo-500");
    btn.classList.remove("bg-green-600", "hover:bg-green-500");
    alert(
      `策略 "${name}" 已保存！\n状态: ${
        isPublic ? "公开" : "私有"
      }\n包含 ${triggerCount} 个规则`
    );
  }, 1500);
}

// Expose functions to global scope for HTML onclick handlers
window.showSection = showSection;
window.openStrategyDetail = openStrategyDetail;
window.closeStrategyDetail = closeStrategyDetail;
window.togglePublicSwitch = togglePublicSwitch;
window.saveStrategy = saveStrategy;
window.createNewStrategy = createNewStrategy;
window.editStrategy = editStrategy;

function toggleModal(modal, show) {
  if (show) {
    modal.classList.remove("hidden");
    // 简单的淡入动画
    modal
      .querySelector('div[class*="transform"]')
      ?.classList.add("scale-100", "opacity-100");
  } else {
    modal.classList.add("hidden");
  }
}

function confirmSetup() {
  AppState.setup = {
    symbol: Elements.inputSymbol.value.toUpperCase(),
    startDate: Elements.inputStartDate.value,
    endDate: Elements.inputEndDate.value,
    capital: parseFloat(Elements.inputCapital.value),
  };

  Elements.infoSymbol.textContent = AppState.setup.symbol;
  Elements.infoDaterange.textContent = `${AppState.setup.startDate} 至 ${AppState.setup.endDate}`;
  Elements.infoCapital.textContent = `$${AppState.setup.capital.toLocaleString()}`;

  Elements.welcomeState.classList.add("hidden");
  Elements.dashboardView.classList.remove("hidden");

  toggleModal(Elements.setupDialog, false);
}

function resetStrategy() {
  if (confirm("确定要重置吗？所有规则将被清空。")) {
    AppState.triggers = [];
    renderTriggersList();
    Elements.dashboardView.classList.add("hidden");
    Elements.welcomeState.classList.remove("hidden");
  }
}

function openTriggerDialog() {
  toggleModal(Elements.triggerDialog, true);
  renderConditionParams();
  renderActionParams();
}

function renderConditionParams() {
  const type = Elements.selectConditionType.value;
  const config = ConditionConfigs[type];
  if (!config) return;

  let html = "";
  config.params.forEach((param) => {
    html += `<div class="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-200">`;
    if (param.label)
      html += `<span class="text-xs font-medium text-slate-500 whitespace-nowrap">${param.label}</span>`;

    if (param.type === "number") {
      html += `<input type="number" data-param="${param.id}" value="${param.default}" class="w-16 text-sm border-0 bg-transparent border-b border-slate-300 focus:ring-0 focus:border-indigo-600 p-0 text-center font-bold text-slate-700">`;
    } else if (param.type === "select") {
      html += `<select data-param="${
        param.id
      }" class="text-sm border-0 bg-transparent border-b border-slate-300 focus:ring-0 focus:border-indigo-600 p-0 pr-6 font-bold text-slate-700">
                        ${param.options
                          .map(
                            (opt) =>
                              `<option value="${opt.value}" ${
                                opt.value === param.default ? "selected" : ""
                              }>${opt.text}</option>`
                          )
                          .join("")}
                     </select>`;
    }
    if (param.suffix)
      html += `<span class="text-xs text-slate-500">${param.suffix}</span>`;
    html += `</div>`;
  });
  Elements.conditionParams.innerHTML = html;
}

function renderActionParams() {
  const type = Elements.selectActionType.value;
  const config = ActionConfigs[type];
  if (!config) return;

  let html = "";
  config.params.forEach((param) => {
    // 简单的条件显示逻辑
    if (param.conditional) {
      const [depId, depVal] = param.conditional.split(":");
      // 这里简化处理，实际应监听变化
    }

    html += `<div class="mb-2">`;
    if (param.label)
      html += `<label class="block text-xs font-medium text-slate-500 mb-1">${param.label}</label>`;

    if (param.type === "number") {
      html += `<input type="number" data-param="${param.id}" value="${param.default}" class="block w-full rounded-md border-0 py-1.5 px-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">`;
    } else if (param.type === "select") {
      html += `<select data-param="${
        param.id
      }" class="block w-full rounded-md border-0 py-1.5 px-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6">
                        ${param.options
                          .map(
                            (opt) =>
                              `<option value="${opt.value}" ${
                                opt.value === param.default ? "selected" : ""
                              }>${opt.text}</option>`
                          )
                          .join("")}
                     </select>`;
    }
    html += `</div>`;
  });
  Elements.actionParams.innerHTML = html;
}

function confirmTrigger() {
  const conditionType = Elements.selectConditionType.value;
  const actionType = Elements.selectActionType.value;

  const conditionParams = {};
  Elements.conditionParams
    .querySelectorAll("[data-param]")
    .forEach((input) => (conditionParams[input.dataset.param] = input.value));

  const actionParams = {};
  Elements.actionParams
    .querySelectorAll("[data-param]")
    .forEach((input) => (actionParams[input.dataset.param] = input.value));

  const cooldown = Elements.checkboxCooldown.checked
    ? parseInt(Elements.inputCooldownDays.value)
    : null;

  const trigger = {
    id: Date.now(),
    conditionType,
    conditionParams,
    actionType,
    actionParams,
    cooldown,
    descHtml: `
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-700">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">IF</span>
                <span>${ConditionConfigs[conditionType].getDescription(
                  conditionParams
                )}</span>
                <i class="fa-solid fa-arrow-right text-slate-300 mx-2 hidden sm:block"></i>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  actionType === "buy"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }">THEN</span>
                <span>${ActionConfigs[actionType].getDescription(
                  actionParams
                )}</span>
                ${
                  cooldown
                    ? `<span class="ml-auto text-xs text-slate-400 flex items-center gap-1"><i class="fa-regular fa-clock"></i> 冷却 ${cooldown} 天</span>`
                    : ""
                }
            </div>
        `,
  };

  AppState.triggers.push(trigger);
  renderTriggersList();
  toggleModal(Elements.triggerDialog, false);
}

function renderTriggersList() {
  const badge = document.getElementById("trigger-count-badge");
  if (badge) {
    badge.textContent = AppState.triggers.length;
  }

  if (AppState.triggers.length === 0) {
    Elements.triggersList.innerHTML = `
            <div class="empty-state border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <i class="fa-solid fa-layer-group text-slate-300 text-2xl"></i>
                </div>
                <h3 class="text-slate-900 font-medium">暂无策略规则</h3>
                <p class="text-slate-500 text-sm mt-1 max-w-xs">点击右上角的“添加规则”按钮，开始构建您的第一个交易信号。</p>
            </div>`;
    Elements.btnRunBacktest.disabled = true;
    Elements.backtestHint.classList.remove("hidden");
  } else {
    let html = "";
    AppState.triggers.forEach((trigger, index) => {
      html += `
                <div class="group bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all hover:border-indigo-200 relative">
                    <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="deleteTrigger(${
                          trigger.id
                        })" class="text-slate-400 hover:text-red-500 transition-colors">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                    <div class="flex items-center gap-3 mb-2">
                        <div class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">${
                          index + 1
                        }</div>
                        <div class="h-px flex-1 bg-slate-100"></div>
                    </div>
                    ${trigger.descHtml}
                </div>
            `;
    });
    Elements.triggersList.innerHTML = html;
    Elements.btnRunBacktest.disabled = false;
    Elements.backtestHint.classList.add("hidden");
  }
}

function deleteTrigger(id) {
  AppState.triggers = AppState.triggers.filter((t) => t.id !== id);
  renderTriggersList();
}

function runBacktest() {
  toggleModal(Elements.loadingDialog, true);

  // 模拟延迟
  setTimeout(() => {
    toggleModal(Elements.loadingDialog, false);
    toggleModal(Elements.resultsDialog, true);
    renderChart();
  }, 2000);
}

function renderChart() {
  const ctx = document.getElementById("equityChart").getContext("2d");

  // 销毁旧图表
  if (AppState.chartInstance) {
    AppState.chartInstance.destroy();
  }

  // 生成模拟数据
  const labels = [];
  const strategyData = [];
  const benchmarkData = [];
  let strategyVal = 10000;
  let benchmarkVal = 10000;

  for (let i = 0; i < 100; i++) {
    labels.push(`Day ${i}`);
    // 随机漫步
    strategyVal *= 1 + (Math.random() - 0.45) * 0.02;
    benchmarkVal *= 1 + (Math.random() - 0.48) * 0.02;
    strategyData.push(strategyVal);
    benchmarkData.push(benchmarkVal);
  }

  AppState.chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "我的策略",
          data: strategyData,
          borderColor: "#4f46e5", // Indigo 600
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
        {
          label: "买入并持有",
          data: benchmarkData,
          borderColor: "#94a3b8", // Slate 400
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleColor: "#f8fafc",
          bodyColor: "#f8fafc",
          borderColor: "#334155",
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 10 },
        },
        y: {
          grid: { color: "#f1f5f9" },
          ticks: {
            callback: function (value) {
              return "$" + value.toLocaleString();
            },
          },
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    },
  });
}

window.deleteTrigger = deleteTrigger;
