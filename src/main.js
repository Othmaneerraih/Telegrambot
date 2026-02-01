import "./style.css";
import { PRODUCTS } from "./data/products.js";

const $ = (sel, root = document) => root.querySelector(sel);

const state = {
  activeFilter: "new",
  search: "",
  cartItems: {}, // key -> { qty }
  checkout: { dept: "", address: "", slot: "" },
};

const WHATSAPP_NUMBER = "212665358533"; // digits only, no +

/** ---------------- Utilities ---------------- */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function moneyEUR(n) {
  return `${Number(n).toFixed(0)} €`;
}

function cardPriceLabel(p) {
  const t = p?.tiers?.[0];
  if (!t) return "";
  const unitShort = (t.unitText || "").split("·")[0].trim();
  return `${moneyEUR(t.price)} ${unitShort}`.trim();
}

function cardMetaLabel(p) {
  const r = typeof p.rating === "number" ? p.rating.toFixed(1) : "";
  const b = p.badge || "";
  return `${r ? `${r}★` : ""}${r && b ? " • " : ""}${b}`.trim();
}

function parseCartKey(key) {
  const parts = String(key).split("::");
  return { id: parts[0], tierLabel: parts[1] || "", picks: parts[2] || "" };
}

function findTierPrice(p, tierLabel) {
  const t =
    (p.tiers || []).find((x) => x.label === tierLabel) || (p.tiers || [])[0];
  return {
    price: t?.price || 0,
    unitText: t?.unitText || "",
    label: t?.label || tierLabel,
  };
}

function pickTextById(p, optId) {
  for (const pick of p.boxPicks || []) {
    for (const o of pick.options || []) {
      if (String(o.id) === String(optId)) return o.text;
    }
  }
  return optId;
}

/** ---------------- Promo banner ---------------- */
const promoBanner = $("#promo-banner");
$("#promo-close")?.addEventListener("click", () => promoBanner?.remove());

/** ---------------- Filter dropdown ---------------- */
const filterToggle = $("#filter-toggle");
const filterPanel = $("#filter-panel");

filterToggle?.addEventListener("click", () => {
  filterPanel?.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!filterPanel || filterPanel.classList.contains("hidden")) return;
  const within = e.target.closest(".filter-box");
  if (!within) filterPanel.classList.add("hidden");
});

filterPanel?.addEventListener("click", (e) => {
  const btn = e.target.closest(".filter-item");
  if (!btn) return;

  // support both naming styles
  const filter = btn.dataset.filter || btn.dataset.chip;
  if (!filter) return;

  state.activeFilter = filter;
  filterToggle.textContent = `${btn.textContent} ▼`;
  filterPanel.classList.add("hidden");
  renderGrid();
});

/** ---------------- Search ---------------- */
const searchInput = $("#search-input");
searchInput?.addEventListener("input", () => {
  state.search = (searchInput.value || "").trim().toLowerCase();
  renderGrid();
});

/** ---------------- Filtering logic ---------------- */
function matchesFilter(p) {
  if (state.activeFilter === "new") return !!p.isNew;
  return p.shop === state.activeFilter;
}

function matchesSearch(p) {
  if (!state.search) return true;

  const hay = [p.title, p.subtitle, p.badge, p.shop, ...(p.tags || [])]
    .join(" ")
    .toLowerCase();

  return hay.includes(state.search);
}

/** ---------------- Cart count ---------------- */
const cartCountEl = $("#cart-count");

function updateCartCount() {
  const total = Object.values(state.cartItems).reduce((s, it) => s + it.qty, 0);
  if (cartCountEl) cartCountEl.textContent = String(total);
}

function addToCartKey(key, qty = 1) {
  state.cartItems[key] = state.cartItems[key] || { qty: 0 };
  state.cartItems[key].qty += qty;
  updateCartCount();
  renderCart();
  showToast("Ajouté au panier ✔️");
}

function setCartKeyQty(key, qty) {
  if (qty <= 0) delete state.cartItems[key];
  else state.cartItems[key] = { qty };
  updateCartCount();
  renderCart();
}

/** ---------------- Grid render ---------------- */
const grid = $("#product-grid");

