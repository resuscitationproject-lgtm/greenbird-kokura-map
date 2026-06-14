import {
  collection,
  db,
  getDocs,
  isFirebaseConfigured,
  orderBy,
  query,
} from "./firebase-config.js";

const KOKURA_STATION = [33.887, 130.881];
const statusElement = document.querySelector("#map-status");

const map = L.map("map", {
  zoomControl: true,
}).setView(KOKURA_STATION, 16);

function refreshMapSize() {
  window.requestAnimationFrame(() => {
    map.invalidateSize({ pan: false });
  });
}

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

window.addEventListener("resize", refreshMapSize);
window.addEventListener("orientationchange", refreshMapSize);
window.addEventListener("pageshow", refreshMapSize);
refreshMapSize();

function setStatus(message, type = "info") {
  statusElement.textContent = message;
  statusElement.classList.toggle("text-red-700", type === "error");
  statusElement.classList.toggle("text-slate-700", type !== "error");
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) {
    return "日時不明";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp.toDate());
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

async function renderReports() {
  if (!isFirebaseConfigured) {
    setStatus("Firebaseの設定値を入力すると、報告データが表示されます。", "error");
    return;
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, "trash_reports"), orderBy("date", "desc")),
    );
    const heatPoints = [];

    snapshot.forEach((documentSnapshot) => {
      const report = documentSnapshot.data();
      const latitude = report.location?.latitude;
      const longitude = report.location?.longitude;
      const amount = Number(report.amount);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isInteger(amount) ||
        amount < 1 ||
        amount > 5
      ) {
        return;
      }

      heatPoints.push([latitude, longitude, amount / 5]);

      const memo = typeof report.memo === "string" ? report.memo.trim() : "";
      const popup = [
        `<strong>${escapeHtml(formatDate(report.date))}</strong>`,
        `ゴミの量：${amount} / 5`,
        memo ? `メモ：${escapeHtml(memo)}` : "",
      ]
        .filter(Boolean)
        .join("<br>");

      L.circleMarker([latitude, longitude], {
        radius: 7,
        color: "#166534",
        weight: 1,
        fillColor: "#22c55e",
        fillOpacity: 0.12,
      })
        .bindPopup(popup)
        .addTo(map);
    });

    if (heatPoints.length > 0) {
      L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.35,
        max: 1,
      }).addTo(map);
    }

    setStatus(
      heatPoints.length > 0
        ? `${heatPoints.length}件の活動データを表示中`
        : "まだ活動データはありません。",
    );

    window.setTimeout(() => {
      statusElement.classList.add("hidden");
    }, 3500);
  } catch (error) {
    console.error("活動データの読み込みに失敗しました:", error);
    setStatus("データを読み込めませんでした。Firebaseの設定とルールをご確認ください。", "error");
  }
}

renderReports();
