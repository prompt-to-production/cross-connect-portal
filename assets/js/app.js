/* DartPoints cross-connect order page. No dependencies. */
(function () {
  "use strict";

  var cfg = Object.assign(
    { orderEndpoint: "", facilities: [], manualSubmitNote: "" },
    window.DP_CONFIG || {}
  );

  var rawEndpoint = typeof cfg.orderEndpoint === "string" ? cfg.orderEndpoint.trim() : "";
  var endpoint = /^https:\/\/[^\s]+$/i.test(rawEndpoint) ? rawEndpoint : "";
  if (rawEndpoint && !endpoint) {
    console.warn("DP_CONFIG.orderEndpoint must be an https:// URL. Online ordering is off.");
  }

  var REQUIREMENT_TEXT =
    "DartPoints will be unable to accept or process any cross-connect orders unless we have all the above information. " +
    "Providing incomplete or incorrect information may result in delays and additional installation fees.";

  var byId = function (id) { return document.getElementById(id); };
  var form = byId("order-form");
  var panel = byId("panel");
  var reviewSection = byId("review");
  var doneSection = byId("done");

  var state = { attempted: false, cableKey: "none", tallyTotal: 0 };

  /* ---------- Facilities: dropdown when configured, free text otherwise ---------- */

  var facilityList = (Array.isArray(cfg.facilities) ? cfg.facilities : [])
    .map(function (f) {
      var name = "";
      var address = "";
      if (typeof f === "string") name = f.trim();
      else if (f && typeof f === "object") {
        name = String(f.name || "").trim();
        address = String(f.address || "").trim();
        if (!name) { name = address; address = ""; }
      }
      if (!name) return null;
      return {
        name: name,
        address: address,
        line: address ? name + " (" + address + ")" : name, // for the order and the download
        display: address ? name + "\n" + address : name    // for the diagram and the review
      };
    })
    .filter(Boolean);

  if (facilityList.length) {
    var oldInput = byId("facility");
    var select = document.createElement("select");
    select.id = "facility";
    select.name = "facility";
    select.className = "input select";
    select.required = true;
    select.setAttribute("aria-describedby", "facility-hint facility-address facility-error");
    var placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose a data center";
    select.appendChild(placeholder);
    facilityList.forEach(function (f, i) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = f.name;
      select.appendChild(opt);
    });
    oldInput.replaceWith(select);

    var addressLine = document.createElement("p");
    addressLine.className = "facility-address";
    addressLine.id = "facility-address";
    addressLine.hidden = true;
    select.insertAdjacentElement("afterend", addressLine);
  }

  function selectedFacility() {
    if (!facilityList.length) return null;
    var v = val("facility");
    return v === "" ? null : facilityList[Number(v)] || null;
  }

  /* ---------- Reading the form ---------- */

  function val(id) {
    var el = byId(id);
    return el ? String(el.value || "").trim() : "";
  }

  function radio(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function connector(id) {
    var choice = val(id);
    return choice === "Other" ? val(id + "Other") : choice;
  }

  function getData() {
    var media = radio("media");
    var isFiber = media === "Fiber";
    var fiberChoice = isFiber ? radio("fiberType") : "";
    var fac = selectedFacility();
    var typed = facilityList.length ? "" : val("facility");
    return {
      facility: fac ? fac.line : typed,
      facilityDisplay: fac ? fac.display : typed,
      carrier: val("carrier"),
      carrierCircuit: val("carrierCircuit"),
      carrierRack: val("carrierRack"),
      carrierDevice: val("carrierDevice"),
      customerRack: val("customerRack"),
      customerDevice: val("customerDevice"),
      media: media,
      isFiber: isFiber,
      fiberChoice: fiberChoice,
      fiberType: fiberChoice === "Other" ? val("fiberTypeOther") : fiberChoice,
      connectorCarrier: isFiber ? connector("connectorCarrier") : "",
      connectorCustomer: isFiber ? connector("connectorCustomer") : "",
      name: val("name"),
      company: val("company"),
      email: val("email"),
      phone: val("phone"),
      notes: val("notes"),
      confirm: byId("confirm").checked,
      gotcha: val("website")
    };
  }

  /* The items on the DartPoints Cross-Connect Checklist, in its order. */
  var CHECKLIST = [
    { label: "Location Address", done: function (d) { return !!d.facility; } },
    { label: "Carrier", done: function (d) { return !!d.carrier; } },
    { label: "Carrier Rack Location", done: function (d) { return !!d.carrierRack; } },
    { label: "Carrier Device Info and Port(s)", done: function (d) { return !!d.carrierDevice; } },
    { label: "Carrier Circuit ID", done: function (d) { return !!d.carrierCircuit; } },
    { label: "Customer Rack Location", done: function (d) { return !!d.customerRack; } },
    { label: "Customer Device Info and Port(s)", done: function (d) { return !!d.customerDevice; } },
    { label: "Media Type (Copper or Fiber)", done: function (d) { return !!d.media; } },
    { label: "Fiber Type", fiberOnly: true, done: function (d) { return !!d.fiberType; } },
    { label: "Fiber Connector Types", fiberOnly: true, done: function (d) { return !!(d.connectorCarrier && d.connectorCustomer); } }
  ];

  /* ---------- Validation ---------- */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^\+?[0-9().\-\s]+(?:\s*(?:x|ext\.?)\s*[0-9]+)?$/i;

  function validate(d) {
    var errors = [];
    function add(field, target, message) { errors.push({ field: field, target: target, message: message }); }

    if (!d.facility) {
      add("facility", "facility", facilityList.length ? "Choose the data center for this cross-connect." : "Enter the location address.");
    }
    if (!d.carrier) add("carrier", "carrier", "Enter the carrier name.");
    if (!d.carrierCircuit) add("carrierCircuit", "carrierCircuit", "Enter the carrier circuit ID.");
    if (!d.carrierRack) add("carrierRack", "carrierRack", "Enter the carrier rack location.");
    if (!d.carrierDevice) add("carrierDevice", "carrierDevice", "Enter the carrier device and port(s).");
    if (!d.customerRack) add("customerRack", "customerRack", "Enter your rack location.");
    if (!d.customerDevice) add("customerDevice", "customerDevice", "Enter your device and port(s).");

    if (!d.media) {
      add("media", firstRadioId("media"), "Choose copper or fiber.");
    } else if (d.isFiber) {
      if (!d.fiberChoice) add("fiberType", firstRadioId("fiberType"), "Choose a fiber type.");
      else if (!d.fiberType) add("fiberType", "fiberTypeOther", "Describe the fiber type.");

      var cc = val("connectorCarrier");
      var cu = val("connectorCustomer");
      if (!cc) add("connectors", "connectorCarrier", "Choose the connector for the carrier end.");
      else if (cc === "Other" && !d.connectorCarrier) add("connectors", "connectorCarrierOther", "Describe the carrier end connector.");
      else if (!cu) add("connectors", "connectorCustomer", "Choose the connector for your end.");
      else if (cu === "Other" && !d.connectorCustomer) add("connectors", "connectorCustomerOther", "Describe your end connector.");
    }

    if (!d.name) add("name", "name", "Enter your full name.");
    if (!d.company) add("company", "company", "Enter your company name.");
    if (!d.email) add("email", "email", "Enter your email address.");
    else if (!EMAIL_RE.test(d.email)) add("email", "email", "Enter an email address like name@example.com.");
    if (d.phone && (!PHONE_RE.test(d.phone) || d.phone.replace(/\D/g, "").length < 7)) {
      add("phone", "phone", "Enter a phone number using digits, spaces, and + ( ) -, or leave it blank.");
    }
    if (!d.confirm) add("confirm", "confirm", "Confirm the information is complete and correct.");

    return errors;
  }

  function firstRadioId(name) {
    var el = form.querySelector('input[name="' + name + '"]');
    if (el && !el.id) el.id = name + "-first";
    return el ? el.id : name;
  }

  var FIELD_CONTROLS = {
    media: function () { return form.querySelectorAll('input[name="media"]'); },
    fiberType: function () { return form.querySelectorAll('input[name="fiberType"], #fiberTypeOther'); },
    connectors: function () { return form.querySelectorAll("#connectorCarrier, #connectorCustomer, #connectorCarrierOther, #connectorCustomerOther"); }
  };

  function controlsFor(field) {
    if (FIELD_CONTROLS[field]) return FIELD_CONTROLS[field]();
    var el = byId(field);
    return el ? [el] : [];
  }

  function setFieldError(field, message) {
    var wrap = form.querySelector('[data-field="' + field + '"]');
    var errEl = byId(field + "-error");
    if (!wrap || !errEl) return;
    wrap.classList.toggle("has-error", !!message);
    errEl.textContent = message || "";
    errEl.hidden = !message;
    Array.prototype.forEach.call(controlsFor(field), function (c) {
      if (message) c.setAttribute("aria-invalid", "true");
      else c.removeAttribute("aria-invalid");
    });
  }

  var ALL_FIELDS = ["facility", "carrier", "carrierCircuit", "carrierRack", "carrierDevice", "customerRack",
    "customerDevice", "media", "fiberType", "connectors", "name", "company", "email", "phone", "confirm"];

  /* Errors appear after the first review attempt, then update as the customer fixes them. */
  function renderErrors(errors) {
    var byField = {};
    errors.forEach(function (e) { if (!byField[e.field]) byField[e.field] = e; });
    ALL_FIELDS.forEach(function (f) {
      setFieldError(f, state.attempted && byField[f] ? byField[f].message : "");
    });
    if (state.attempted) renderSummary(errors);
  }

  function renderSummary(errors) {
    var box = byId("error-summary");
    var list = byId("error-summary-list");
    list.textContent = "";
    var seen = {};
    errors.forEach(function (e) {
      if (seen[e.field]) return;
      seen[e.field] = true;
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + e.target;
      a.textContent = e.message;
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        var t = byId(e.target);
        if (t) {
          t.focus({ preventScroll: true });
          t.scrollIntoView({ block: "center" });
        }
      });
      li.appendChild(a);
      list.appendChild(li);
    });
    box.hidden = errors.length === 0;
  }

  /* ---------- Conditional fields ---------- */

  function syncConditionalFields() {
    var addressLine = byId("facility-address");
    if (addressLine) {
      var fac = selectedFacility();
      addressLine.textContent = fac && fac.address ? fac.address : "";
      addressLine.hidden = !(fac && fac.address);
    }
    var media = radio("media");
    byId("fiber-fields").hidden = media !== "Fiber";
    byId("fiberTypeOther-wrap").hidden = radio("fiberType") !== "Other";
    byId("connectorCarrierOther-wrap").hidden = val("connectorCarrier") !== "Other";
    byId("connectorCustomerOther-wrap").hidden = val("connectorCustomer") !== "Other";
  }

  /* ---------- Live diagram ---------- */

  function mediaLabel(d) {
    if (!d.media) return "";
    if (!d.isFiber) return "Copper";
    var line = d.fiberChoice === "Other" ? (d.fiberType ? "Fiber: " + d.fiberType : "Fiber") :
      d.fiberType ? d.fiberType + " fiber" : "Fiber";
    if (d.connectorCarrier && d.connectorCustomer) line += "\n" + d.connectorCarrier + " to " + d.connectorCustomer;
    return line;
  }

  function updatePanel(d) {
    var out = {
      facility: d.facilityDisplay,
      carrier: d.carrier,
      carrierRack: d.carrierRack,
      carrierDevice: d.carrierDevice,
      carrierCircuit: d.carrierCircuit,
      connectorCarrier: d.connectorCarrier,
      company: d.company,
      customerRack: d.customerRack,
      customerDevice: d.customerDevice,
      connectorCustomer: d.connectorCustomer,
      media: mediaLabel(d)
    };
    Array.prototype.forEach.call(panel.querySelectorAll("[data-out]"), function (el) {
      var v = out[el.getAttribute("data-out")] || "";
      el.textContent = v || el.getAttribute("data-empty") || "";
      el.classList.toggle("is-empty", !v);
    });

    panel.setAttribute("data-media", d.media || "none");
    panel.setAttribute("data-fiber", d.fiberChoice || "");

    var carrierDone = !!(d.carrier && d.carrierRack && d.carrierDevice && d.carrierCircuit && (!d.isFiber || d.connectorCarrier));
    var customerDone = !!(d.customerRack && d.customerDevice && (!d.isFiber || d.connectorCustomer));
    panel.querySelector(".end-carrier").setAttribute("data-complete", String(carrierDone));
    panel.querySelector(".end-customer").setAttribute("data-complete", String(customerDone));

    // Draw the cable once each time its type changes.
    var cableKey = d.media ? d.media + "/" + d.fiberChoice : "none";
    if (cableKey !== state.cableKey && d.media) {
      panel.classList.remove("is-drawing");
      void panel.offsetWidth;
      panel.classList.add("is-drawing");
    }
    state.cableKey = cableKey;

    // Checklist tally
    var items = CHECKLIST.filter(function (c) { return !c.fiberOnly || d.isFiber; });
    var done = items.filter(function (c) { return c.done(d); }).length;
    Array.prototype.forEach.call(document.querySelectorAll('[data-tally="done"]'), function (el) { el.textContent = done; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-tally="total"]'), function (el) { el.textContent = items.length; });
    var bar = panel.querySelector('[data-tally="bar"]');
    if (state.tallyTotal !== items.length) {
      bar.textContent = "";
      items.forEach(function () { bar.appendChild(document.createElement("span")); });
      state.tallyTotal = items.length;
    }
    Array.prototype.forEach.call(bar.children, function (seg, i) {
      seg.classList.toggle("is-done", i < done);
    });
  }

  /* Keep the cable curve true to the panel's size. */
  var cable = panel.querySelector(".cable");
  var cableSvg = cable.querySelector("svg");
  var cablePath = cable.querySelector("path");
  function layoutCable() {
    var w = Math.max(1, Math.round(cable.clientWidth));
    var h = Math.max(1, Math.round(cable.clientHeight));
    var x1 = Math.round(w * 0.22);
    var x2 = Math.round(w * 0.78);
    cableSvg.setAttribute("viewBox", "0 0 " + w + " " + h);
    cablePath.setAttribute("d", "M" + x1 + " 0 C" + x1 + " " + Math.round(h * 0.58) + " " + x2 + " " + Math.round(h * 0.42) + " " + x2 + " " + h);
  }
  if ("ResizeObserver" in window) new ResizeObserver(layoutCable).observe(cable);
  else window.addEventListener("resize", layoutCable);
  layoutCable();

  /* ---------- Update loop ---------- */

  function update() {
    syncConditionalFields();
    var d = getData();
    updatePanel(d);
    renderErrors(validate(d));
  }

  form.addEventListener("input", update);
  form.addEventListener("change", update);

  /* ---------- Steps ---------- */

  var TITLES = {
    form: "Order a cross-connect | DartPoints",
    review: "Review your order | DartPoints",
    done: "Order sent | DartPoints"
  };

  function showStep(step) {
    form.hidden = step !== "form";
    reviewSection.hidden = step !== "review";
    doneSection.hidden = step !== "done";
    document.title = TITLES[step];
    var heading = byId(step === "form" ? "order-heading" : step === "review" ? "review-heading" : "done-heading");
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "start" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    state.attempted = true;
    syncConditionalFields();
    var d = getData();
    var errors = validate(d);
    updatePanel(d);
    renderErrors(errors);
    if (errors.length) {
      var box = byId("error-summary");
      box.focus({ preventScroll: true });
      box.scrollIntoView({ block: "start" });
      return;
    }
    renderReview(d);
    showStep("review");
  });

  /* ---------- Review ---------- */

  function reviewGroups(d) {
    var groups = [
      ["Location", [["Location address", d.facilityDisplay]]],
      ["Carrier end", [
        ["Carrier", d.carrier],
        ["Carrier circuit ID", d.carrierCircuit],
        ["Carrier rack location", d.carrierRack],
        ["Carrier device info and port(s)", d.carrierDevice]
      ]],
      ["Your end", [
        ["Your rack location", d.customerRack],
        ["Your device info and port(s)", d.customerDevice]
      ]],
      ["Cable", [
        ["Media type", d.media],
        ["Lead time", d.isFiber ? "15 business days" : "10 business days"]
      ]],
      ["Your contact details", [
        ["Full name", d.name],
        ["Company", d.company],
        ["Email", d.email],
        ["Phone", d.phone || "Not provided"]
      ]]
    ];
    if (d.isFiber) {
      groups[3][1].push(["Fiber type", d.fiberType]);
      groups[3][1].push(["Fiber connector types", "Carrier end: " + d.connectorCarrier + "\nYour end: " + d.connectorCustomer]);
    }
    if (d.notes) groups[4][1].push(["Notes", d.notes]);
    return groups;
  }

  function renderReview(d) {
    var table = byId("review-table");
    Array.prototype.slice.call(table.tBodies).forEach(function (tb) { tb.remove(); });
    reviewGroups(d).forEach(function (g) {
      var tbody = document.createElement("tbody");
      var head = document.createElement("tr");
      head.className = "group-row";
      var hth = document.createElement("th");
      hth.colSpan = 2;
      hth.scope = "rowgroup";
      hth.textContent = g[0];
      head.appendChild(hth);
      tbody.appendChild(head);
      g[1].forEach(function (row) {
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        th.scope = "row";
        th.textContent = row[0];
        var td = document.createElement("td");
        td.textContent = row[1];
        tr.appendChild(th);
        tr.appendChild(td);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
    });
    byId("print-date").textContent = "Completed " + longDate(new Date()) + ". " + REQUIREMENT_TEXT;

    var connected = !!endpoint;
    byId("send-button").hidden = !connected;
    byId("manual-notice").hidden = connected;
    byId("manual-note-text").textContent = cfg.manualSubmitNote ||
      "Online ordering isn't connected yet, so this page can't send your order. Download or print the completed checklist and send it to your DartPoints contact.";
    var dl = byId("download-button-review");
    dl.hidden = connected;
    dl.className = "button button-primary";
    byId("print-button-review").hidden = connected;
    byId("send-error").hidden = true;
  }

  byId("edit-button").addEventListener("click", function () {
    showStep("form");
  });

  /* ---------- Sending ---------- */

  function buildPayload(d) {
    var fd = new FormData();
    fd.append("_subject", "Cross-connect order: " + d.company + ", " + d.carrier);
    fd.append("Location Address", d.facility);
    fd.append("Carrier", d.carrier);
    fd.append("Carrier Rack Location", d.carrierRack);
    fd.append("Carrier Device Info and Port(s)", d.carrierDevice);
    fd.append("Carrier Circuit ID", d.carrierCircuit);
    fd.append("Customer Rack Location", d.customerRack);
    fd.append("Customer Device Info and Port(s)", d.customerDevice);
    fd.append("Media Type (Copper or Fiber)", d.media);
    fd.append("Lead Time", d.isFiber ? "15 business days" : "10 business days");
    fd.append("Fiber Type", d.isFiber ? d.fiberType : "Not applicable");
    fd.append("Fiber Connector Types", d.isFiber ? "Carrier end: " + d.connectorCarrier + "; Customer end: " + d.connectorCustomer : "Not applicable");
    fd.append("Contact Name", d.name);
    fd.append("Company", d.company);
    fd.append("email", d.email);
    fd.append("Phone", d.phone || "Not provided");
    fd.append("Notes", d.notes || "None");
    fd.append("Information Confirmed", d.confirm ? "Yes" : "No");
    fd.append("_gotcha", d.gotcha);
    return fd;
  }

  var sendButton = byId("send-button");
  sendButton.addEventListener("click", function () {
    if (!endpoint || sendButton.disabled) return;
    var d = getData();
    var errors = validate(d);
    if (errors.length) { // Shouldn't happen, but never send an incomplete order.
      showStep("form");
      state.attempted = true;
      renderErrors(errors);
      return;
    }

    byId("send-error").hidden = true;
    sendButton.disabled = true;
    sendButton.textContent = "Sending order…";
    byId("edit-button").disabled = true;

    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;

    fetch(endpoint, {
      method: "POST",
      body: buildPayload(d),
      headers: { Accept: "application/json" },
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (res.ok) return null;
        return res.json().catch(function () { return null; }).then(function (body) {
          var detail = body && Array.isArray(body.errors)
            ? body.errors.map(function (x) { return x && x.message; }).filter(Boolean).join(" ")
            : "";
          throw new Error(detail || "The order service returned an error (" + res.status + ").");
        });
      })
      .then(function () {
        byId("done-text").textContent = "Your cross-connect order was sent to DartPoints.";
        showStep("done");
      })
      .catch(function (err) {
        var reason = err && err.name === "AbortError" ? "The order service didn't respond." :
          err instanceof TypeError ? "The order service couldn't be reached. Check your connection." :
          (err && err.message) || "Something went wrong while sending.";
        if (!/[.!?]$/.test(reason)) reason += ".";
        byId("send-error-text").textContent = reason + " Try again, or download the checklist and send it to your DartPoints contact.";
        var errBox = byId("send-error");
        errBox.hidden = false;
        var dl = byId("download-button-review");
        dl.hidden = false;
        dl.className = "button button-secondary";
        errBox.focus();
      })
      .then(function () {
        if (timer) clearTimeout(timer);
        sendButton.disabled = false;
        sendButton.textContent = "Send order";
        byId("edit-button").disabled = false;
      });
  });

  /* ---------- Download and print ---------- */

  function longDate(dt) {
    return dt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function isoDate(dt) {
    var m = String(dt.getMonth() + 1).padStart(2, "0");
    var day = String(dt.getDate()).padStart(2, "0");
    return dt.getFullYear() + "-" + m + "-" + day;
  }

  function checklistText(d) {
    function line(label, value) {
      var v = String(value || "").replace(/\r?\n/g, "\r\n    ");
      return label + ": " + v;
    }
    var rows = [
      "DartPoints Cross-Connect Checklist",
      "Completed " + longDate(new Date()),
      "",
      line("Location Address", d.facility),
      line("Carrier", d.carrier),
      line("Carrier Rack Location", d.carrierRack),
      line("Carrier Device Info and Port(s)", d.carrierDevice),
      line("Carrier Circuit ID", d.carrierCircuit),
      line("Customer Rack Location", d.customerRack),
      line("Customer Device Info and Port(s)", d.customerDevice),
      line("Media Type (Copper or Fiber)", d.media),
      line("Lead Time", d.isFiber ? "15 business days" : "10 business days"),
      line("Fiber Type", d.isFiber ? d.fiberType : "Not applicable"),
      line("Fiber Connector Types", d.isFiber ? "Carrier end " + d.connectorCarrier + "; customer end " + d.connectorCustomer : "Not applicable"),
      "",
      "Contact",
      line("Name", d.name),
      line("Company", d.company),
      line("Email", d.email),
      line("Phone", d.phone || "Not provided")
    ];
    if (d.notes) rows.push(line("Notes", d.notes));
    rows.push("", REQUIREMENT_TEXT, "");
    return rows.join("\r\n");
  }

  function slug(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  }

  function downloadChecklist() {
    var d = getData();
    var blob = new Blob([checklistText(d)], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = ["cross-connect-order", slug(d.company), isoDate(new Date())].filter(Boolean).join("-") + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  byId("download-button-review").addEventListener("click", downloadChecklist);
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    if (btn.getAttribute("data-action") === "download") downloadChecklist();
    if (btn.getAttribute("data-action") === "print") window.print();
  });

  /* ---------- New order ---------- */

  byId("new-order-button").addEventListener("click", function () {
    form.reset();
    state.attempted = false;
    byId("error-summary").hidden = true;
    update();
    showStep("form");
    byId("facility").focus();
  });

  // Browsers can restore field values on back/forward navigation.
  window.addEventListener("pageshow", update);
  update();
})();
