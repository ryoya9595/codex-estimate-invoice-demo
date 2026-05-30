const status = document.querySelector("#status");
const form = document.querySelector("#invoiceForm");
const estimateDoc = document.querySelector("#estimateDoc");
const invoiceDoc = document.querySelector("#invoiceDoc");
const sampleButton = document.querySelector("#sampleButton");

function yen(value) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(value);
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function renderDocument(type, data, number) {
  const amount = Number(data.amount || 0);
  const tax = Math.round(amount * Number(data.tax || 0));
  const total = amount + tax;
  const items = String(data.items || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return `
    <div class="doc-head">
      <div>
        <div class="doc-type">${type}</div>
        <div class="doc-number">No. ${number}</div>
      </div>
      <div class="doc-meta">
        発行日: ${data.issueDate}<br />
        支払期限: ${data.dueDate}
      </div>
    </div>
    <div class="doc-client">${data.client} 御中</div>
    <p class="doc-meta">${data.project}</p>
    <div class="doc-items">
      ${items
        .map(
          (item, index) => `
            <div class="doc-item">
              <span>${index + 1}. ${item}</span>
              <strong>${index === 0 ? yen(amount) : "-"}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
    <div class="doc-total-row">
      <div>
        <div class="mini-label">税込合計</div>
        <div class="doc-meta">税額 ${yen(tax)}</div>
      </div>
      <div class="doc-total">${yen(total)}</div>
    </div>
  `;
}

function generateDocuments() {
  const data = Object.fromEntries(new FormData(form).entries());
  estimateDoc.innerHTML = renderDocument("御見積書", data, "EST-2026-0601");
  invoiceDoc.innerHTML = renderDocument("御請求書", data, "INV-2026-0601");
  status.textContent = "GENERATED";
}

form.issueDate.value = new Date().toISOString().slice(0, 10);
form.dueDate.value = addDays(30);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateDocuments();
});

sampleButton.addEventListener("click", () => {
  form.client.value = "株式会社アベプラニング";
  form.project.value = "YouTube導線改善コンサルティング";
  form.amount.value = "500000";
  form.items.value = "競合YouTube分析\n動画構成改善\nLINE特典設計\n撮影用資料作成";
  generateDocuments();
});

generateDocuments();
