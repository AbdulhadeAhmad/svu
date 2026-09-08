export function createResetControl({ storage, i18n }) {
  const button = document.getElementById("resetBtn");
  const errorMessage = document.getElementById("resetError");

  function refresh() {
    button.querySelector(".reset-label").textContent = i18n.t("resetApp");
    button.title = i18n.t("resetAppHint");
    button.setAttribute("aria-label", i18n.t("resetAppHint"));
    if (!errorMessage.hidden) errorMessage.textContent = i18n.t("resetAppFailed");
  }

  button.addEventListener("click", () => {
    button.disabled = true;
    errorMessage.hidden = true;
    try {
      storage.reset();
      // Browsers can restore form values and scroll positions on reload.
      document.querySelectorAll("input, textarea").forEach(input => { input.value = ""; });
      history.scrollRestoration = "manual";
      window.location.reload();
    } catch (error) {
      console.error("Unable to reset app data", error);
      button.disabled = false;
      errorMessage.textContent = i18n.t("resetAppFailed");
      errorMessage.hidden = false;
    }
  });

  return { refresh };
}
