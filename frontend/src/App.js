(function () {
  const h = React.createElement;
  const { useEffect, useMemo, useState } = React;

  const navItems = [
    ["dashboard", "Dashboard", "grid"],
    ["patients", "Patients", "users"],
    ["inventory", "Grocery inventory", "box"],
    ["recipes", "Recipe recommendations", "sparkles"],
    ["cart", "Shopping cart", "cart"],
    ["orders", "Orders", "clipboard"],
  ];
  const paths = {
    grid: "M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    box: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.3 7l8.7 5 8.7-5 M12 22V12",
    sparkles: "m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z M19 14l1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14z",
    cart: "M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6 M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
    clipboard: "M9 5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 3h6v4H9z M9 12h6 M9 16h6",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.76.6l-.04.07h-3.4l-.04-.07a1.7 1.7 0 0 0-1.76-.6l-.08.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 9.64 15l-.08-.04v-3.4l.08-.04a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-2.94.08.02a1.7 1.7 0 0 0 1.76-.6l.04-.07h3.4l.04.07a1.7 1.7 0 0 0 1.76.6l.08-.02 1.7 2.94-.06.06A1.7 1.7 0 0 0 19.4 11l.08.04v3.4z",
    menu: "M4 6h16M4 12h16M4 18h16",
    search: "m21 21-4.3-4.3 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4",
    arrow: "M5 12h14 M13 6l6 6-6 6",
    plus: "M12 5v14 M5 12h14",
    chevron: "m9 18 6-6-6-6",
    close: "M18 6 6 18 M6 6l12 12",
    check: "m5 12 4 4L19 6",
    leaf: "M20 4c-9 0-15 4-15 11a5 5 0 0 0 5 5c7 0 11-6 10-16z M5 20c2-5 6-8 11-11",
    package: "m7.5 4.3 9 5.2 M3 7l9 5 9-5 M12 22V12 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
    clock: "M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
  };

  function Icon({ name, className = "icon" }) {
    return h("svg", {
      className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true",
    }, h("path", { d: paths[name] || paths.grid }));
  }

  function Button({ children, variant = "primary", onClick, icon, className = "", type = "button", disabled = false }) {
    return h("button", { className: `button button-${variant} ${className}`.trim(), onClick, type, disabled },
      icon && h(Icon, { name: icon }), children);
  }

  function Tag({ children, tone = "neutral" }) {
    return h("span", { className: `tag tag-${tone}` }, children);
  }

  function makeUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.random() * 16 | 0;
      return (char === "x" ? random : (random & 3 | 8)).toString(16);
    });
  }

  function formatDate(date) {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Request failed.");
    return result;
  }

  function mapPatient(record) {
    return {
      id: record.id,
      registeredAt: record.created_at.slice(0, 10),
    };
  }

  function mapInventory(record) {
    const product = record.products || {};
    const quantity = Number(record.quantity);
    const reorderLevel = Number(record.reorder_level);
    const visuals = {
      Grains: { icon: "🌾", color: "sand" },
      Pantry: { icon: "🫘", color: "lilac" },
      Produce: { icon: "🥬", color: "mint" },
      Protein: { icon: "🐟", color: "peach" },
    };
    const visual = visuals[product.category] || { icon: "🛒", color: "blue" };

    return {
      id: record.product_id,
      name: product.name || "Unnamed product",
      category: product.category || "Other",
      quantity,
      reorderLevel,
      unit: product.unit || "each",
      calories: Number(product.calories_per_serving || 0),
      sodium: Number(product.sodium_mg || 0),
      stock: quantity === 0 ? "Out of stock" : quantity <= reorderLevel ? "Low stock" : "In stock",
      icon: visual.icon,
      color: visual.color,
      updatedAt: record.updated_at,
    };
  }

  function App() {
    const [page, setPage] = useState("dashboard");
    const [patients, setPatients] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [search, setSearch] = useState("");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [registerOpen, setRegisterOpen] = useState(false);
    const [productOpen, setProductOpen] = useState(false);
    const [pendingUuid, setPendingUuid] = useState(makeUuid);
    const [toast, setToast] = useState("");
    const [databaseError, setDatabaseError] = useState("");
    const [geminiConfigured, setGeminiConfigured] = useState(null);
    const [registering, setRegistering] = useState(false);
    const [savingProduct, setSavingProduct] = useState(false);
    const [savingInventoryId, setSavingInventoryId] = useState(null);
    const [emailUpdates, setEmailUpdates] = useState(true);
    const [cart, setCart] = useState([]);

    const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
    const filteredPatients = useMemo(() => patients.filter((patient) => {
      return patient.id.toLowerCase().includes(search.trim().toLowerCase());
    }), [patients, search]);

    function notify(message) {
      setToast(message);
      window.setTimeout(() => setToast(""), 3000);
    }

    async function loadDatabaseData() {
      try {
        const health = await api("/api/health");
        setGeminiConfigured(Boolean(health.geminiConfigured));
        if (!health.databaseConfigured) {
          throw new Error("Supabase is not configured. Add the project URL and rotated secret key to .env.");
        }
        const [patientRows, inventoryRows] = await Promise.all([
          api("/api/patients"),
          api("/api/inventory"),
        ]);
        setPatients(patientRows.map(mapPatient));
        setInventory(inventoryRows.map(mapInventory));
        setDatabaseError("");
        return true;
      } catch (error) {
        setDatabaseError(error.message);
        return false;
      }
    }

    useEffect(() => {
      loadDatabaseData();
    }, []);

    function goTo(nextPage) {
      setPage(nextPage);
      setMobileNavOpen(false);
      setSearch("");
    }

    function showPatient(patient) {
      setSelectedPatientId(patient.id);
      setPage("profile");
      setMobileNavOpen(false);
    }

    async function registerPatient(event) {
      event.preventDefault();
      setRegistering(true);
      try {
        const record = await api("/api/patients", {
          method: "POST",
          body: JSON.stringify({ id: pendingUuid }),
        });
        const patient = mapPatient(record);
        setPatients((current) => [patient, ...current]);
        setRegisterOpen(false);
        setPendingUuid(makeUuid());
        setDatabaseError("");
        showPatient(patient);
        notify("Patient ID saved to Supabase.");
      } catch (error) {
        setDatabaseError(error.message);
        notify(`Patient ID could not be saved: ${error.message}`);
      } finally {
        setRegistering(false);
      }
    }

    async function createProduct(event) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      setSavingProduct(true);
      try {
        await api("/api/products", {
          method: "POST",
          body: JSON.stringify({
            name: values.name,
            sku: values.sku,
            category: values.category,
            unit: values.unit,
            calories_per_serving: Number(values.calories_per_serving || 0),
            sodium_mg: Number(values.sodium_mg || 0),
          }),
        });
        setProductOpen(false);
        const refreshed = await loadDatabaseData();
        notify(refreshed ? "Product saved; its inventory starts at zero." : "Product saved, but the inventory list could not be refreshed.");
      } catch (error) {
        setDatabaseError(error.message);
        notify(`Product could not be saved: ${error.message}`);
      } finally {
        setSavingProduct(false);
      }
    }

    async function updateInventory(event, item) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      setSavingInventoryId(item.id);
      try {
        await api(`/api/inventory/${encodeURIComponent(item.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            quantity: Number(values.quantity),
            reorder_level: Number(values.reorder_level),
          }),
        });
        const refreshed = await loadDatabaseData();
        notify(refreshed ? "Inventory updated." : "Inventory saved, but the list could not be refreshed.");
      } catch (error) {
        setDatabaseError(error.message);
        notify(`Inventory could not be updated: ${error.message}`);
      } finally {
        setSavingInventoryId(null);
      }
    }

    function addToCart(productName) {
      setCart((current) => {
        const found = current.find((item) => item.name === productName);
        return found
          ? current.map((item) => item.name === productName ? { ...item, quantity: item.quantity + 1 } : item)
          : [...current, { name: productName, quantity: 1 }];
      });
      notify(`${productName} added to demo cart.`);
    }

    function Sidebar() {
      return h(React.Fragment, null,
        mobileNavOpen && h("button", { className: "nav-scrim", "aria-label": "Close navigation", onClick: () => setMobileNavOpen(false) }),
        h("aside", { className: `sidebar ${mobileNavOpen ? "sidebar-open" : ""}` },
          h("div", { className: "brand" },
            h("div", { className: "brand-mark" }, "BB"),
            h("div", null, h("div", { className: "brand-name" }, "BYTE BOTS"), h("div", { className: "brand-subtitle" }, "EPIC CURE"))
          ),
          h("div", { className: "workspace-label" }, "WORKSPACE"),
          h("nav", { className: "nav-list", "aria-label": "Main navigation" },
            ...navItems.map(([id, label, icon]) => h("button", {
              key: id,
              className: `nav-item ${page === id || (page === "profile" && id === "patients") ? "nav-item-active" : ""}`,
              onClick: () => goTo(id),
            },
            h(Icon, { name: icon }), h("span", null, label),
            id === "cart" && cart.length > 0 && h("span", { className: "nav-count" }, cart.length)))
          ),
          h("div", { className: "sidebar-bottom" },
            h("div", { className: "privacy-note" },
              h("span", { className: "privacy-icon" }, h(Icon, { name: "leaf" })),
              h("div", null, h("strong", null, "Care, with purpose"), h("span", null, "Local prototype · no patient details"))
            ),
            h("button", { className: `nav-item ${page === "settings" ? "nav-item-active" : ""}`, onClick: () => goTo("settings") },
              h(Icon, { name: "settings" }), h("span", null, "Settings"))
          )
        )
      );
    }

    function Topbar() {
      const searchBox = page === "patients" ? h("label", { className: "top-search" },
        h(Icon, { name: "search" }),
        h("input", {
          value: search,
          onChange: (event) => setSearch(event.target.value),
          placeholder: "Search by patient UUID",
          "aria-label": "Search by patient UUID",
        })
      ) : h("div", { className: "topbar-context" }, h("span", { className: "status-dot" }), "Demo environment");
      return h("header", { className: "topbar" },
        h("button", { className: "mobile-menu icon-button", onClick: () => setMobileNavOpen(true), "aria-label": "Open navigation" }, h(Icon, { name: "menu" })),
        h("div", { className: "breadcrumb" }, "Workspace", h(Icon, { name: "chevron" }), h("strong", null, "Epic Cure")),
        h("div", { className: "topbar-right" },
          searchBox,
          h("button", { className: "icon-button notification-button", onClick: () => notify("You’re all caught up."), "aria-label": "Notifications" },
            h(Icon, { name: "bell" }), h("span", { className: "notification-dot" })),
          h("div", { className: "avatar", "aria-label": "Demo staff account" }, "EC")
        )
      );
    }

    function PageHeading({ eyebrow, title, description, actions }) {
      return h("div", { className: "page-heading" },
        h("div", null, eyebrow && h("div", { className: "eyebrow" }, eyebrow), h("h1", null, title), description && h("p", null, description)),
        actions && h("div", { className: "heading-actions" }, actions)
      );
    }

    function Dashboard() {
      const statCards = [
        { title: "Patient IDs", value: patients.length.toLocaleString(), change: "Supabase", detail: "saved records", icon: "users", tone: "purple" },
        { title: "Products", value: inventory.length.toLocaleString(), change: "Supabase", detail: "tracked items", icon: "box", tone: "green" },
        { title: "In stock", value: inventory.filter((item) => item.quantity > 0).length.toLocaleString(), change: "Available", detail: "products", icon: "leaf", tone: "orange" },
        { title: "Restock needed", value: inventory.filter((item) => item.quantity <= item.reorderLevel).length.toLocaleString(), change: "Review", detail: "low or empty", icon: "clipboard", tone: "blue" },
      ];
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase(), title: "Welcome to Epic Cure", description: "A healthier food system starts with thoughtful care, one basket at a time." }),
        h("section", { className: "welcome-banner" },
          h("div", { className: "welcome-copy" },
            h("span", { className: "banner-kicker" }, h(Icon, { name: "sparkles" }), "MEDICALLY TAILORED GROCERIES"),
            h("h2", null, "Good food. Better health."),
            h("p", null, "Manage patient IDs and grocery inventory in one thoughtful workspace."),
            h(Button, { variant: "light", icon: "arrow", onClick: () => goTo("patients") }, "Explore patients")
          ),
          h("div", { className: "banner-art", "aria-hidden": "true" },
            h("div", { className: "orbit orbit-one" }), h("div", { className: "orbit orbit-two" }),
            h("span", { className: "art-leaf leaf-one" }, "✦"), h("span", { className: "art-leaf leaf-two" }, "✧"),
            h("div", { className: "produce-bowl" }, h("span", null, "🥬"), h("span", null, "🍋"), h("span", null, "🥑"), h("span", null, "🫐"))
          )
        ),
        h("section", { className: "stats-grid", "aria-label": "Workspace statistics" },
          ...statCards.map((card) => h("article", { className: "stat-card", key: card.title },
            h("div", { className: "stat-top" }, h("span", { className: "stat-label" }, card.title), h("span", { className: `stat-icon icon-${card.tone}` }, h(Icon, { name: card.icon }))),
            h("div", { className: "stat-value" }, card.value),
            h("div", { className: "stat-footer" }, h("span", { className: card.tone === "purple" ? "positive" : "stat-highlight" }, card.change), h("span", null, card.detail))
          ))
        ),
        h("section", { className: "content-grid dashboard-lower" },
          h("article", { className: "panel quick-panel" },
            h("div", { className: "panel-heading" }, h("div", null, h("h2", null, "Quick actions"), h("p", null, "Make your next move count."))),
            h("div", { className: "quick-actions" },
              ...[
                ["plus", "quick-purple", "Register patient", "Create a new care record", () => setRegisterOpen(true)],
                ["box", "quick-green", "View inventory", "Check product availability", () => goTo("inventory")],
                ["users", "quick-orange", "View patient IDs", "Browse saved records", () => goTo("patients")],
                ["settings", "quick-blue", "Database setup", "Review connection settings", () => goTo("settings")],
              ].map(([icon, color, title, detail, action]) =>
                h("button", { className: "quick-action", key: title, onClick: action },
                  h("span", { className: `quick-icon ${color}` }, h(Icon, { name: icon })),
                  h("span", null, h("strong", null, title), h("small", null, detail)),
                  h(Icon, { name: "arrow", className: "quick-arrow" })
                ))
            )
          ),
          h("article", { className: "panel activity-panel" },
            h("div", { className: "panel-heading panel-heading-inline" },
              h("div", null, h("h2", null, "Connected records"), h("p", null, "Live counts from your Supabase database.")),
              h("span", { className: "table-updated" }, "Live")
            ),
            h("div", { className: "activity-list" },
              h("div", { className: "activity-item" },
                h("span", { className: "activity-dot activity-purple" }, h(Icon, { name: "users" })),
                h("div", { className: "activity-copy" }, h("strong", null, "Patient IDs"), h("span", null, "Patient UUIDs and creation dates")),
                h("time", null, patients.length)
              ),
              h("div", { className: "activity-item" },
                h("span", { className: "activity-dot activity-green" }, h(Icon, { name: "box" })),
                h("div", { className: "activity-copy" }, h("strong", null, "Products and inventory"), h("span", null, "Stock levels and reorder thresholds")),
                h("time", null, inventory.length)
              )
            )
          )
        )
      );
    }

    function PatientsPage() {
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "CARE NETWORK", title: "Patients", description: "Create and search patient UUIDs. No personal or health information is stored.", actions: h(Button, { icon: "plus", onClick: () => setRegisterOpen(true) }, "Create patient ID") }),
        h("div", { className: "patient-summary-row" },
          h("div", { className: "patient-summary-card" }, h("span", { className: "summary-icon summary-violet" }, h(Icon, { name: "users" })), h("div", null, h("strong", null, patients.length), h("span", null, "Total records"))),
          h("div", { className: "privacy-inline" }, h(Icon, { name: "check" }), "Only UUIDs and creation dates are saved")
        ),
        h("section", { className: "panel table-panel" },
          h("div", { className: "table-toolbar" },
            h("div", null, h("h2", null, "Patient directory"), h("p", null, "Search by randomly generated patient UUID.")),
            h("button", { className: "text-button", onClick: loadDatabaseData }, "Refresh")
          ),
          h("div", { className: "table-wrap" },
            h("table", null,
              h("thead", null, h("tr", null, h("th", null, "PATIENT ID"), h("th", null, "CREATED"), h("th", null, " "))),
              h("tbody", null, filteredPatients.length
                ? filteredPatients.map((patient) => h("tr", { key: patient.id },
                  h("td", null, h("div", { className: "patient-id-cell" }, h("span", { className: "patient-mini-avatar" }, h(Icon, { name: "users" })), h("span", null, h("strong", null, "Patient"), h("small", null, patient.id)))),
                  h("td", null, formatDate(patient.registeredAt)),
                  h("td", null, h("button", { className: "row-action", onClick: () => showPatient(patient), "aria-label": "View patient ID" }, "View ID", h(Icon, { name: "arrow" })))
                ))
                : h("tr", null, h("td", { colSpan: 3, className: "patient-empty" }, "No patient IDs found. Create one to get started."))
              )
            )
          )
        ),
        h("p", { className: "privacy-footnote" }, h(Icon, { name: "leaf" }), "Patient IDs are identifiers only—not authentication credentials or access controls.")
      );
    }

    function RegistrationModal() {
      if (!registerOpen) return null;
      return h("div", { className: "modal-backdrop", onMouseDown: (event) => { if (event.target === event.currentTarget) setRegisterOpen(false); } },
        h("section", { className: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "register-title" },
          h("div", { className: "modal-header" },
            h("div", null, h("span", { className: "eyebrow" }, "NEW RECORD"), h("h2", { id: "register-title" }, "Create a patient ID"), h("p", null, "Only the UUID and creation date are saved.")),
            h("button", { className: "icon-button", onClick: () => setRegisterOpen(false), "aria-label": "Close registration form" }, h(Icon, { name: "close" }))
          ),
          h("form", { onSubmit: registerPatient, className: "registration-form" },
            h("label", { className: "form-label" }, "Patient UUID",
              h("div", { className: "uuid-preview" }, h("span", null, pendingUuid), h("small", null, "Generated automatically"))
            ),
            h("div", { className: "form-privacy" }, h(Icon, { name: "leaf" }), h("span", null, "No names, contact details, or medical information are collected or stored.")),
            h("div", { className: "modal-actions" }, h(Button, { variant: "secondary", onClick: () => setRegisterOpen(false) }, "Cancel"), h(Button, { type: "submit", icon: "plus", disabled: registering }, registering ? "Saving..." : "Create patient ID"))
          )
        )
      );
    }

    function ProductModal() {
      if (!productOpen) return null;
      return h("div", { className: "modal-backdrop", onMouseDown: (event) => { if (event.target === event.currentTarget) setProductOpen(false); } },
        h("section", { className: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "product-title" },
          h("div", { className: "modal-header" },
            h("div", null, h("span", { className: "eyebrow" }, "WAREHOUSE"), h("h2", { id: "product-title" }, "Add a product"), h("p", null, "The product and its starting inventory record are saved in Supabase.")),
            h("button", { className: "icon-button", onClick: () => setProductOpen(false), "aria-label": "Close product form" }, h(Icon, { name: "close" }))
          ),
          h("form", { onSubmit: createProduct, className: "registration-form" },
            h("label", { className: "form-label" }, "Product name",
              h("input", { className: "form-control", name: "name", required: true, maxLength: 200 })
            ),
            h("label", { className: "form-label" }, "SKU",
              h("input", { className: "form-control", name: "sku", maxLength: 100 })
            ),
            h("label", { className: "form-label" }, "Category",
              h("select", { className: "form-control", name: "category" },
                h("option", { value: "" }, "Select category"),
                h("option", null, "Grains"),
                h("option", null, "Pantry"),
                h("option", null, "Produce"),
                h("option", null, "Protein")
              )
            ),
            h("label", { className: "form-label" }, "Unit",
              h("input", { className: "form-control", name: "unit", defaultValue: "each", required: true, maxLength: 40 })
            ),
            h("div", { className: "product-nutrition-fields" },
              h("label", { className: "form-label" }, "Calories per serving",
                h("input", { className: "form-control", name: "calories_per_serving", type: "number", min: "0", step: "0.01", defaultValue: "0", required: true })
              ),
              h("label", { className: "form-label" }, "Sodium (mg)",
                h("input", { className: "form-control", name: "sodium_mg", type: "number", min: "0", step: "0.01", defaultValue: "0", required: true })
              )
            ),
            h("div", { className: "form-privacy" }, h(Icon, { name: "box" }), h("span", null, "New inventory starts at zero. Set the quantity and low-stock threshold from the inventory table.")),
            h("div", { className: "modal-actions" },
              h(Button, { variant: "secondary", onClick: () => setProductOpen(false) }, "Cancel"),
              h(Button, { type: "submit", icon: "plus", disabled: savingProduct }, savingProduct ? "Saving..." : "Add product")
            )
          )
        )
      );
    }

    function PatientProfile() {
      if (!selectedPatient) return h("div", { className: "empty-state profile-empty" }, h("strong", null, "Choose a patient ID"), h(Button, { onClick: () => goTo("patients") }, "Back to patients"));
      return h(React.Fragment, null,
        h("button", { className: "back-link", onClick: () => goTo("patients") }, h(Icon, { name: "chevron" }), "Back to patients"),
        h(PageHeading, { eyebrow: "PATIENT DIRECTORY", title: "Patient ID", description: "This UUID is an identifier only, not an access credential." }),
        h("section", { className: "profile-hero panel" },
          h("div", { className: "profile-avatar" }, h(Icon, { name: "users" })),
          h("div", { className: "profile-identity" },
            h("span", { className: "eyebrow" }, "PATIENT UUID"),
            h("h2", null, selectedPatient.id),
            h("span", null, `Created ${formatDate(selectedPatient.registeredAt)}`)
          )
        )
      );
    }

    function InventoryPage() {
      const restock = inventory.filter((item) => item.quantity > 0 && item.quantity <= item.reorderLevel).length;
      const outOfStock = inventory.filter((item) => item.quantity === 0).length;
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "WAREHOUSE", title: "Grocery inventory", description: "Products and stock levels saved in Supabase.", actions: h(Button, { variant: "secondary", icon: "plus", onClick: () => setProductOpen(true) }, "Add product") }),
        h("div", { className: "inventory-summary" },
          h("div", null, h("span", null, "PRODUCTS"), h("strong", null, inventory.length)),
          h("div", null, h("span", null, "NEED RESTOCK"), h("strong", { className: "text-orange" }, restock)),
          h("div", null, h("span", null, "OUT OF STOCK"), h("strong", { className: "text-red" }, outOfStock))
        ),
        h("section", { className: "panel table-panel" },
          h("div", { className: "table-toolbar" }, h("div", null, h("h2", null, "Products"), h("p", null, "Edit available quantity and its low-stock threshold.")), h("button", { className: "text-button", onClick: loadDatabaseData }, "Refresh")),
          h("div", { className: "table-wrap" }, h("table", null,
            h("thead", null, h("tr", null, h("th", null, "PRODUCT"), h("th", null, "CATEGORY"), h("th", null, "QTY AVAILABLE"), h("th", null, "STOCK STATUS"), h("th", null, "NUTRITION / SERVING"))),
            h("tbody", null, inventory.length
              ? inventory.map((item) => h("tr", { key: item.id },
                h("td", null, h("div", { className: "product-cell" }, h("span", { className: `product-emoji product-${item.color}` }, item.icon), h("strong", null, item.name))),
                h("td", null, h("span", { className: "category-label" }, item.category)),
                h("td", null,
                  h("div", null, h("strong", null, item.quantity), h("span", { className: "unit-label" }, ` ${item.unit}`)),
                  h("form", { className: "stock-editor", key: `${item.id}-${item.updatedAt}`, onSubmit: (event) => updateInventory(event, item) },
                    h("label", { className: "sr-only", htmlFor: `quantity-${item.id}` }, "Available quantity"),
                    h("input", { id: `quantity-${item.id}`, name: "quantity", type: "number", min: "0", step: "0.01", defaultValue: item.quantity, required: true }),
                    h("label", { className: "sr-only", htmlFor: `reorder-${item.id}` }, "Reorder threshold"),
                    h("input", { id: `reorder-${item.id}`, name: "reorder_level", type: "number", min: "0", step: "0.01", defaultValue: item.reorderLevel, required: true }),
                    h(Button, { type: "submit", className: "stock-save", disabled: savingInventoryId === item.id }, savingInventoryId === item.id ? "..." : "Save")
                  )
                ),
                h("td", null, h(Tag, { tone: item.stock === "In stock" ? "green" : item.stock === "Low stock" ? "orange" : "red" }, h("span", { className: "tag-dot" }), item.stock)),
                h("td", null, h("span", { className: "nutrition-cell" }, `${item.calories} cal`, h("i", null), `${item.sodium} mg sodium`))
              ))
              : h("tr", null, h("td", { colSpan: 5, className: "empty-state" }, "No products yet. Add a product to start tracking inventory."))
            )
          ))
        )
      );
    }

    function RecipesPage() {
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "PERSONALIZED NUTRITION", title: "Recipe recommendations", description: "Recommendations are not connected in this build." }),
        h("div", { className: "demo-notice" }, h(Icon, { name: "sparkles" }), h("span", null, "No recipes are loaded. Connect a recommendation service to add this feature.")),
        h("section", { className: "panel empty-state" }, h("strong", null, "No recommendations yet"), h("span", null, "This page no longer displays sample recipe data."))
      );
    }

    function CartPage() {
      const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "GROCERY PLANNING", title: "Shopping cart", description: "A lightweight demo basket—no checkout or order submission is connected." }),
        h("section", { className: "panel cart-panel" },
          h("div", { className: "table-toolbar" }, h("div", null, h("h2", null, "Your basket"), h("p", null, `${totalItems} items in this demo cart`)), h(Tag, { tone: "green" }, "Demo only")),
          cart.length
            ? h("div", { className: "cart-items" }, ...cart.map((item) => h("div", { className: "cart-item", key: item.name },
              h("span", { className: "cart-item-icon" }, "🛒"), h("strong", null, item.name), h("span", { className: "cart-quantity" }, `Qty ${item.quantity}`),
              h("button", { className: "remove-button", onClick: () => setCart((current) => current.filter((entry) => entry.name !== item.name)), "aria-label": `Remove ${item.name}` }, h(Icon, { name: "close" }))
            )))
            : h("div", { className: "empty-state" }, h("strong", null, "Your basket is empty"), h("span", null, "Explore inventory to add grocery items.")),
          h("div", { className: "cart-footer" }, h("span", null, "Items in cart"), h("strong", null, totalItems), h(Button, { onClick: () => notify("Checkout is not connected in this demo.") }, "Continue to checkout"))
        ),
        h("div", { className: "suggested-products" }, h("h2", null, "Thoughtful staples"),
          h("div", { className: "suggested-row" }, ...inventory.filter((item) => item.quantity > 0).slice(0, 3).map((item) =>
            h("button", { className: "suggested-card", key: item.name, onClick: () => addToCart(item.name) },
              h("span", null, item.icon), h("strong", null, item.name), h(Icon, { name: "plus" })
            )))
        )
      );
    }

    function OrdersPage() {
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "FULFILLMENT", title: "Orders", description: "Order management is not connected to the database yet." }),
        h("section", { className: "panel empty-state" }, h("strong", null, "No orders are stored"), h("span", null, "This page no longer displays sample order data."))
      );
    }

    function SettingsPage() {
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "WORKSPACE", title: "Settings", description: "A few workspace details for this local demo prototype." }),
        h("section", { className: "panel settings-card gemini-settings" },
          h("div", { className: "settings-row" },
            h("span", { className: "settings-icon" }, h(Icon, { name: "sparkles" })),
            h("div", null, h("strong", null, "Gemini API key"), h("span", null, "Configure the key on the server, not in this browser.")),
            h(Tag, { tone: geminiConfigured ? "green" : "orange" },
              geminiConfigured === null ? "Checking…" : geminiConfigured ? "Key detected" : "Not configured")
          ),
          h("div", { className: "settings-key-instructions" },
            h("p", null, "Open the project-root .env file and add this line. Replace the placeholder locally with your rotated key:"),
            h("pre", null, "GEMINI_API_KEY=your-rotated-key"),
            h("p", null, "Save the file and restart node backend/server.js. The server reads the key; it is never sent to or stored in frontend code."),
            h("p", { className: "settings-key-note" }, "This status only checks whether the server sees a key. Gemini recipe generation is not connected yet.")
          )
        ),
        h("section", { className: "panel settings-card" },
          h("div", { className: "settings-row" }, h("span", { className: "settings-icon" }, h(Icon, { name: "leaf" })), h("div", null, h("strong", null, "Workspace"), h("span", null, "Byte Bots · Epic Cure")), h(Tag, { tone: "green" }, "Demo")),
          h("div", { className: "settings-row" }, h("span", { className: "settings-icon" }, h(Icon, { name: "bell" })), h("div", null, h("strong", null, "Email updates"), h("span", null, "Receive demo activity summaries")), h("button", { className: `toggle ${emailUpdates ? "toggle-on" : ""}`, onClick: () => setEmailUpdates(!emailUpdates), role: "switch", "aria-checked": emailUpdates, "aria-label": "Toggle email updates" }, h("span", null))),
          h("div", { className: "settings-privacy" }, h(Icon, { name: "check" }), h("span", null, "Supabase stores patient UUIDs and product/inventory records. Orders and recommendations are not connected yet."))
        )
      );
    }

    const pages = {
      dashboard: Dashboard,
      patients: PatientsPage,
      profile: PatientProfile,
      inventory: InventoryPage,
      recipes: RecipesPage,
      cart: CartPage,
      orders: OrdersPage,
      settings: SettingsPage,
    };
    const CurrentPage = pages[page] || Dashboard;

    return h("div", { className: "app-shell" },
      h(Sidebar),
      h("main", { className: "main-area" },
        Topbar(),
        h("div", { className: "main-content" },
          databaseError && h("div", { className: "database-warning", role: "alert" }, h(Icon, { name: "bell" }), databaseError),
          CurrentPage()
        ),
        h("footer", { className: "app-footer" }, h("span", null, "BYTE BOTS · EPIC CURE"), h("span", null, "Built for care. Powered by good food."))
      ),
      RegistrationModal(),
      ProductModal(),
      toast && h("div", { className: "toast", role: "status" }, h(Icon, { name: "check" }), toast)
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
