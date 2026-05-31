const STORAGE_KEY = "codex-estimate-invoice-demo-v2";
const status = document.querySelector("#status");
const form = document.querySelector("#invoiceForm");
const estimateDoc = document.querySelector("#estimateDoc");
const invoiceDoc = document.querySelector("#invoiceDoc");
const sampleButton = document.querySelector("#sampleButton");
const copyButton = document.querySelector("#copyButton");
const printButton = document.querySelector("#printButton");
const addLineButton = document.querySelector("#addLineButton");
const clearDataButton = document.querySelector("#clearDataButton");
const lineEditor = document.querySelector("#lineEditor");
const tabButtons = document.querySelectorAll(".tab");

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
  const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.price || 0), 0);
  const tax = subtotal * Number(data.tax || 0);
  const withholding = subtotal * Number(data.withholding || 0);
  const total = subtotal + tax - withholding;
  return { subtotal, tax, withholding, total };
}

function renderLineEditor() {
  lineEditor.innerHTML = lines
    .map(
      (line, index) => `
        <div class="line-row">
          <input aria-label="項目名" data-index="${index}" data-field="name" value="${escapeHtml(line.name)}" />
          <input aria-label="数量" data-index="${index}" data-field="qty" type="number" min="0" value="${escapeHtml(line.qty)}" />
          <input aria-label="単価" data-index="${index}" data-field="price" type="number" min="0" value="${escapeHtml(line.price)}" />
          <button class="icon-button" type="button" data-remove="${index}">削除</button>
        </div>
      `,
    )
    .join("");
}

function renderDocument(type, data, number) {
  const total = totals(data);
  return `
    <div class="doc-head">
      <div>
        <div class="doc-type">${escapeHtml(type)}</div>
        <div class="doc-number">No. ${escapeHtml(number)}</div>
      </div>
      <div class="doc-meta">
        発行日: ${escapeHtml(data.issueDate)}<br />
        支払期限: ${escapeHtml(data.dueDate)}
      </div>
    </div>
    <div class="issuer-block">
      <strong>${escapeHtml(data.issuer)}</strong>
      <span>${nl2br(data.issuerInfo)}</span>
    </div>
    <div class="doc-client">${escapeHtml(data.client)} 御中</div>
    <p class="doc-meta">${escapeHtml(data.project)}</p>
    <table class="doc-table">
      <thead><tr><th>項目</th><th>数量</th><th>単価</th><th>金額</th></tr></thead>
      <tbody>
        ${lines
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
      <div><strong>振込先</strong><p>${nl2br(data.bank)}</p></div>
      <div><strong>備考</strong><p>${nl2br(data.notes)}</p></div>
    </div>
  `;
}

function generateDocuments() {
  const data = readForm();
  estimateDoc.innerHTML = renderDocument("御見積書", data, "EST-2026-0601");
  invoiceDoc.innerHTML = renderDocument("御請求書", data, "INV-2026-0601");
  status.textContent = "SAVED";
  saveState();
}

function copySummary() {
  const data = readForm();
  const total = totals(data);
  const text = [
    `${data.client} 御中`,
    data.project,
    "",
    ...lines.map((line) => `- ${line.name}: ${line.qty} x ${yen(line.price)}`),
    "",
    `合計: ${yen(total.total)}`,
    `支払期限: ${data.dueDate}`,
  ].join("\n");
  navigator.clipboard?.writeText(text);
  status.textContent = "COPIED";
}

form.issueDate.value = new Date().toISOString().slice(0, 10);
form.dueDate.value = addDays(30);
loadState();
renderLineEditor();
generateDocuments();

form.addEventListener("input", generateDocuments);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateDocuments();
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
  const index = Number(event.target.dataset.remove);
  if (!Number.isNaN(index)) {
    lines.splice(index, 1);
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
  form.project.value = "YouTube導線改善コンサルティング";
  lines = [
    { name: "競合YouTube分析", qty: 1, price: 120000 },
    { name: "動画構成改善", qty: 1, price: 150000 },
    { name: "LINE特典設計", qty: 1, price: 130000 },
    { name: "撮影用資料作成", qty: 1, price: 100000 },
  ];
  renderLineEditor();
  generateDocuments();
});

copyButton.addEventListener("click", copySummary);
printButton.addEventListener("click", () => window.print());
clearDataButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  status.textContent = "CLEARED";
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((tab) => tab.classList.toggle("is-active", tab === button));
    const target = button.dataset.doc;
    estimateDoc.classList.toggle("is-hidden", target !== "estimate");
    invoiceDoc.classList.toggle("is-hidden", target !== "invoice");
  });
});