function renderGrid() {
  if (!grid) return;

  const list = PRODUCTS.filter(matchesFilter).filter(matchesSearch);

  if (!list.length) {
    grid.innerHTML = `<div style="opacity:.75;padding:14px;">No products found.</div>`;
    return;
  }

  grid.innerHTML = list
    .map((p) => {
      const img = p.poster || p.image || "";
      const price = cardPriceLabel(p);
      const meta = cardMetaLabel(p);

      return `
        <article class="card" data-id="${p.id}">
          <div class="thumb">
            <img src="${img}" alt="${escapeHtml(p.title || "")}" loading="lazy">
            <div class="badge">${escapeHtml(p.badge || "")}</div>
          </div>

          <div class="meta">
            <h3 class="title">${escapeHtml(p.title || "")}</h3>
            <p class="sub">${escapeHtml(p.subtitle || "")}</p>

            <div class="meta__row">
              <span class="price">${escapeHtml(price)}</span>
              <span class="conc">${escapeHtml(meta)}</span>
            </div>

            <div class="tags">
              ${(p.tags || [])
                .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
                .join("")}
            </div>

            <button class="btn-quick-add" type="button" data-quick-add="${p.id}" aria-label="Quick add">+</button>
          </div>
        </article>
      `;
    })
    .join("");
}

/** ---------------- Modal ---------------- */
const modal = $("#product-modal");
const modalBadge = $("#modal-badge");
const modalVideo = $("#modal-video");
const modalTitle = $("#modal-title");
const modalBrand = $("#modal-brand");
const modalMainPrice = $("#modal-main-price");
const modalMainUnit = $("#modal-main-unit");
const modalMeta = $("#modal-meta");
const modalTiers = $("#modal-tiers");
const modalBox = $("#modal-box");
const modalBoxPicks = $("#modal-box-picks");
const modalDesc = $("#modal-desc");
const modalTags = $("#modal-tags");
const modalQtyValue = $("#modal-qty-value");
const qtyMinus = $("#modal-qty-minus");
const qtyPlus = $("#modal-qty-plus");
const modalAddCart = $("#modal-add-cart");

let currentProduct = null;
let currentTierIndex = 0;
let modalQty = 1;
let boxSelections = [];

function renderTiers(p) {
  if (!modalTiers) return;
  modalTiers.innerHTML = (p.tiers || [])
    .map(
      (t, idx) => `
      <div class="tier-row ${idx === currentTierIndex ? "tier-row--active" : ""}" data-tier-index="${idx}">
        <span>${escapeHtml(t.label)}</span>
        <span>${escapeHtml(moneyEUR(t.price))}</span>
      </div>
    `
    )
    .join("");
}

function applyTierToPrice(p) {
  const t = (p.tiers || [])[currentTierIndex];
  if (!t) return;
  if (modalMainPrice) modalMainPrice.textContent = moneyEUR(t.price);
  if (modalMainUnit) modalMainUnit.textContent = t.unitText || "";
}

