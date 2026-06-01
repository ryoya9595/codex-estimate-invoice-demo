const STORAGE_KEY = "codex-estimate-invoice-demo-v2";
const CLIENTS_KEY = "codex-estimate-invoice-clients-v1";
const form = document.querySelector("#invoiceForm");
const estimateDoc = document.querySelector("#estimateDoc");
const invoiceDoc = document.querySelector("#invoiceDoc");
const sampleButton = document.querySelector("#sampleButton");
const copyButton = document.querySelector("#copyButton");
const printButton = document.querySelector("#printButton");
const addLineButton = document.querySelector("#addLineButton");
const lineEditor = document.querySelector("#lineEditor");
const tabButtons = document.querySelectorAll(".tab");
const clientTabs = document.querySelector("#clientTabs");
const saveClientButton = document.querySelector("#saveClientButton");
const newClientButton = document.querySelector("#newClientButton");

let clients = [];
let activeClientId = null;

let lines = [
  { name: "競合調査", qty: 1, price: 80000 },
  { name: "LP構成改善", qty: 1, price: 120000 },
  { name: "AI導線設計", qty: 1, price: 70000 },
  { name: "改善レポート作成", qty: 1, price: 30000 },
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function yen(value) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(Math.round(value || 0));
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function readForm() {
  return Object.fromEntries(new FormData(form).entries());
}

function saveState() {
  const data = readForm();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, lines }));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    Object.entries(parsed.data || {}).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value;
    });
    if (Array.isArray(parsed.lines) && parsed.lines.length) lines = parsed.lines;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function totals(data) {
  const subtotal = lines
    .filter((line) => !line.excluded)
    .reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0), 0);
  const tax = subtotal * Number(data.tax || 0);
  const withholding = subtotal * Number(data.withholding || 0);
  const total = subtotal + tax - withholding;
  return { subtotal, tax, withholding, total };
}

function renderLineEditor() {
  lineEditor.innerHTML = lines
    .map(
      (line, index) => `
        <div class="line-row${line.excluded ? " is-excluded" : ""}">
          <input aria-label="項目名" data-index="${index}" data-field="name" value="${escapeHtml(line.name)}" />
          <input aria-label="数量" data-index="${index}" data-field="qty" type="number" min="0" value="${escapeHtml(line.qty)}" />
          <input aria-label="単価" data-index="${index}" data-field="price" type="number" min="0" value="${escapeHtml(line.price)}" />
          <div class="line-controls">
            <button class="toggle-button" type="button" data-toggle="${index}">${line.excluded ? "未反映" : "反映中"}</button>
            <button class="icon-button" type="button" data-remove="${index}">削除</button>
          </div>
        </div>
      `,
    )
    .join("");
}

function renderDocument(type, data, number) {
  const total = totals(data);
  const amountLabel = type.includes("請求") ? "ご請求金額" : "お見積金額";
  return `
    <div class="doc-head">
      <div>
        <div class="doc-type">${escapeHtml(type)}</div>
        <div class="doc-number">No. ${escapeHtml(number)}</div>
      </div>
      <div class="issuer-block">
        <strong>${escapeHtml(data.issuer)}</strong>
        <span>${nl2br(data.issuerInfo)}</span>
        ${data.regNumber ? `<span>登録番号: ${escapeHtml(data.regNumber)}</span>` : ""}
        ${data.tel ? `<span>TEL: ${escapeHtml(data.tel)}</span>` : ""}
        <span>発行日: ${escapeHtml(data.issueDate)}</span>
      </div>
    </div>
    <div class="doc-client">${escapeHtml(data.client)} 御中</div>
    <div class="amount-due">
      <span class="amount-label">${amountLabel}（税込）</span>
      <strong>${yen(total.total)}</strong>
    </div>
    <table class="doc-table">
      <thead><tr><th>項目</th><th>数量</th><th>単価</th><th>金額</th></tr></thead>
      <tbody>
        ${lines
          .filter((line) => !line.excluded)
          .map((line) => {
            const amount = Number(line.qty || 0) * Number(line.price || 0);
            return `<tr><td>${escapeHtml(line.name)}</td><td>${escapeHtml(line.qty)}</td><td>${yen(line.price)}</td><td>${yen(amount)}</td></tr>`;
          })
          .join("")}
      </tbody>
    </table>
    <div class="summary">
      <div><span>小計</span><strong>${yen(total.subtotal)}</strong></div>
      <div><span>消費税</span><strong>${yen(total.tax)}</strong></div>
      <div><span>源泉徴収</span><strong>-${yen(total.withholding)}</strong></div>
      <div class="grand"><span>税込合計</span><strong>${yen(total.total)}</strong></div>
    </div>
    <div class="note-grid">
      <div>
        <strong>振込先</strong>
        <p class="pay-due">振込期日：${escapeHtml(data.dueDate)}</p>
        <p>${nl2br(data.bank)}</p>
      </div>
      <div><strong>備考</strong><p>${nl2br(data.notes)}</p></div>
    </div>
  `;
}

function generateDocuments() {
  const data = readForm();
  estimateDoc.innerHTML = renderDocument("御見積書", data, "EST-2026-0601");
  invoiceDoc.innerHTML = renderDocument("御請求書", data, "INV-2026-0601");
  saveState();
}

