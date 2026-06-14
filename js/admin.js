import {
  auth,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  onAuthStateChanged,
  orderBy,
  query,
  signInWithEmailAndPassword,
  signOut,
} from "./firebase-config.js";

const loginPanel = document.querySelector("#login-panel");
const adminPanel = document.querySelector("#admin-panel");
const loginForm = document.querySelector("#login-form");
const loginButton = document.querySelector("#login-button");
const loginError = document.querySelector("#login-error");
const adminUser = document.querySelector("#admin-user");
const logoutButton = document.querySelector("#logout-button");
const statusElement = document.querySelector("#admin-status");
const reportDateInput = document.querySelector("#report-date");
const reportRows = document.querySelector("#report-rows");
const breakdownElement = document.querySelector("#amount-breakdown");
const exportAllButton = document.querySelector("#export-all-csv");
const exportDailyButton = document.querySelector("#export-daily-csv");

let reports = [];

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDate(timestamp) {
  return timestamp?.toDate ? timestamp.toDate() : null;
}

function formatDateTime(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatTime(date) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function setStatus(message, type = "info") {
  statusElement.textContent = message;
  statusElement.className =
    type === "error"
      ? "md:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"
      : "md:col-span-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700";
}

function getReportsForDate(dateKey) {
  return reports.filter((report) => {
    const date = toDate(report.date);
    return date && getLocalDateKey(date) === dateKey;
  });
}

function normalizeReport(documentSnapshot) {
  const data = documentSnapshot.data();
  return {
    id: documentSnapshot.id,
    date: data.date,
    latitude: data.location?.latitude ?? "",
    longitude: data.location?.longitude ?? "",
    amount: Number(data.amount),
    memo: typeof data.memo === "string" ? data.memo : "",
  };
}

async function loadReports() {
  setStatus("データを読み込んでいます…");

  try {
    const snapshot = await getDocs(
      query(collection(db, "trash_reports"), orderBy("date", "desc")),
    );
    reports = snapshot.docs.map(normalizeReport);
    exportAllButton.disabled = false;
    exportDailyButton.disabled = false;
    setStatus(`${reports.length}件のデータを読み込みました。`);
    renderDailyReport();
  } catch (error) {
    console.error("管理者データの読み込みに失敗しました:", error);
    setStatus("データを読み込めませんでした。Firebaseの設定をご確認ください。", "error");
  }
}

function csvCell(value) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function downloadCsv(targetReports, filename) {
  const header = ["ID", "日時", "緯度", "経度", "ゴミの量", "メモ"];
  const rows = targetReports.map((report) => [
    report.id,
    formatDateTime(toDate(report.date)),
    report.latitude,
    report.longitude,
    report.amount,
    report.memo,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderDailyReport() {
  const dateKey = reportDateInput.value;
  const dailyReports = getReportsForDate(dateKey);
  const amounts = dailyReports
    .map((report) => report.amount)
    .filter((amount) => Number.isInteger(amount) && amount >= 1 && amount <= 5);
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  const counts = [0, 0, 0, 0, 0, 0];

  amounts.forEach((amount) => {
    counts[amount] += 1;
  });

  const modeCount = Math.max(...counts.slice(1));
  const mode = modeCount > 0 ? counts.findIndex((count) => count === modeCount) : "-";

  document.querySelector("#report-date-label").textContent =
    `${dateKey.replaceAll("-", "/")} の活動集計`;
  document.querySelector("#summary-count").textContent = dailyReports.length;
  document.querySelector("#summary-total").textContent = total;
  document.querySelector("#summary-average").textContent =
    amounts.length > 0 ? (total / amounts.length).toFixed(1) : "-";
  document.querySelector("#summary-mode").textContent = mode;
  document.querySelector("#generated-at").textContent = formatDateTime(new Date());

  breakdownElement.innerHTML = [1, 2, 3, 4, 5]
    .map((amount) => {
      const percentage = amounts.length > 0 ? (counts[amount] / amounts.length) * 100 : 0;
      return `
        <div class="grid grid-cols-[2rem_1fr_4rem] items-center gap-3">
          <span class="font-bold">${amount}</span>
          <div class="h-5 overflow-hidden rounded-full bg-slate-100">
            <div class="h-full rounded-full bg-green-600" style="width:${percentage}%"></div>
          </div>
          <span class="text-right text-sm">${counts[amount]}件</span>
        </div>
      `;
    })
    .join("");

  reportRows.innerHTML =
    dailyReports.length > 0
      ? dailyReports
          .map(
            (report) => `
              <tr>
                <td class="border border-slate-300 p-2">${escapeHtml(formatTime(toDate(report.date)))}</td>
                <td class="border border-slate-300 p-2">${escapeHtml(report.amount)}</td>
                <td class="border border-slate-300 p-2">${escapeHtml(report.latitude)}</td>
                <td class="border border-slate-300 p-2">${escapeHtml(report.longitude)}</td>
                <td class="border border-slate-300 p-2">${escapeHtml(report.memo || "-")}</td>
              </tr>
            `,
          )
          .join("")
      : '<tr><td colspan="5" class="border border-slate-300 p-6 text-center text-slate-500">この日の報告はありません。</td></tr>';
}

function getAuthErrorMessage(error) {
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "メールアドレスまたはパスワードが正しくありません。";
    case "auth/too-many-requests":
      return "ログイン試行回数が多すぎます。しばらく待ってからお試しください。";
    default:
      return "ログインできませんでした。Firebase Authenticationの設定をご確認ください。";
  }
}

reportDateInput.value = getLocalDateKey(new Date());

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.classList.add("hidden");
  loginButton.disabled = true;
  loginButton.textContent = "ログインしています…";

  try {
    await signInWithEmailAndPassword(
      auth,
      document.querySelector("#admin-email").value.trim(),
      document.querySelector("#admin-password").value,
    );
    loginForm.reset();
  } catch (error) {
    loginError.textContent = getAuthErrorMessage(error);
    loginError.classList.remove("hidden");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "ログイン";
  }
});

logoutButton.addEventListener("click", () => signOut(auth));
document.querySelector("#create-report").addEventListener("click", renderDailyReport);
document.querySelector("#print-report").addEventListener("click", () => window.print());
exportAllButton.addEventListener("click", () => {
  downloadCsv(reports, `greenbird-kokura-all-${getLocalDateKey(new Date())}.csv`);
});
exportDailyButton.addEventListener("click", () => {
  const dateKey = reportDateInput.value;
  downloadCsv(getReportsForDate(dateKey), `greenbird-kokura-${dateKey}.csv`);
});
reportDateInput.addEventListener("change", renderDailyReport);

onAuthStateChanged(auth, (user) => {
  verifyAdmin(user);
});

async function verifyAdmin(user) {
  if (!user) {
    loginPanel.classList.remove("hidden");
    adminPanel.classList.add("hidden");
    adminUser.textContent = "";
    reports = [];
    exportAllButton.disabled = true;
    exportDailyButton.disabled = true;
    return;
  }

  try {
    const adminSnapshot = await getDoc(doc(db, "admins", user.uid));
    if (!adminSnapshot.exists()) {
      await signOut(auth);
      loginError.textContent = "このアカウントには管理者権限がありません。";
      loginError.classList.remove("hidden");
      return;
    }

    loginPanel.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    adminUser.textContent = user.email ?? user.uid;
    loadReports();
  } catch (error) {
    console.error("管理者権限の確認に失敗しました:", error);
    await signOut(auth);
    loginError.textContent = "管理者権限を確認できませんでした。";
    loginError.classList.remove("hidden");
  }
}