function renderBox(p) {
  if (!modalBox || !modalBoxPicks) return;

  if (!p.isBox) {
    modalBox.classList.add("hidden");
    modalBoxPicks.innerHTML = "";
    boxSelections = [];
    return;
  }

  modalBox.classList.remove("hidden");
  boxSelections = new Array((p.boxPicks || []).length).fill("");

  modalBoxPicks.innerHTML = (p.boxPicks || [])
    .map(
      (pick, idx) => `
      <div class="modal__box-row">
        <div class="modal__box-label">${escapeHtml(pick.label)}</div>
        <select class="modal__box-select" data-pick-index="${idx}">
          <option value="">Sélectionner…</option>
          ${(pick.options || [])
            .map(
              (o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.text)}</option>`
            )
            .join("")}
        </select>
      </div>
    `
    )
    .join("");

  // reference behavior: box requires all selections
  if (modalAddCart) modalAddCart.disabled = true;
}

function updateBoxCompletion(p) {
  if (!p?.isBox || !modalAddCart) return;
  const complete = boxSelections.every((v) => v && String(v).trim().length > 0);
  modalAddCart.disabled = !complete;
}

function openModal(productId) {
  const p = PRODUCTS.find((x) => String(x.id) === String(productId));
  if (!p || !modal) return;

  currentProduct = p;
  currentTierIndex = 0;
  modalQty = 1;
  if (modalQtyValue) modalQtyValue.textContent = String(modalQty);

  if (modalBadge) modalBadge.textContent = p.badge || "";
  if (modalTitle) modalTitle.textContent = p.title || "";
  if (modalBrand) modalBrand.textContent = p.subtitle || "";

  if (modalMeta) {
    const r = typeof p.rating === "number" ? p.rating.toFixed(1) : "";
    modalMeta.textContent = `${r ? `${r}★` : ""}${r && p.badge ? " • " : ""}${p.badge || ""}`.trim();
  }

  if (modalVideo) {
    modalVideo.setAttribute("poster", p.poster || "");
    modalVideo.src = p.video || "";
    if (p.video) modalVideo.setAttribute("controls", "");
    else modalVideo.removeAttribute("controls");
    modalVideo.load();
  }

  renderTiers(p);
  applyTierToPrice(p);
  renderBox(p);

  if (modalDesc) modalDesc.textContent = p.desc || "";

  if (modalTags) {
    modalTags.innerHTML = (p.tags || [])
      .map((t) => `<span class="modal__tag">${escapeHtml(t)}</span>`)
      .join("");
  }

  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeModal() {
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  currentProduct = null;
  boxSelections = [];
}

/* Close modal */
modal?.addEventListener("click", (e) => {
  if (e.target.closest("[data-modal-close]")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) closeModal();
});

/* Tier click */
modalTiers?.addEventListener("click", (e) => {
  const row = e.target.closest("[data-tier-index]");
  if (!row || !currentProduct) return;
  currentTierIndex = Number(row.dataset.tierIndex || 0);
  renderTiers(currentProduct);
  applyTierToPrice(currentProduct);
});

/* Box picks change */
modalBoxPicks?.addEventListener("change", (e) => {
  const sel = e.target.closest("select[data-pick-index]");
  if (!sel || !currentProduct?.isBox) return;

  const idx = Number(sel.dataset.pickIndex);
  boxSelections[idx] = sel.value || "";
  updateBoxCompletion(currentProduct);
});

/* Qty */
qtyMinus?.addEventListener("click", () => {
  modalQty = Math.max(1, modalQty - 1);
  if (modalQtyValue) modalQtyValue.textContent = String(modalQty);
});
qtyPlus?.addEventListener("click", () => {
  modalQty += 1;
  if (modalQtyValue) modalQtyValue.textContent = String(modalQty);
});

/* Add to cart from modal */
modalAddCart?.addEventListener("click", () => {
  if (!currentProduct) return;

  const tier = currentProduct.tiers?.[currentTierIndex];
  const tierLabel = tier?.label || "DEFAULT";

  const picksKey = currentProduct.isBox ? boxSelections.join(",") : "";
  const key = `${currentProduct.id}::${tierLabel}::${picksKey}`;

  addToCartKey(key, modalQty);
  closeModal();
});

/** ---------------- Grid click (quick add OR open modal) ---------------- */
grid?.addEventListener("click", (e) => {
  // quick add should NOT open modal
  const quickBtn = e.target.closest("[data-quick-add]");
  if (quickBtn) {
    e.preventDefault();
    e.stopPropagation();

    const p = PRODUCTS.find((x) => String(x.id) === String(quickBtn.dataset.quickAdd));
    if (!p) return;

    const defaultTierLabel = p.tiers?.[0]?.label || "DEFAULT";
    const key = `${p.id}::${defaultTierLabel}::`;
    addToCartKey(key, 1);
    return;
  }

  const card = e.target.closest(".card");
  if (!card) return;
  openModal(card.dataset.id);
});

/** ---------------- Cart ---------------- */
const cartPanel = $("#cart-panel");
const cartOverlay = $("#cart-overlay");
const cartOpenBtn = $("#cart-button");
const cartCloseBtn = $("#cart-close");
const cartItemsEl = $("#cart-items");
const cartTotalEl = $("#cart-total");
const cartClearBtn = $("#cart-clear");
const cartDept = $("#cart-dept");
const cartAddress = $("#cart-address");
const cartSlot = $("#cart-slot");
const cartWhatsapp = $("#cart-whatsapp");
const toast = $("#toast");

function showToast(msg) {
  // if toast missing, fallback to alert
  if (!toast) {
    alert(msg);
    return;
  }
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 1400);
}

function openCart() {
  cartPanel?.classList.remove("hidden");
  cartOverlay?.classList.remove("hidden");
  renderCart();
}
function closeCart() {
  cartPanel?.classList.add("hidden");
  cartOverlay?.classList.add("hidden");
}

cartOpenBtn?.addEventListener("click", openCart);
cartCloseBtn?.addEventListener("click", closeCart);
cartOverlay?.addEventListener("click", (e) => {
  if (e.target.closest("[data-cart-close]")) closeCart();
});

/** Always read checkout values from DOM (most reliable in WebViews) */
function readCheckoutFromInputs() {
  const dept = (cartDept?.value || "").trim();
  const address = (cartAddress?.value || "").trim();
  const slot = (cartSlot?.value || "").trim();

  state.checkout.dept = dept;
  state.checkout.address = address;
  state.checkout.slot = slot;

  return { dept, address, slot };
}

function buildWhatsAppText(lines, total, dept, address, slot) {
  return [
    "🛒 Commande :",
    ...lines,
    "",
    `Total: ${moneyEUR(total)}`,
    "",
    `Département: ${dept}`,
    `Adresse: ${address}`,
    `Tournée: ${slot}`,
  ].join("\n");
}

function renderCart() {
  if (!cartItemsEl || !cartTotalEl || !cartWhatsapp) return;

  const entries = Object.entries(state.cartItems);

  // Always keep href updated (even if invalid), click handler will decide to allow/block.
  if (!entries.length) {
    cartItemsEl.innerHTML = `<div style="opacity:.75;padding:8px;">Panier vide.</div>`;
    cartTotalEl.textContent = "0 €";
    cartWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}`;
    return;
  }

  let total = 0;
  const waLines = [];

  cartItemsEl.innerHTML = entries
    .map(([key, it]) => {
      const { id, tierLabel, picks } = parseCartKey(key);
      const p = PRODUCTS.find((x) => String(x.id) === String(id));
      if (!p) return "";

      const tier = findTierPrice(p, tierLabel);
      const lineTotal = tier.price * it.qty;
      total += lineTotal;

      const title = p.title || "Produit";
      const sub = p.subtitle || "";

      const picksNote = picks
        ? `Choix: ${picks
            .split(",")
            .filter(Boolean)
            .map((x) => pickTextById(p, x))
            .join(" | ")}`
        : "";

      waLines.push(
        `- ${title} (${tier.label}) x${it.qty} = ${moneyEUR(lineTotal)}${
          picks ? `\n  ${picksNote}` : ""
        }`
      );

      return `
        <div class="cart-item" data-key="${escapeHtml(key)}">
          <div class="cart-item-main">
            <div class="cart-item-title">
              ${escapeHtml(title)}
              <span style="opacity:.7">• ${escapeHtml(tier.label)}</span>
            </div>
            <div class="cart-item-sub">${escapeHtml(sub)}</div>
            ${picksNote ? `<div class="cart-item-note">${escapeHtml(picksNote)}</div>` : ""}
          </div>

          <div class="cart-item-right">
            <div class="cart-item-price">${escapeHtml(moneyEUR(tier.price))}</div>
            <div class="cart-item-qty">
              <button type="button" data-cart-minus>−</button>
              <span>${it.qty}</span>
              <button type="button" data-cart-plus>+</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  cartTotalEl.textContent = moneyEUR(total);

  const { dept, address, slot } = readCheckoutFromInputs();
  const text = buildWhatsAppText(waLines, total, dept || "—", address || "—", slot || "—");
  cartWhatsapp.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

cartItemsEl?.addEventListener("click", (e) => {
  const row = e.target.closest(".cart-item");
  if (!row) return;

  const key = row.dataset.key;
  if (!key) return;

  if (e.target.closest("[data-cart-plus]")) {
    setCartKeyQty(key, (state.cartItems[key]?.qty || 0) + 1);
  } else if (e.target.closest("[data-cart-minus]")) {
    setCartKeyQty(key, (state.cartItems[key]?.qty || 0) - 1);
  }
});

cartClearBtn?.addEventListener("click", () => {
  state.cartItems = {};
  updateCartCount();
  renderCart();
});

/** Keep cart updated as user edits fields (NO warnings here) */
cartDept?.addEventListener("change", renderCart);
cartAddress?.addEventListener("input", renderCart);
cartSlot?.addEventListener("change", renderCart);

/** IMPORTANT: Only show message on send click; never disable button */
cartWhatsapp?.addEventListener("click", (e) => {
  const entries = Object.entries(state.cartItems);
  if (!entries.length) {
    e.preventDefault();
    showToast("⚠️ Panier vide.");
    return;
  }

  const { dept, address, slot } = readCheckoutFromInputs();

  const missing = [];
  if (!dept) missing.push("Département");
  if (!address) missing.push("Adresse");
  if (!slot) missing.push("Tournée");

  if (missing.length) {
    e.preventDefault();
    showToast("⚠️ Tous les champs sont obligatoires.");
    // optionally focus first missing field:
    if (!dept) cartDept?.focus();
    else if (!address) cartAddress?.focus();
    else cartSlot?.focus();
    return;
  }

  // valid: ensure href is up to date right before leaving
  renderCart();
});

/** ---------------- Init ---------------- */
renderGrid();
updateCartCount();
renderCart();
