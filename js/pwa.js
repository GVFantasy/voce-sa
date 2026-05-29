(function () {
  if (!("serviceWorker" in navigator)) return;

  let refreshing = false;

  function notifyUpdate(registration) {
    const event = new CustomEvent("app-update-ready", { detail: { registration } });
    window.dispatchEvent(event);
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            notifyUpdate(registration);
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (error) {
      console.warn("Service worker registration failed", error);
    }
  });

  window.applyPwaUpdate = function () {
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration && registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });
  };
})();