function copySummary() {
  const data = readForm();
  const total = totals(data);
  const text = [
    `${data.client} 御中`,
    "",
    ...lines.filter((line) => !line.excluded).map((line) => `- ${line.name}: ${line.qty} x ${yen(line.price)}`),
    "",
    `ご請求金額: ${yen(total.total)}`,
    `振込期日: ${data.dueDate}`,
  ].join("\n");
  navigator.clipboard?.writeText(text);
}

function flashButton(btn, text) {
  if (!btn) return;
  if (!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.textContent = text;
  btn.classList.add("flashed");
  setTimeout(() => {
    btn.textContent = btn.dataset.label;
    btn.classList.remove("flashed");
  }, 1600);
}

// ===== 取引先レジストリ =====
function loadClients() {
  try {
    const saved = JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]");
    if (Array.isArray(saved)) clients = saved;
  } catch {
    clients = [];
  }
}

function persistClients() {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

function renderClientTabs() {
  if (!clients.length) {
    clientTabs.innerHTML = `<span class="client-empty">保存した取引先がここに並びます</span>`;
    return;
  }
  clientTabs.innerHTML = clients
    .map(
      (c) => `
      <span class="client-tab${c.id === activeClientId ? " is-active" : ""}">
        <button type="button" class="client-pick" data-pick="${escapeHtml(c.id)}">${escapeHtml(c.name || "（無名）")}</button>
        <button type="button" class="client-del" data-del="${escapeHtml(c.id)}" aria-label="削除">×</button>
      </span>`,
    )
    .join("");
}

function saveCurrentClient() {
  const data = readForm();
  const name = String(data.client || "").trim();
  if (!name) {
    flashButton(saveClientButton, "会社名を入力");
    return;
  }
  // 会社名が一致すれば上書き、なければ新しい取引先として追加
  const byName = clients.findIndex((c) => c.name === name);
  let entry;
  if (byName >= 0) {
    entry = { id: clients[byName].id, name, data, lines: lines.map((l) => ({ ...l })) };
    clients[byName] = entry;
  } else {
    entry = { id: "c" + Date.now(), name, data, lines: lines.map((l) => ({ ...l })) };
    clients.push(entry);
  }
  activeClientId = entry.id;
  persistClients();
  renderClientTabs();
  flashButton(saveClientButton, "保存しました ✓");
}

function selectClient(id) {
  const c = clients.find((x) => x.id === id);
  if (!c) return;
  activeClientId = id;
  Object.entries(c.data || {}).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  if (Array.isArray(c.lines) && c.lines.length) lines = c.lines.map((l) => ({ ...l }));
  renderLineEditor();
  generateDocuments();
  renderClientTabs();
}

function deleteClient(id) {
  clients = clients.filter((c) => c.id !== id);
  if (activeClientId === id) activeClientId = null;
  persistClients();
  renderClientTabs();
}

function newClient() {
  activeClientId = null;
  form.client.value = "";
  generateDocuments();
  renderClientTabs();
  form.client.focus();
}

form.issueDate.value = new Date().toISOString().slice(0, 10);
form.dueDate.value = addDays(30);
loadState();
loadClients();
renderLineEditor();
generateDocuments();
renderClientTabs();

form.addEventListener("input", generateDocuments);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateDocuments();
});

saveClientButton.addEventListener("click", saveCurrentClient);
newClientButton.addEventListener("click", newClient);
clientTabs.addEventListener("click", (event) => {
  const del = event.target.dataset.del;
  const pick = event.target.dataset.pick;
  if (del) deleteClient(del);
  else if (pick) selectClient(pick);
});

lineEditor.addEventListener("input", (event) => {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;
  if (!Number.isNaN(index) && field) {
    lines[index][field] = field === "name" ? event.target.value : Number(event.target.value);
    generateDocuments();
  }
});

lineEditor.addEventListener("click", (event) => {
  const removeIndex = Number(event.target.dataset.remove);
  const toggleIndex = Number(event.target.dataset.toggle);
  if (event.target.dataset.remove !== undefined && !Number.isNaN(removeIndex)) {
    lines.splice(removeIndex, 1);
    renderLineEditor();
    generateDocuments();
  } else if (event.target.dataset.toggle !== undefined && !Number.isNaN(toggleIndex)) {
    lines[toggleIndex].excluded = !lines[toggleIndex].excluded;
    renderLineEditor();
    generateDocuments();
  }
});

addLineButton.addEventListener("click", () => {
  lines.push({ name: "新しい作業", qty: 1, price: 50000 });
  renderLineEditor();
  generateDocuments();
});

sampleButton.addEventListener("click", () => {
  form.client.value = "株式会社アベプラニング";
  lines = [
    { name: "競合YouTube分析", qty: 1, price: 120000 },
    { name: "動画構成改善", qty: 1, price: 150000 },
    { name: "LINE特典設計", qty: 1, price: 130000 },
    { name: "撮影用資料作成", qty: 1, price: 100000 },
  ];
  renderLineEditor();
  generateDocuments();
});

copyButton.addEventListener("click", () => {
  copySummary();
  flashButton(copyButton, "コピーしました ✓");
});
printButton.addEventListener("click", () => window.print());

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((tab) => tab.classList.toggle("is-active", tab === button));
    const target = button.dataset.doc;
    estimateDoc.classList.toggle("is-hidden", target !== "estimate");
    invoiceDoc.classList.toggle("is-hidden", target !== "invoice");
  });
});
