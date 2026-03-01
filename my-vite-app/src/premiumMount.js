let mounted = false;
let iframeEl = null;

export function isPremiumMounted() {
  return mounted;
}

export function getPremiumIframe() {
  return iframeEl;
}

export function mountPremium({ container, src, ctx }) {
  if (mounted && iframeEl) return iframeEl;
  if (!container) return null;

  iframeEl = document.createElement("iframe");
  iframeEl.id = "bcPremiumFrame";
  iframeEl.src = src;
  iframeEl.setAttribute("allow", "autoplay; clipboard-read; clipboard-write");
  iframeEl.style.width = "100%";
  iframeEl.style.height = "100%";
  iframeEl.style.border = "0";

  container.innerHTML = "";
  container.appendChild(iframeEl);

  iframeEl.addEventListener("load", () => {
    try {
      iframeEl.contentWindow?.postMessage(
        { source: "BC_MSG", v: 1, type: "bc_ctx", kind: "CTX", ctx },
        window.location.origin
      );
    } catch {}
  });

  mounted = true;
  return iframeEl;
}

export function unmountPremium({ container } = {}) {
  if (!mounted) return;
  try {
    iframeEl?.remove();
  } catch {}
  iframeEl = null;
  mounted = false;

  if (container) container.innerHTML = "";
}
