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
        if (qty > 0 && window.NOOR_PRODUCTS.some(function (p) { return p.id === id; })) {
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

  function notesPretty(notes) {
    return notes.split(",").map(function (s) { return s.trim(); }).join(" · ");
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

      var photoInner = p.photo
        ? '<img src="' + p.photo + '" alt="' + esc(p.name) + ' — extrait de parfum" loading="lazy">'
        : '<span class="ph-mark">' + esc(p.initial) + "</span>";
      var photoClass = p.photo ? "product-photo has-photo" : "product-photo";

      block.innerHTML =
        '<div class="' + photoClass + '" tabindex="0" role="button" aria-expanded="false" ' +
          'aria-label="Notes and facts about ' + esc(p.name) + '" data-panel="' + p.id + '">' +
          photoInner +
          '<div class="photo-panel" aria-hidden="true">' +
            '<div class="panel-kicker">Inside this perfume</div>' +
            '<div class="panel-notes">' + esc(notesPretty(p.notes)) + "</div>" +
            '<p class="panel-fact">' + esc(p.fact) + "</p>" +
          "</div>" +
        "</div>" +
        '<div class="product-info">' +
          '<div class="product-title">' + esc(p.name) + "</div>" +
          '<div class="product-sub">' + esc(p.ml) + " — " + esc(p.notes) + "</div>" +
          '<div class="product-price">' + fmt(p.price) + "</div>" +
        "</div>" +
        '<div class="product-bar">' +
          '<button class="buy-btn" data-id="' + p.id + '">' + (anyBought ? "Buy this too" : "Buy") + "</button>" +
        "</div>";

      grid.appendChild(block);

      if (!filterText && idx === 6) {
        var quote = document.createElement("div");
        quote.className = "product-block";
        quote.style.padding = "0";
        quote.innerHTML =
          '<div class="quote-block">' +
            '<div class="quote-inner">' +
              '<div class="quote-cap"></div>' +
              '<div class="quote-lines">' +
                '<svg viewBox="0 0 56 14"><path d="M0 7 C7 0, 14 14, 21 7 S35 0, 42 7 S53 14, 56 7" stroke="#B08D57" stroke-width="1.2" fill="none"/></svg>' +
              "</div>" +
              '<div class="quote-text">"Scent is the only architecture you cannot see, yet never forget."</div>' +
              '<div class="quote-sig">— Noor, Founder</div>' +
            "</div>" +
          "</div>";
        grid.appendChild(quote);
      }
    });

    loadMoreWrap.style.display = (visibleCount < filtered.length) ? "flex" : "none";
  }

  /* one delegated listener instead of per-render bindings */
  grid.addEventListener("click", function (e) {
    var buy = e.target.closest(".buy-btn[data-id]");
    if (buy) { handleBuy(buy); return; }
    var photo = e.target.closest(".product-photo[data-panel]");
    if (photo) togglePanel(photo);
  });
  grid.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var photo = e.target.closest(".product-photo[data-panel]");
    if (photo) {
      e.preventDefault();
      togglePanel(photo);
    }
  });

  function togglePanel(photo) {
    var isOpen = photo.classList.contains("panel-open");
    grid.querySelectorAll(".product-photo.panel-open").forEach(function (el) {
      el.classList.remove("panel-open");
      el.setAttribute("aria-expanded", "false");
      el.querySelector(".photo-panel").setAttribute("aria-hidden", "true");
    });
    if (!isOpen) {
      photo.classList.add("panel-open");
      photo.setAttribute("aria-expanded", "true");
      photo.querySelector(".photo-panel").setAttribute("aria-hidden", "false");
    }
  }

  function handleBuy(btn) {
    var id = btn.getAttribute("data-id");
    cart[id] = (cart[id] || 0) + 1;

    btn.classList.remove("flash");
    void btn.offsetWidth;
    btn.classList.add("flash");

    if (!anyBought) {
      anyBought = true;
      document.querySelectorAll(".buy-btn[data-id]").forEach(function (b) {
        b.textContent = "Buy this too";
      });
    }

    saveCart();
    updateCartUI();
  }

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
          '<div class="cart-row-name">' + esc(p.name) + (qty > 1 ? " × " + qty : "") + "</div>" +
          '<div class="cart-row-meta">' + esc(p.ml) + " — " + esc(p.notes) + "</div>" +
        "</div>" +
        '<div class="cart-row-right">' +
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
    { id: "f-postal", err: "e-postal", label: "postal code" },
    { id: "f-city", err: "e-city", label: "city" },
    { id: "f-firstname", err: "e-firstname", label: "first name" },
    { id: "f-lastname", err: "e-lastname", label: "last name" },
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
    } else if (f.id === "f-postal" && !/^[A-Za-z0-9\- ]{4,10}$/.test(val)) {
      msg = "Please enter a valid postal code.";
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

    payConfirm.classList.add("show");
    cart = {};
    anyBought = false;
    saveCart();
    document.querySelectorAll(".buy-btn[data-id]").forEach(function (b) { b.textContent = "Buy"; });
    updateCartUI();

    document.getElementById("checkoutForm").reset();
    fields.forEach(function (f) {
      document.getElementById(f.id).classList.remove("invalid");
      document.getElementById(f.err).textContent = "";
    });

    setTimeout(function () {
      payConfirm.classList.remove("show");
      closeDrawer();
    }, 2600);
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
        "Our main website is under construction and should be live by the start of November — in the meanwhile, enjoy our perfumes. " +
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
        "<h2>Returns &mdash; 14-day right of withdrawal</h2>" +
        "<p>You may return your order within 14 days of receiving it, without giving a reason. Because perfume is a hygiene-sensitive product, returns are only accepted if the bottle is <strong>unopened and in its original sealed packaging</strong>.</p>" +
        "<p>To start a return:</p>" +
        "<ul>" +
        "<li>E-mail <a href=\"mailto:noorperfumesofficial@gmail.com\">noorperfumesofficial@gmail.com</a> with your order details.</li>" +
        "<li>Ship the item to: Noor Perfumes, Abdijstraat 197, 2020 Antwerpen, Belgium. Return shipping is at your cost unless the item arrived damaged or incorrect.</li>" +
        "<li>We refund the full purchase amount via your original payment method within 14 days of receiving the return.</li>" +
        "</ul>" +
        "<h2>Damaged or wrong item?</h2>" +
        "<p>Contact us within 48 hours of delivery with a photo and we will send a replacement or a full refund &mdash; including return costs.</p>"
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
        "<p>No analytics, no advertising pixels, no social media trackers, no profiling. That is why you don't see a cookie banner here &mdash; there is nothing to consent to.</p>" +
        "<h2>Clearing the stored cart</h2>" +
        "<p>You can remove the stored cart at any time by clearing your browser's site data for this website.</p>"
    }
  };

  function openPage(key) {
    var page = PAGES[key];
    if (!page) return;
    pageBody.innerHTML =
      (page.kicker ? '<div class="page-kicker">' + page.kicker + "</div>" : "") +
      '<h1 id="pageTitleAnchor" tabindex="-1">' + page.title + "</h1>" +
      page.html;
    pageOverlay.classList.add("open");
    pageScroll.scrollTop = 0;
    document.body.style.overflow = "hidden";
    closeDrawer();
    var h1 = document.getElementById("pageTitleAnchor");
    if (h1) h1.focus({ preventScroll: true });
  }

  function closePage() {
    pageOverlay.classList.remove("open");
    if (!cartDrawer.classList.contains("open")) document.body.style.overflow = "";
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
    grid.querySelectorAll(".product-photo.panel-open").forEach(function (el) {
      el.classList.remove("panel-open");
      el.setAttribute("aria-expanded", "false");
    });
  }

  /* ---------- boot ---------- */
  renderGrid();
  updateCartUI();
  route(); // honour a legal-page hash on load (e.g. link from an e-mail)
})();
