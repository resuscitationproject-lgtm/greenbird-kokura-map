import {
  GeoPoint,
  addDoc,
  collection,
  db,
  isFirebaseConfigured,
  serverTimestamp,
} from "./firebase-config.js";

const form = document.querySelector("#report-form");
const locationButton = document.querySelector("#get-location");
const latitudeInput = document.querySelector("#latitude");
const longitudeInput = document.querySelector("#longitude");
const locationStatus = document.querySelector("#location-status");
const memoInput = document.querySelector("#memo");
const memoCount = document.querySelector("#memo-count");
const errorElement = document.querySelector("#form-error");
const submitButton = document.querySelector("#submit-report");

let currentLocation = null;

function showError(message) {
  errorElement.textContent = message;
  errorElement.classList.remove("hidden");
}

function clearError() {
  errorElement.textContent = "";
  errorElement.classList.add("hidden");
}

function getGeolocationErrorMessage(error) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "位置情報の利用が許可されていません。ブラウザの設定からGPSを許可してください。";
    case error.POSITION_UNAVAILABLE:
      return "現在地を取得できませんでした。電波状況を確認して、もう一度お試しください。";
    case error.TIMEOUT:
      return "現在地の取得がタイムアウトしました。もう一度お試しください。";
    default:
      return "現在地の取得中にエラーが発生しました。";
  }
}

locationButton.addEventListener("click", () => {
  clearError();

  if (!navigator.geolocation) {
    showError("このブラウザは位置情報の取得に対応していません。");
    return;
  }

  locationButton.disabled = true;
  locationButton.textContent = "現在地を取得しています…";
  locationStatus.textContent = "GPSの応答を待っています。";

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      currentLocation = {
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
      latitudeInput.value = coords.latitude.toFixed(6);
      longitudeInput.value = coords.longitude.toFixed(6);
      locationStatus.textContent = `現在地を取得しました（精度 約${Math.round(coords.accuracy)}m）`;
      locationStatus.className = "mt-2 text-sm font-medium text-green-700";
      locationButton.disabled = false;
      locationButton.textContent = "📍 現在地を再取得";
    },
    (error) => {
      const message = getGeolocationErrorMessage(error);
      currentLocation = null;
      latitudeInput.value = "";
      longitudeInput.value = "";
      locationStatus.textContent = "位置情報を取得できませんでした。";
      locationStatus.className = "mt-2 text-sm font-medium text-red-700";
      locationButton.disabled = false;
      locationButton.textContent = "📍 現在地をGPSで取得";
      showError(message);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    },
  );
});

memoInput.addEventListener("input", () => {
  memoCount.textContent = `${memoInput.value.length} / 200`;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  if (!isFirebaseConfigured) {
    showError("Firebaseの設定が未完了です。js/firebase-config.js を設定してください。");
    return;
  }

  if (!currentLocation) {
    showError("先に「現在地をGPSで取得」を押してください。");
    return;
  }

  const amount = Number(new FormData(form).get("amount"));
  if (!Number.isInteger(amount) || amount < 1 || amount > 5) {
    showError("ゴミの量を1〜5から選択してください。");
    return;
  }

  const memo = memoInput.value.trim();
  if (memo.length > 200) {
    showError("メモは200文字以内で入力してください。");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "送信しています…";

  try {
    const report = {
      date: serverTimestamp(),
      location: new GeoPoint(currentLocation.latitude, currentLocation.longitude),
      amount,
    };

    if (memo) {
      report.memo = memo;
    }

    await addDoc(collection(db, "trash_reports"), report);
    window.alert("報告ありがとうございます！");
    window.location.href = "./index.html";
  } catch (error) {
    console.error("報告の送信に失敗しました:", error);
    showError("報告を送信できませんでした。通信環境とFirebaseの設定をご確認ください。");
    submitButton.disabled = false;
    submitButton.textContent = "報告を送信する";
  }
});
