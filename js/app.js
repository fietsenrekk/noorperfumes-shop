/* NOOR PERFUMES — shop logic
   Shopify note: grid/cart/checkout below are replaced by Shopify's own
   cart + checkout when porting; the sub-page overlay contents map to
   Shopify Pages (page.store-info, page.privacy, ...). */

(function () {
  "use strict";

  var PRODUCTS = window.NOOR_PRODUCTS;
  var PAGE_SIZE = 12;
  var CART_KEY = "noor-cart";

  var visibleCount = PAGE_SIZE;
  var filterText = "";
  var cart = loadCart(); // id -> qty
  var anyBought = Object.keys(cart).length > 0;

  var grid = document.getElementById("productGrid");
  var cartList = document.getElementById("cartList");
  var cartBar = document.getElementById("cartBar");
  var cartSpacer = document.getElementById("cartSpacer");
  var cartCount = document.getElementById("cartCount");
  var payTotal = document.getElementById("payTotal");
  var payBtn = document.getElementById("payBtn");
  var payConfirm = document.getElementById("payConfirm");
  var loadMoreWrap = document.getElementById("loadMoreWrap");
  var loadMoreBtn = document.getElementById("loadMoreBtn");
  var toolbarCount = document.getElementById("toolbarCount");
  var searchInput = document.getElementById("searchInput");
  var cartDrawer = document.getElementById("cartDrawer");
  var cartBackdrop = document.getElementById("cartBackdrop");
  var drawerHandle = document.getElementById("drawerHandle");
  var siteHeader = document.querySelector(".site-header");
  var pageOverlay = document.getElementById("pageOverlay");
  var pageBody = document.getElementById("pageBody");
  var pageScroll = document.getElementById("pageScroll");
  var pageDrawerHandle = document.getElementById("pageDrawerHandle");
  var pageBackdrop = document.getElementById("pageBackdrop");
  var savedScrollPosition = 0;

  function fmt(n) { return "€" + n; }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- cart persistence (strictly functional storage, see cookie policy) ---------- */
  function loadCart() {
    try {
      var raw = localStorage.getItem(CART_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      var clean = {};
      Object.keys(data).forEach(function (id) {
        var qty = parseInt(data[id], 10);
        // Accept any positive quantity; the id is validated against the live
        // catalogue when rendering and again server-side at checkout.
        if (qty > 0 && /^[a-z0-9-]+$/i.test(id)) {
          clean[id] = Math.min(qty, 99);
        }
      });
      return clean;
    } catch (e) { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* private mode */ }
  }

  /* ---------- header height sync (for drawer top offset) ---------- */
  function syncHeaderHeight() {
    document.documentElement.style.setProperty("--header-h", siteHeader.offsetHeight + "px");
  }
  syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);

  /* ---------- cart drawer open/close ---------- */
  function openDrawer() {
    cartDrawer.classList.add("open");
    cartDrawer.setAttribute("aria-hidden", "false");
    cartBackdrop.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    cartDrawer.classList.remove("open");
    cartDrawer.setAttribute("aria-hidden", "true");
    cartBackdrop.classList.remove("show");
    if (!pageOverlay.classList.contains("open")) document.body.style.overflow = "";
  }

  document.getElementById("cartBarBtn").addEventListener("click", openDrawer);
  cartBackdrop.addEventListener("click", closeDrawer);
  drawerHandle.addEventListener("click", closeDrawer);

  /* drag the handle down to close */
  (function () {
    var startY = null;
    var currentY = 0;
    function onStart(e) {
      startY = (e.touches ? e.touches[0].clientY : e.clientY);
      cartDrawer.style.transition = "none";
    }
    function onMove(e) {
      if (startY === null) return;
      var y = (e.touches ? e.touches[0].clientY : e.clientY);
      currentY = Math.max(0, y - startY);
      cartDrawer.style.transform = "translateY(" + currentY + "px)";
    }
    function onEnd() {
      if (startY === null) return;
      cartDrawer.style.transition = "";
      cartDrawer.style.transform = "";
      if (currentY > 90) { closeDrawer(); }
      startY = null;
      currentY = 0;
    }
    drawerHandle.addEventListener("touchstart", onStart, { passive: true });
    drawerHandle.addEventListener("touchmove", onMove, { passive: true });
    drawerHandle.addEventListener("touchend", onEnd);
    drawerHandle.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
  })();

  /* swipe up on the cart bar (mobile) opens the drawer */
  (function () {
    var startY = null;
    cartBar.addEventListener("touchstart", function (e) {
      startY = e.touches[0].clientY;
    }, { passive: true });
    cartBar.addEventListener("touchend", function (e) {
      if (startY === null) return;
      var endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : startY;
      if (startY - endY > 30) { openDrawer(); }
      startY = null;
    });
  })();

  /* ---------- product grid ---------- */
  function getFiltered() {
    if (!filterText) return PRODUCTS;
    var q = filterText.toLowerCase();
    return PRODUCTS.filter(function (p) {
      return p.name.toLowerCase().indexOf(q) >= 0 || p.notes.toLowerCase().indexOf(q) >= 0;
    });
  }

  // Split the 3-part note string into a top / heart / base pyramid, lowercased.
  function notePyramid(notes) {
    var parts = String(notes || "").split(",").map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    return {
      top: parts[0] || "",
      heart: parts[1] || parts[0] || "",
      base: parts[2] || parts[parts.length - 1] || ""
    };
  }
  // Remove em/en dashes from body copy (client wants none in the text).
  function cleanText(s) {
    return String(s || "").replace(/\s*[—–]\s*/g, ", ").replace(/\s+,/g, ",");
  }

  function renderGrid() {
    grid.innerHTML = "";
    var filtered = getFiltered();
    toolbarCount.textContent = filtered.length + " perfume" + (filtered.length === 1 ? "" : "s");

    if (filtered.length === 0) {
      grid.classList.add("grid-empty");
      var none = document.createElement("div");
      none.className = "no-results";
      none.innerHTML =
        '<div class="no-results-title">No perfumes found</div>' +
        '<button class="no-results-clear" id="clearSearch">Clear search</button>';
      grid.appendChild(none);
      none.querySelector("#clearSearch").addEventListener("click", function () {
        searchInput.value = "";
        filterText = "";
        visibleCount = PAGE_SIZE;
        renderGrid();
        searchInput.focus();
      });
      loadMoreWrap.style.display = "none";
      return;
    }
    grid.classList.remove("grid-empty");

    var toShow = filtered.slice(0, visibleCount);

    toShow.forEach(function (p, idx) {
      var block = document.createElement("div");
      block.className = "product-block";
      block.setAttribute("data-id", p.id);

      var py = notePyramid(p.notes);
      var photoInner = p.photo
        ? '<img src="' + p.photo + '" alt="' + esc(p.name) + '" loading="lazy">'
        : '<span class="ph-mark">' + esc(p.initial) + "</span>";
      var photoClass = p.photo ? "product-photo has-photo" : "product-photo";

      var fullNoteLines =
        '<div class="note-line">topnotes: ' + esc(py.top) + "</div>" +
        '<div class="note-line">heartnotes: ' + esc(py.heart) + "</div>" +
        '<div class="note-line">basenotes: ' + esc(py.base) + "</div>";
        
      var shortNoteLines =
        '<div class="note-line">&bull; ' + esc(py.top) + "</div>" +
        '<div class="note-line">&bull; ' + esc(py.heart) + "</div>" +
        '<div class="note-line">&bull; ' + esc(py.base) + "</div>";

      var perfumeNumber = idx + 1;
      var cleanName = p.name.replace(/\s*No\.\d+$/i, '');

      block.innerHTML =
        '<div class="' + photoClass + '">' +
          photoInner +
        "</div>" +
        '<div class="product-meta" role="button" tabindex="0" aria-expanded="false" ' +
          'aria-label="More about ' + esc(cleanName) + '">' +
          '<div class="meta-text">' +
            '<div class="meta-name">' + esc(cleanName) + ' No.' + perfumeNumber + "</div>" +
            '<div class="meta-notes">' + shortNoteLines + "</div>" +
          "</div>" +
          (p.soldOut
            ? '<button class="order-btn waitlist-btn" data-waitlist="' + p.id + '" ' +
                'aria-expanded="false">Join<br>Waitlist</button>' +
              '<div class="waitlist-panel" aria-hidden="true">' +
                '<input type="email" class="waitlist-input" placeholder="Email address" ' +
                  'autocomplete="email" aria-label="Email address for the ' + esc(cleanName) + ' waitlist">' +
                '<button type="button" class="waitlist-submit" data-waitlist-submit="' + p.id + '">OK</button>' +
              "</div>"
            : '<button class="order-btn" data-id="' + p.id + '">Order</button>') +
        "</div>" +
        '<div class="info-swipe" aria-hidden="true">' +
          '<button class="swipe-close" type="button" aria-label="Close">×</button>' +
          '<div class="swipe-content">' +
            '<div class="swipe-name">' + esc(cleanName) + ' No.' + perfumeNumber + "</div>" +
            '<div class="swipe-notes">' + fullNoteLines + "</div>" +
            '<p class="swipe-desc">' + esc(cleanText(p.fact)) + "</p>" +
            '<div class="swipe-price">' + fmt(p.price) + "</div>" +
          "</div>" +
          '<div class="swipe-dismiss"></div>' +
        "</div>";

      grid.appendChild(block);
    });

    loadMoreWrap.style.display = (visibleCount < filtered.length) ? "flex" : "none";
    if (window.NOOR_HEADER_SYNC) window.NOOR_HEADER_SYNC();
  }

  /* one delegated listener instead of per-render bindings */
  grid.addEventListener("click", function (e) {
    var order = e.target.closest(".order-btn[data-id]");
    if (order) { e.stopPropagation(); handleBuy(order); return; }
    var waitBtn = e.target.closest("[data-waitlist]");
    if (waitBtn) { e.stopPropagation(); toggleWaitlist(waitBtn); return; }
    var waitSubmit = e.target.closest("[data-waitlist-submit]");
    if (waitSubmit) { e.stopPropagation(); submitWaitlist(waitSubmit); return; }
    // clicks inside the panel must not toggle the info swipe
    if (e.target.closest(".waitlist-panel")) { e.stopPropagation(); return; }
    var close = e.target.closest(".swipe-close");
    if (close) { e.stopPropagation(); setInfo(close.closest(".product-block"), false); return; }
    var dismiss = e.target.closest(".swipe-dismiss");
    if (dismiss) { setInfo(dismiss.closest(".product-block"), false); return; }
    var meta = e.target.closest(".product-meta");
    if (meta) { toggleInfo(meta.closest(".product-block")); }
  });
  grid.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var meta = e.target.closest(".product-meta");
    if (meta) {
      e.preventDefault();
      toggleInfo(meta.closest(".product-block"));
    }
  });

  /* ---------- touch photo zoom (phones AND tablets/iPads) ----------
     Desktop uses CSS :hover to zoom. Touch devices have no hover, so a tap
     toggles an explicit class instead — this also fixes the old bug where a
     zoom driven by :active could stay "stuck" zoomed in on some mobile
     browsers. Tapping the same (already zoomed) photo again eases it back
     down to its normal size. */
  var isTouchDevice = window.matchMedia &&
    (window.matchMedia("(hover: none)").matches || window.matchMedia("(pointer: coarse)").matches);
  if (isTouchDevice) {
    grid.addEventListener("click", function (e) {
      var photo = e.target.closest(".product-photo");
      if (!photo) return;
      var wasZoomed = photo.classList.contains("is-zoomed");
      grid.querySelectorAll(".product-photo.is-zoomed").forEach(function (p) {
        if (p !== photo) p.classList.remove("is-zoomed");
      });
      photo.classList.toggle("is-zoomed", !wasZoomed);
    });
  }

  function setInfo(block, open) {
    if (!block) return;
    var meta = block.querySelector(".product-meta");
    var panel = block.querySelector(".info-swipe");
    block.classList.toggle("info-open", open);
    if (meta) meta.setAttribute("aria-expanded", open ? "true" : "false");
    if (panel) panel.setAttribute("aria-hidden", open ? "false" : "true");
  }
  function toggleInfo(block) {
    if (!block) return;
    var willOpen = !block.classList.contains("info-open");
    grid.querySelectorAll(".product-block.info-open").forEach(function (b) { setInfo(b, false); });
    if (willOpen) setInfo(block, true);
  }

  function handleBuy(btn) {
    var id = btn.getAttribute("data-id");
    cart[id] = (cart[id] || 0) + 1;

    btn.classList.remove("flash");
    void btn.offsetWidth;
    btn.classList.add("flash");

    saveCart();
    updateCartUI();
  }

  /* ---------- waitlist (sold-out products) ---------- */
  var WAITLIST_KEY = "noor-waitlist";

  function toggleWaitlist(btn) {
    var meta = btn.closest(".product-meta");
    if (!meta) return;
    var willOpen = !meta.classList.contains("waitlist-open");
    // only one panel open at a time
    grid.querySelectorAll(".product-meta.waitlist-open").forEach(function (m) {
      m.classList.remove("waitlist-open");
      var b = m.querySelector("[data-waitlist]");
      var p = m.querySelector(".waitlist-panel");
      if (b) b.setAttribute("aria-expanded", "false");
      if (p) p.setAttribute("aria-hidden", "true");
    });
    if (!willOpen) return;
    meta.classList.add("waitlist-open");
    btn.setAttribute("aria-expanded", "true");
    var panel = meta.querySelector(".waitlist-panel");
    if (panel) {
      panel.setAttribute("aria-hidden", "false");
      var input = panel.querySelector(".waitlist-input");
      if (input) setTimeout(function () { input.focus(); }, 60);
    }
  }

  function submitWaitlist(btn) {
    var id = btn.getAttribute("data-waitlist-submit");
    var panel = btn.closest(".waitlist-panel");
    var input = panel && panel.querySelector(".waitlist-input");
    if (!input) return;
    var email = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.classList.add("invalid");
      input.focus();
      return;
    }
    input.classList.remove("invalid");
    try {
      var list = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "{}");
      list[id] = email;
      localStorage.setItem(WAITLIST_KEY, JSON.stringify(list));
    } catch (e) { /* private mode: still confirm to the customer */ }
    panel.classList.add("done");
    panel.innerHTML = '<div class="waitlist-done">You are on the list.</div>';
  }

  /* Enter submits the waitlist input */
  grid.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var input = e.target.closest(".waitlist-input");
    if (!input) return;
    e.preventDefault();
    e.stopPropagation();
    var submit = input.parentNode.querySelector("[data-waitlist-submit]");
    if (submit) submitWaitlist(submit);
  });

  /* ---------- cart ---------- */
  function totalCount() {
    return Object.keys(cart).reduce(function (n, id) { return n + cart[id]; }, 0);
  }
  function totalPrice() {
    return Object.keys(cart).reduce(function (sum, id) {
      var p = PRODUCTS.find(function (x) { return x.id === id; });
      return p ? sum + p.price * cart[id] : sum;
    }, 0);
  }

  function updateCartUI() {
    var count = totalCount();
    cartCount.textContent = count;

    if (count > 0) {
      cartBar.classList.add("show");
      cartSpacer.classList.add("show");
    } else {
      cartBar.classList.remove("show");
      cartSpacer.classList.remove("show");
    }

    renderCartList();
    payTotal.textContent = "Total: " + fmt(totalPrice());
    payBtn.disabled = count === 0;
  }

  function renderCartList() {
    cartList.innerHTML = "";
    var ids = Object.keys(cart);
    if (ids.length === 0) {
      var empty = document.createElement("div");
      empty.className = "empty-cart";
      empty.textContent = "Your cart is empty. Add a product.";
      cartList.appendChild(empty);
      return;
    }
    ids.forEach(function (id) {
      var p = PRODUCTS.find(function (x) { return x.id === id; });
      if (!p) return;
      var qty = cart[id];
      var row = document.createElement("div");
      row.className = "cart-row";
      row.innerHTML =
        "<div>" +
          '<div class="cart-row-name">' + esc(p.name) + "</div>" +
          '<div class="cart-row-meta">' + esc(p.ml) + " · " + esc(p.notes) + "</div>" +
        "</div>" +
        '<div class="cart-row-right">' +
          '<div class="qty-stepper">' +
            '<button type="button" class="qty-btn" data-qty-minus="' + id + '" aria-label="Decrease quantity of ' + esc(p.name) + '">−</button>' +
            '<span class="qty-value" aria-live="polite">' + qty + "</span>" +
            '<button type="button" class="qty-btn" data-qty-plus="' + id + '" aria-label="Increase quantity of ' + esc(p.name) + '">+</button>' +
          "</div>" +
          '<span class="cart-row-price">' + fmt(p.price * qty) + "</span>" +
          '<button class="trash-btn" aria-label="Remove ' + esc(p.name) + '" data-remove="' + id + '">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
              '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />' +
            "</svg>" +
          "</button>" +
        "</div>";
      cartList.appendChild(row);
    });
  }

  cartList.addEventListener("click", function (e) {
    var minus = e.target.closest("[data-qty-minus]");
    if (minus) {
      var idMinus = minus.getAttribute("data-qty-minus");
      if (cart[idMinus] > 1) { cart[idMinus] -= 1; } else { delete cart[idMinus]; }
      saveCart();
      updateCartUI();
      return;
    }
    var plus = e.target.closest("[data-qty-plus]");
    if (plus) {
      var idPlus = plus.getAttribute("data-qty-plus");
      cart[idPlus] = Math.min((cart[idPlus] || 0) + 1, 99);
      saveCart();
      updateCartUI();
      return;
    }
    var btn = e.target.closest("[data-remove]");
    if (!btn) return;
    delete cart[btn.getAttribute("data-remove")];
    saveCart();
    updateCartUI();
  });

  /* ---------- toolbar ---------- */
  loadMoreBtn.addEventListener("click", function () {
    visibleCount += PAGE_SIZE;
    renderGrid();
  });

  var searchDebounce;
  searchInput.addEventListener("input", function () {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function () {
      filterText = searchInput.value.trim();
      visibleCount = PAGE_SIZE;
      renderGrid();
    }, 120);
  });

  /* ---------- checkout form validation ---------- */
  var fields = [
    { id: "f-address", err: "e-address", label: "street and number" },
    { id: "f-postalcity", err: "e-postalcity", label: "postal code & city" },
    { id: "f-fullname", err: "e-fullname", label: "full name" },
    { id: "f-tel", err: "e-tel", label: "phone number" },
    { id: "f-email", err: "e-email", label: "email address" }
  ];

  function validateField(f) {
    var input = document.getElementById(f.id);
    var errEl = document.getElementById(f.err);
    var val = input.value.trim();
    var msg = "";

    if (val === "") {
      msg = "Please enter your " + f.label + ".";
    } else if (f.id === "f-email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      msg = "Please enter a valid email address.";
    } else if (f.id === "f-tel" && !/^[0-9+()\-\s]{6,}$/.test(val)) {
      msg = "Please enter a valid phone number.";
    }

    if (msg) {
      input.classList.add("invalid");
      errEl.textContent = msg;
      return false;
    }
    input.classList.remove("invalid");
    errEl.textContent = "";
    return true;
  }

  fields.forEach(function (f) {
    var input = document.getElementById(f.id);
    input.addEventListener("blur", function () { validateField(f); });
    input.addEventListener("input", function () {
      if (input.classList.contains("invalid")) validateField(f);
    });
  });

  payBtn.addEventListener("click", function () {
    if (payBtn.disabled) return;

    var allValid = true;
    var firstInvalid = null;
    fields.forEach(function (f) {
      if (!validateField(f) ) {
        allValid = false;
        if (!firstInvalid) firstInvalid = document.getElementById(f.id);
      }
    });
    if (!allValid) {
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    var nameParts = document.getElementById("f-fullname").value.trim().split(" ");
    var postalParts = document.getElementById("f-postalcity").value.trim().split(" ");

    var customer = {
      email: document.getElementById("f-email").value.trim(),
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(" ") || " ",
      phone: document.getElementById("f-tel").value.trim(),
      address: document.getElementById("f-address").value.trim(),
      postal_code: postalParts[0],
      city: postalParts.slice(1).join(" ") || " ",
      country: "BE"
    };

    var original = payBtn.textContent;
    payBtn.disabled = true;
    payBtn.textContent = "Redirecting to payment…";

    window.NOOR_STORE.checkout(cart, customer).then(function (data) {
      // Success: hand off to Mollie's secure hosted checkout.
      // The cart is intentionally NOT cleared here — it clears only once the
      // order is confirmed paid (the customer may come back to retry).
      window.location.href = data.checkoutUrl;
    }).catch(function (err) {
      payBtn.disabled = false;
      payBtn.textContent = original;
      var emailErr = document.getElementById("e-email");
      emailErr.textContent = (err && err.message) ? err.message : "Payment could not be started. Please try again.";
    });
  });

  /* ================================================================
     Sub-page overlay: store information (toolbar button only) + legal
     ================================================================ */

  var COMPANY_BLOCK =
    "<p><strong>Noorperfumes</strong><br>" +
    "Abdijstraat 197, 2020 Antwerpen, Belgium<br>" +
    "BTW: BE1016832588 · Ondernemingsnummer: 1016832588<br>" +
    'E-mail: <a href="mailto:noorperfumesofficial@gmail.com">noorperfumesofficial@gmail.com</a> · ' +
    'Phone: <a href="tel:+32487397475">0487 39 74 75</a></p>';

  var PAGES = {
    info: {
      title: "Store Information",
      html:
        '<p class="page-lede">This is the official website of NOOR PERFUMES. All products shown are available for purchase. ' +
        "Our main website is under construction and should be live by the start of November. In the meanwhile, enjoy our perfumes. " +
        "Sincerely, the team of NOOR PERFUMES.</p>" +
        '<div class="registry-line">KvK: 1016832588 &middot; BTW: BE1016832588</div>' +
        "<h2>Contactgegevens</h2>" +
        '<table class="detail-table">' +
        "<tr><th>Trade name</th><td>Noorperfumes</td></tr>" +
        '<tr><th>Phone number</th><td><a href="tel:+32487397475">0487397475</a></td></tr>' +
        '<tr><th>Email</th><td><a href="mailto:noorperfumesofficial@gmail.com">noorperfumesofficial@gmail.com</a></td></tr>' +
        "<tr><th>Physical address</th><td>Noor Perfumes, Abdijstraat, 197, 2020 Antwerpen, Belgium</td></tr>" +
        "<tr><th>VAT number</th><td>1016832588</td></tr>" +
        "<tr><th>Trade number</th><td>1016832588</td></tr>" +
        "</table>" +
        "<p>For questions about an order, product availability or anything else, reach us by phone or e-mail during opening hours (Mon–Sat, 10:00–18:00 CET). We aim to answer every message within one business day.</p>"
    },

    privacy: {
      title: "Privacy Policy",
      kicker: "Last updated: 15 July 2026",
      html:
        '<p class="page-lede">We keep it simple: we only collect what we need to deliver your order, we never sell your data, and you stay in control.</p>' +
        "<h2>1. Who is responsible</h2>" +
        "<p>The controller for the processing of your personal data is:</p>" + COMPANY_BLOCK +
        "<h2>2. What we collect and why</h2>" +
        "<ul>" +
        "<li><strong>Order details</strong> (name, delivery address, phone number, e-mail): used to process, ship and invoice your order. Legal basis: performance of a contract.</li>" +
        "<li><strong>Payment data</strong>: handled entirely by our payment provider. We never see or store your card number.</li>" +
        "<li><strong>Correspondence</strong>: if you contact us, we keep the exchange to help you. Legal basis: legitimate interest.</li>" +
        "</ul>" +
        "<h2>3. Who receives your data</h2>" +
        "<p>Only the parties strictly needed to fulfil your order: our payment provider (for the transaction) and our shipping carrier (name, address and phone number for delivery). We do not sell or rent personal data to anyone.</p>" +
        "<h2>4. How long we keep it</h2>" +
        "<p>Order and invoice data is kept for the legally required accounting period (7 years in Belgium). Correspondence is deleted when no longer needed.</p>" +
        "<h2>5. Your rights (GDPR)</h2>" +
        "<p>You may at any time request access to, correction, deletion or portability of your data, or object to its processing. E-mail <a href=\"mailto:noorperfumesofficial@gmail.com\">noorperfumesofficial@gmail.com</a> and we will respond within 30 days. You can also lodge a complaint with the Belgian Data Protection Authority (<a href=\"https://www.gegevensbeschermingsautoriteit.be\" target=\"_blank\" rel=\"noopener\">gegevensbeschermingsautoriteit.be</a>).</p>"
    },

    terms: {
      title: "Terms & Conditions",
      kicker: "Last updated: 15 July 2026",
      html:
        "<h2>1. Seller</h2>" + COMPANY_BLOCK +
        "<h2>2. Scope</h2>" +
        "<p>These terms apply to every order placed through this website. By placing an order you accept them.</p>" +
        "<h2>3. Products &amp; prices</h2>" +
        "<p>All prices are in euro (€) and include 21% Belgian VAT. Shipping costs, if any, are shown before you confirm your order. Obvious pricing errors do not bind us; if one occurs we will contact you before processing the order.</p>" +
        "<h2>4. Ordering &amp; payment</h2>" +
        "<p>An agreement is concluded once you receive our order confirmation by e-mail. We accept Bancontact, Visa, Mastercard, American Express, Apple&nbsp;Pay, Google&nbsp;Pay, iDEAL, PayPal and Klarna. Payments are processed securely by our certified payment provider.</p>" +
        "<h2>5. Delivery</h2>" +
        "<p>Orders are prepared within 1–2 business days. Delivery times communicated at checkout are estimates, not binding deadlines. Risk transfers to you upon delivery.</p>" +
        "<h2>6. Right of withdrawal</h2>" +
        "<p>As a consumer in the EU you may withdraw from your purchase within 14 days of receiving it, without giving a reason. For hygiene reasons this right lapses for perfumes that have been unsealed or used (art. VI.53 of the Belgian Code of Economic Law). See our <a href=\"#shipping\">Shipping &amp; Returns</a> policy for the procedure.</p>" +
        "<h2>7. Conformity &amp; warranty</h2>" +
        "<p>The legal warranty of conformity of 2 years applies to all products. If a product arrives damaged or incorrect, contact us within a reasonable time and we will replace or refund it.</p>" +
        "<h2>8. Disputes</h2>" +
        "<p>Belgian law applies. Consumers can also use the EU Online Dispute Resolution platform (<a href=\"https://ec.europa.eu/consumers/odr\" target=\"_blank\" rel=\"noopener\">ec.europa.eu/consumers/odr</a>) or the Belgian Consumer Mediation Service (<a href=\"https://consumentenombudsdienst.be\" target=\"_blank\" rel=\"noopener\">consumentenombudsdienst.be</a>).</p>"
    },

    shipping: {
      title: "Shipping & Returns",
      kicker: "Last updated: 15 July 2026",
      html:
        "<h2>Shipping</h2>" +
        "<ul>" +
        "<li>Orders are packed and handed to the carrier within 1–2 business days.</li>" +
        "<li>Belgium: typically 1–3 business days after dispatch. Rest of the EU: typically 3–7 business days.</li>" +
        "<li>Shipping costs (if any) are shown at checkout before you pay.</li>" +
        "<li>Every parcel is tracked; you receive the tracking link by e-mail.</li>" +
        "</ul>" +
        "<h2>14-Day Right of Withdrawal</h2>" +
        "<p>You may return your order within 14 days of receiving it, without giving a reason. Because perfume is a hygiene-sensitive product, returns are only accepted if the bottle is <strong>unopened and in its original sealed packaging</strong>.</p>" +
        "<p>To start a return:</p>" +
        "<ul>" +
        "<li>E-mail <a href=\"mailto:noorperfumesofficial@gmail.com\">noorperfumesofficial@gmail.com</a> with your order details.</li>" +
        "<li>Ship the item to: Noor Perfumes, Abdijstraat 197, 2020 Antwerpen, Belgium. Return shipping is at your cost unless the item arrived damaged or incorrect.</li>" +
        "<li>We refund the full purchase amount via your original payment method within 14 days of receiving the return.</li>" +
        "</ul>" +
        "<h2>Damaged or wrong item?</h2>" +
        "<p>Contact us within 48 hours of delivery with a photo and we will send a replacement or a full refund, including return costs.</p>"
    },

    cookies: {
      title: "Cookie Policy",
      kicker: "Last updated: 15 July 2026",
      html:
        '<p class="page-lede">Short version: this site sets no advertising or tracking cookies at all.</p>' +
        "<h2>What we use</h2>" +
        "<ul>" +
        "<li><strong>Strictly necessary storage</strong>: your shopping cart is remembered in your own browser (local storage, key <em>noor-cart</em>) so it survives a page refresh. It never leaves your device and contains no personal data.</li>" +
        "<li><strong>Fonts</strong>: the typeface is loaded from Google Fonts, which may log your IP address for delivery purposes. No cookies are set by this request.</li>" +
        "</ul>" +
        "<h2>What we don't use</h2>" +
        "<p>No analytics, no advertising pixels, no social media trackers, no profiling. That is why you don't see a cookie banner here. There is nothing to consent to.</p>" +
        "<h2>Clearing the stored cart</h2>" +
        "<p>You can remove the stored cart at any time by clearing your browser's site data for this website.</p>"
    }
  };

  function openPage(key) {
    var page = PAGES[key];
    if (!page) return;
    savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    pageBody.innerHTML =
      (page.kicker ? '<div class="page-kicker">' + page.kicker + "</div>" : "") +
      '<h1 id="pageTitleAnchor" tabindex="-1">' + page.title + "</h1>" +
      page.html;
    pageOverlay.classList.add("open");
    pageOverlay.setAttribute("aria-hidden", "false");
    pageBackdrop.classList.add("show");
    pageScroll.scrollTop = 0;
    document.body.style.overflow = "hidden";
    closeDrawer();
    var h1 = document.getElementById("pageTitleAnchor");
    if (h1) h1.focus({ preventScroll: true });
  }

  function closePage() {
    pageOverlay.classList.remove("open");
    pageOverlay.setAttribute("aria-hidden", "true");
    pageBackdrop.classList.remove("show");
    if (!cartDrawer.classList.contains("open")) document.body.style.overflow = "";
    window.scrollTo(0, savedScrollPosition);
  }

  function route() {
    var key = location.hash.replace("#", "");
    if (PAGES[key]) {
      openPage(key);
    } else {
      closePage();
    }
  }
  window.addEventListener("hashchange", route);

  document.getElementById("infoBadge").addEventListener("click", function () {
    location.hash = "#info";
  });
  document.getElementById("pageBack").addEventListener("click", function () {
    if (location.hash) {
      location.hash = "";
    } else {
      closePage();
    }
  });

  pageBackdrop.addEventListener("click", function () {
    if (location.hash) {
      location.hash = "";
    } else {
      closePage();
    }
  });

  // Drag the page drawer handle down to close
  (function () {
    var startY = null;
    var currentY = 0;
    function onStart(e) {
      startY = (e.touches ? e.touches[0].clientY : e.clientY);
      pageOverlay.style.transition = "none";
    }
    function onMove(e) {
      if (startY === null) return;
      var y = (e.touches ? e.touches[0].clientY : e.clientY);
      currentY = Math.max(0, y - startY);
      pageOverlay.style.transform = "translateY(" + currentY + "px)";
    }
    function onEnd() {
      if (startY === null) return;
      pageOverlay.style.transition = "";
      pageOverlay.style.transform = "";
      if (currentY > 90) { 
        if (location.hash) {
          location.hash = "";
        } else {
          closePage();
        }
      }
      startY = null;
      currentY = 0;
    }
    pageDrawerHandle.addEventListener("touchstart", onStart, { passive: true });
    pageDrawerHandle.addEventListener("touchmove", onMove, { passive: true });
    pageDrawerHandle.addEventListener("touchend", onEnd);
    pageDrawerHandle.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    pageDrawerHandle.addEventListener("click", function () {
      if (location.hash) {
        location.hash = "";
      } else {
        closePage();
      }
    });
  })();

  /* Escape closes whatever is on top */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (pageOverlay.classList.contains("open")) {
      location.hash = "";
    } else if (cartDrawer.classList.contains("open")) {
      closeDrawer();
    } else {
      togglePanelEscape();
    }
  });
  function togglePanelEscape() {
    grid.querySelectorAll(".product-block.info-open").forEach(function (b) { setInfo(b, false); });
  }

  /* ---------- header morph: Noor Perfumes -> other brands on scroll ---------- */
  (function headerMorph() {
    var header = document.getElementById("siteHeader");
    var brandNoor = document.getElementById("brandNoor");
    var brandAlt = document.getElementById("brandAlt");
    var headerLogo = document.getElementById("headerLogo");
    if (!header || !brandNoor || !brandAlt) return;
    var FADE = 280; // px over which the crossfade happens
    var ticking = false;
    function apply() {
      ticking = false;
      var hb = header.getBoundingClientRect().bottom;
      // Anchor the morph to the END OF THE REAL NOOR PHOTOS (the last product
      // that has an actual image) — row 2 on desktop, row 4 on mobile — not the
      // bottom of the whole 200-item catalogue.
      var reals = grid.querySelectorAll(".product-photo.has-photo");
      var refEl = reals.length ? reals[reals.length - 1].closest(".product-block") : null;
      var rb = refEl ? refEl.getBoundingClientRect().bottom : grid.getBoundingClientRect().bottom;
      // m: 0 while the real Noor products are still below the header, -> 1 as
      // their last row rises up to just under the header.
      var m = (hb + FADE - rb) / FADE;
      m = m < 0 ? 0 : (m > 1 ? 1 : m);
      brandNoor.style.opacity = String(1 - m);
      brandAlt.style.opacity = String(m);
      if (headerLogo) {
        headerLogo.style.opacity = String(m);
        headerLogo.classList.toggle("is-visible", m >= 0.05);
      }
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(apply); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.NOOR_HEADER_SYNC = apply; // re-run after the grid re-renders
    apply();
    if (headerLogo) {
      headerLogo.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  })();

  /* ---------- boot ---------- */
  // Load the live catalogue from Supabase (falls back to the bundled array while
  // you're still setting up, so the page never renders empty).
  updateCartUI();
  route(); // honour a legal-page hash on load (e.g. link from an e-mail)

  function startWithProducts(list) {
    PRODUCTS = (list && list.length) ? list : (window.NOOR_PRODUCTS || []);
    visibleCount = PAGE_SIZE;
    renderGrid();
    updateCartUI();
  }

  if (window.NOOR_STORE && typeof window.NOOR_STORE.loadProducts === "function") {
    window.NOOR_STORE.loadProducts().then(startWithProducts).catch(function () {
      startWithProducts(window.NOOR_PRODUCTS || []);
    });
  } else {
    startWithProducts(window.NOOR_PRODUCTS || []);
  }
})();
