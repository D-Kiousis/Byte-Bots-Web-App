(function () {
  const h = React.createElement;
  const { useMemo, useState } = React;
  const data = window.EpicCureData;

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

  function Button({ children, variant = "primary", onClick, icon, className = "", type = "button" }) {
    return h("button", { className: `button button-${variant} ${className}`.trim(), onClick, type },
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

  function App() {
    const [page, setPage] = useState("dashboard");
    const [patients, setPatients] = useState(data.patients);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All statuses");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [registerOpen, setRegisterOpen] = useState(false);
    const [pendingUuid, setPendingUuid] = useState(makeUuid);
    const [conditions, setConditions] = useState([]);
    const [restrictions, setRestrictions] = useState([]);
    const [newStatus, setNewStatus] = useState("Active");
    const [toast, setToast] = useState("");
    const [recommendationsReady, setRecommendationsReady] = useState(false);
    const [emailUpdates, setEmailUpdates] = useState(true);
    const [cart, setCart] = useState([
      { name: "Old-fashioned oats", quantity: 2 },
      { name: "Fresh baby spinach", quantity: 1 },
    ]);

    const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
    const filteredPatients = useMemo(() => patients.filter((patient) => {
      const matchesSearch = patient.id.toLowerCase().includes(search.trim().toLowerCase());
      const matchesStatus = statusFilter === "All statuses" || patient.status === statusFilter;
      return matchesSearch && matchesStatus;
    }), [patients, search, statusFilter]);
    const pendingOrders = patients.reduce((total, patient) =>
      total + patient.orders.filter((order) => order.status === "Processing").length, 0);

    function notify(message) {
      setToast(message);
      window.setTimeout(() => setToast(""), 3000);
    }

    function goTo(nextPage) {
      setPage(nextPage);
      setMobileNavOpen(false);
      setSearch("");
      setRecommendationsReady(false);
    }

    function showPatient(patient) {
      setSelectedPatientId(patient.id);
      setPage("profile");
      setMobileNavOpen(false);
    }

    function toggleOption(list, setList, value) {
      setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
    }

    function registerPatient(event) {
      event.preventDefault();
      const patient = {
        id: pendingUuid,
        registeredAt: new Date().toISOString().slice(0, 10),
        status: newStatus,
        conditions,
        restrictions,
        orders: [],
      };
      setPatients((current) => [patient, ...current]);
      setRegisterOpen(false);
      setConditions([]);
      setRestrictions([]);
      setNewStatus("Active");
      setPendingUuid(makeUuid());
      showPatient(patient);
      notify("Patient record created in this demo session.");
    }

    function generateRecommendations() {
      setRecommendationsReady(true);
      notify("Demo recommendations are ready. No AI service is connected.");
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
              h("div", null, h("strong", null, "Care, with purpose"), h("span", null, "Demo workspace · fictional data"))
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
        { title: "Registered patients", value: patients.length.toLocaleString(), change: "+12%", detail: "vs. last month", icon: "users", tone: "purple" },
        { title: "Active patients", value: patients.filter((patient) => patient.status === "Active").length.toLocaleString(), change: "Care ready", detail: "enrolled accounts", icon: "leaf", tone: "green" },
        { title: "Available products", value: data.inventory.filter((item) => item.quantity > 0).length.toLocaleString(), change: "Across 4 categories", detail: "inventory items", icon: "box", tone: "orange" },
        { title: "Pending orders", value: pendingOrders.toString().padStart(2, "0"), change: "Needs attention", detail: "currently processing", icon: "clipboard", tone: "blue" },
      ];
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "FRIDAY, NOVEMBER 14, 2026", title: "Welcome to Epic Cure", description: "A healthier food system starts with thoughtful care, one basket at a time." }),
        h("section", { className: "welcome-banner" },
          h("div", { className: "welcome-copy" },
            h("span", { className: "banner-kicker" }, h(Icon, { name: "sparkles" }), "MEDICALLY TAILORED GROCERIES"),
            h("h2", null, "Good food. Better health."),
            h("p", null, "Coordinate nourishing groceries, personalized recipes, and patient care in one thoughtful workspace."),
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
                ["sparkles", "quick-orange", "Generate recipes", "Explore tailored meal ideas", () => goTo("recipes")],
                ["clipboard", "quick-blue", "Manage orders", "Track active deliveries", () => goTo("orders")],
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
              h("div", null, h("h2", null, "Recent activity"), h("p", null, "A little progress, all in one place.")),
              h("button", { className: "text-button", onClick: () => goTo("orders") }, "View all", h(Icon, { name: "arrow" }))
            ),
            h("div", { className: "activity-list" },
              ...data.activity.map((activity, index) => h("div", { className: "activity-item", key: `${activity.title}-${index}` },
                h("span", { className: `activity-dot activity-${activity.color}` }, h(Icon, { name: activity.type === "patient" ? "users" : activity.type === "inventory" ? "box" : "cart" })),
                h("div", { className: "activity-copy" }, h("strong", null, activity.title), h("span", null, activity.detail)),
                h("time", null, activity.time)
              ))
            )
          )
        )
      );
    }

    function PatientsPage() {
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "CARE NETWORK", title: "Patients", description: "Manage fictional demo records and their food preferences.", actions: h(Button, { icon: "plus", onClick: () => setRegisterOpen(true) }, "Register patient") }),
        h("div", { className: "patient-summary-row" },
          h("div", { className: "patient-summary-card" }, h("span", { className: "summary-icon summary-violet" }, h(Icon, { name: "users" })), h("div", null, h("strong", null, patients.length), h("span", null, "Total records"))),
          h("div", { className: "patient-summary-card" }, h("span", { className: "summary-icon summary-green" }, h(Icon, { name: "leaf" })), h("div", null, h("strong", null, patients.filter((patient) => patient.status === "Active").length), h("span", null, "Active accounts"))),
          h("div", { className: "privacy-inline" }, h(Icon, { name: "check" }), "Fictional demo records · No personal identifiers collected")
        ),
        h("section", { className: "panel table-panel" },
          h("div", { className: "table-toolbar" },
            h("div", null, h("h2", null, "Patient directory"), h("p", null, "Search by randomly generated patient UUID.")),
            h("label", { className: "filter-select" }, h("span", { className: "sr-only" }, "Filter by account status"), h("select", { value: statusFilter, onChange: (event) => setStatusFilter(event.target.value) },
              h("option", null, "All statuses"), h("option", null, "Active"), h("option", null, "Inactive")
            ))
          ),
          h("div", { className: "table-wrap" },
            h("table", null,
              h("thead", null, h("tr", null, h("th", null, "PATIENT ID"), h("th", null, "REGISTERED"), h("th", null, "ACCOUNT STATUS"), h("th", null, "CARE PROFILE"), h("th", null, " "))),
              h("tbody", null, ...filteredPatients.map((patient) => h("tr", { key: patient.id },
                h("td", null, h("div", { className: "patient-id-cell" }, h("span", { className: "patient-mini-avatar" }, h(Icon, { name: "users" })), h("span", null, h("strong", null, "Patient"), h("small", null, patient.id)))),
                h("td", null, formatDate(patient.registeredAt)),
                h("td", null, h(Tag, { tone: patient.status === "Active" ? "green" : "neutral" }, h("span", { className: "tag-dot" }), patient.status)),
                h("td", null, h("span", { className: "care-count" }, `${patient.conditions.length} conditions · ${patient.restrictions.length} preferences`)),
                h("td", null, h("button", { className: "row-action", onClick: () => showPatient(patient), "aria-label": "View patient profile" }, "View profile", h(Icon, { name: "arrow" }))
              ))))
            )
          ),
          filteredPatients.length === 0 && h("div", { className: "empty-state" }, h(Icon, { name: "search" }), h("strong", null, "No matching records"), h("span", null, "Try a different UUID or account status."))
        ),
        h("p", { className: "privacy-footnote" }, h(Icon, { name: "leaf" }), "Patient IDs are demo identifiers only—not authentication credentials or access controls.")
      );
    }

    function MultiSelect({ label, options, selected, onToggle, description }) {
      return h("fieldset", { className: "form-fieldset" },
        h("legend", null, label),
        h("p", { className: "field-help" }, description),
        h("div", { className: "checkbox-grid" },
          ...options.map((option) => h("label", { className: `checkbox-option ${selected.includes(option) ? "checkbox-selected" : ""}`, key: option },
            h("input", { type: "checkbox", checked: selected.includes(option), onChange: () => onToggle(option) }),
            h("span", { className: "custom-checkbox" }, selected.includes(option) && h(Icon, { name: "check" })),
            option
          ))
        )
      );
    }

    function RegistrationModal() {
      if (!registerOpen) return null;
      return h("div", { className: "modal-backdrop", onMouseDown: (event) => { if (event.target === event.currentTarget) setRegisterOpen(false); } },
        h("section", { className: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "register-title" },
          h("div", { className: "modal-header" },
            h("div", null, h("span", { className: "eyebrow" }, "NEW CARE RECORD"), h("h2", { id: "register-title" }, "Register a patient"), h("p", null, "Only care-related preferences are collected in this demo.")),
            h("button", { className: "icon-button", onClick: () => setRegisterOpen(false), "aria-label": "Close registration form" }, h(Icon, { name: "close" }))
          ),
          h("form", { onSubmit: registerPatient, className: "registration-form" },
            h("label", { className: "form-label" }, "Patient UUID",
              h("div", { className: "uuid-preview" }, h("span", null, pendingUuid), h("small", null, "Generated automatically"))
            ),
            h(MultiSelect, { label: "Medical conditions", options: data.conditions, selected: conditions, onToggle: (option) => toggleOption(conditions, setConditions, option), description: "Select any that apply to this fictional demo record." }),
            h(MultiSelect, { label: "Dietary restrictions", options: data.restrictions, selected: restrictions, onToggle: (option) => toggleOption(restrictions, setRestrictions, option), description: "Select preferences to help tailor grocery recommendations." }),
            h("label", { className: "form-label" }, "Account status",
              h("select", { className: "form-control", value: newStatus, onChange: (event) => setNewStatus(event.target.value) }, h("option", null, "Active"), h("option", null, "Inactive"))
            ),
            h("div", { className: "form-privacy" }, h(Icon, { name: "leaf" }), h("span", null, "This prototype never asks for a name, phone number, address, or date of birth. Data stays in memory and clears on refresh.")),
            h("div", { className: "modal-actions" }, h(Button, { variant: "secondary", onClick: () => setRegisterOpen(false) }, "Cancel"), h(Button, { type: "submit", icon: "plus" }, "Create patient record"))
          )
        )
      );
    }

    function PatientProfile() {
      if (!selectedPatient) return h("div", { className: "empty-state profile-empty" }, h("strong", null, "Choose a patient record"), h(Button, { onClick: () => goTo("patients") }, "Back to patients"));
      const suggestedRecipes = data.recipes.filter((recipe) =>
        recipe.compatibility.some((preference) => selectedPatient.restrictions.includes(preference)));
      return h(React.Fragment, null,
        h("button", { className: "back-link", onClick: () => goTo("patients") }, h(Icon, { name: "chevron" }), "Back to patients"),
        h(PageHeading, { eyebrow: "PATIENT PROFILE", title: "Patient overview", description: "Fictional care record · Patient IDs are not access credentials.", actions: h(Tag, { tone: selectedPatient.status === "Active" ? "green" : "neutral" }, h("span", { className: "tag-dot" }), selectedPatient.status) }),
        h("section", { className: "profile-hero panel" },
          h("div", { className: "profile-avatar" }, h(Icon, { name: "users" })),
          h("div", { className: "profile-identity" }, h("span", { className: "eyebrow" }, "PATIENT UUID"), h("h2", null, selectedPatient.id), h("span", null, `Registered ${formatDate(selectedPatient.registeredAt)}`)),
          h(Button, { icon: "sparkles", onClick: generateRecommendations }, "Generate grocery recommendations")
        ),
        h("div", { className: "profile-grid" },
          h("section", { className: "panel profile-section" },
            h("div", { className: "panel-heading" }, h("div", null, h("h2", null, "Care preferences"), h("p", null, "Visible here only for the selected demo profile."))),
            h("div", { className: "profile-preference" }, h("span", { className: "preference-icon preference-purple" }, h(Icon, { name: "clipboard" })), h("div", null, h("strong", null, "Medical conditions"), h("div", { className: "tag-list" }, selectedPatient.conditions.length ? selectedPatient.conditions.map((condition) => h(Tag, { key: condition }, condition)) : h("span", { className: "muted" }, "None selected")))),
            h("div", { className: "profile-preference" }, h("span", { className: "preference-icon preference-green" }, h(Icon, { name: "leaf" })), h("div", null, h("strong", null, "Dietary restrictions"), h("div", { className: "tag-list" }, selectedPatient.restrictions.length ? selectedPatient.restrictions.map((restriction) => h(Tag, { tone: "green", key: restriction }, restriction)) : h("span", { className: "muted" }, "None selected"))))
          ),
          h("section", { className: "panel profile-section" },
            h("div", { className: "panel-heading panel-heading-inline" }, h("div", null, h("h2", null, "Previous grocery orders"), h("p", null, "Recent order activity for this record.")), h(Icon, { name: "cart", className: "heading-icon" })),
            selectedPatient.orders.length
              ? h("div", { className: "order-list" }, ...selectedPatient.orders.map((order) => h("div", { className: "order-row", key: order.id },
                h("span", { className: "order-icon" }, h(Icon, { name: "package" })),
                h("div", null, h("strong", null, order.id), h("span", null, `${order.items} grocery items · ${formatDate(order.date)}`)),
                h(Tag, { tone: order.status === "Delivered" ? "green" : "orange" }, order.status)
              )))
              : h("div", { className: "empty-inline" }, "No grocery orders yet.")
          ),
          h("section", { className: "panel profile-section" },
            h("div", { className: "panel-heading panel-heading-inline" },
              h("div", null, h("h2", null, "Recommended recipes"), h("p", null, "Mock suggestions that match selected dietary preferences.")),
              h(Tag, null, "Mock")
            ),
            h("div", { className: "recommended-list" },
              ...(suggestedRecipes.length ? suggestedRecipes : data.recipes).slice(0, 3).map((recipe) =>
                h("div", { className: "recommended-recipe", key: recipe.name },
                  h("span", { className: `recommended-emoji recipe-${recipe.color}` }, recipe.image),
                  h("div", null, h("strong", null, recipe.name), h("span", null, recipe.category))
                ))
            )
          )
        ),
        recommendationsReady && h("section", { className: "panel generated-note" },
          h("span", { className: "generated-check" }, h(Icon, { name: "check" })),
          h("div", null, h("strong", null, "Demo recommendations generated"), h("p", null, "Suggested staples include oats, leafy greens, and no-salt-added legumes based on this profile’s preferences.")),
          h(Tag, null, "Mock data")
        )
      );
    }

    function InventoryPage() {
      const restock = data.inventory.filter((item) => item.quantity > 0 && item.quantity < 50).length;
      const outOfStock = data.inventory.filter((item) => item.quantity === 0).length;
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "WAREHOUSE", title: "Grocery inventory", description: "Fictional products with nutrition information for a demo warehouse.", actions: h(Button, { variant: "secondary", icon: "plus", onClick: () => notify("Inventory editing is not connected in this demo.") }, "Add product") }),
        h("div", { className: "inventory-summary" },
          h("div", null, h("span", null, "PRODUCTS"), h("strong", null, data.inventory.length)),
          h("div", null, h("span", null, "NEED RESTOCK"), h("strong", { className: "text-orange" }, restock)),
          h("div", null, h("span", null, "OUT OF STOCK"), h("strong", { className: "text-red" }, outOfStock))
        ),
        h("section", { className: "panel table-panel" },
          h("div", { className: "table-toolbar" }, h("div", null, h("h2", null, "Products"), h("p", null, "Nutrition values shown per serving.")), h("span", { className: "table-updated" }, "Updated just now")),
          h("div", { className: "table-wrap" }, h("table", null,
            h("thead", null, h("tr", null, h("th", null, "PRODUCT"), h("th", null, "CATEGORY"), h("th", null, "QTY AVAILABLE"), h("th", null, "STOCK STATUS"), h("th", null, "NUTRITION / SERVING"))),
            h("tbody", null, ...data.inventory.map((item) => h("tr", { key: item.name },
              h("td", null, h("div", { className: "product-cell" }, h("span", { className: `product-emoji product-${item.color}` }, item.icon), h("strong", null, item.name))),
              h("td", null, h("span", { className: "category-label" }, item.category)),
              h("td", null, h("strong", null, item.quantity), h("span", { className: "unit-label" }, ` ${item.unit}`)),
              h("td", null, h(Tag, { tone: item.stock === "In stock" ? "green" : item.stock === "Low stock" ? "orange" : "red" }, h("span", { className: "tag-dot" }), item.stock)),
              h("td", null, h("span", { className: "nutrition-cell" }, `${item.calories} cal`, h("i", null), `${item.sodium} mg sodium`))
            )))
          ))
        )
      );
    }

    function RecipesPage() {
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "PERSONALIZED NUTRITION", title: "Recipe recommendations", description: "Simple, nourishing ideas built around familiar pantry ingredients.", actions: h(Button, { icon: "sparkles", onClick: generateRecommendations }, "Generate AI Recommendations") }),
        h("div", { className: "demo-notice" }, h(Icon, { name: "sparkles" }), h("span", null, h("strong", null, "Demo mode:"), " Recommendations below use mock data. No AI service, including Gemini, is connected.")),
        recommendationsReady && h("div", { className: "generated-note compact-generated" }, h("span", { className: "generated-check" }, h(Icon, { name: "check" })), h("span", null, "Mock recommendations refreshed for this demo session.")),
        h("div", { className: "recipe-grid" },
          ...data.recipes.map((recipe) => h("article", { className: "recipe-card panel", key: recipe.name },
            h("div", { className: `recipe-art recipe-${recipe.color}` }, h("span", { className: "recipe-art-emoji" }, recipe.image), h("span", { className: "recipe-art-label" }, "NOURISH · EVERYDAY"), h("span", { className: "recipe-art-spark" }, "✦")),
            h("div", { className: "recipe-body" },
              h("span", { className: "eyebrow" }, recipe.category),
              h("h2", null, recipe.name),
              h("div", { className: "compatibility-list" }, ...recipe.compatibility.map((label) => h(Tag, { tone: "green", key: label }, h(Icon, { name: "check" }), label))),
              h("div", { className: "recipe-nutrition" },
                h("div", null, h("strong", null, recipe.calories), h("span", null, "calories")),
                h("div", null, h("strong", null, `${recipe.sodium} mg`), h("span", null, "sodium")),
                h("div", null, h("strong", null, `${recipe.protein} g`), h("span", null, "protein"))
              ),
              h("div", { className: "ingredients-line" }, h("strong", null, "Ingredients"), h("p", null, recipe.ingredients.join(" · "))),
              h(Button, { variant: "secondary", className: "recipe-add-button", icon: "plus", onClick: () => addToCart(recipe.ingredients[0]) }, "Add main ingredient to cart")
            )
          ))
        )
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
          h("div", { className: "suggested-row" }, ...data.inventory.filter((item) => item.quantity > 0).slice(0, 3).map((item) =>
            h("button", { className: "suggested-card", key: item.name, onClick: () => addToCart(item.name) },
              h("span", null, item.icon), h("strong", null, item.name), h(Icon, { name: "plus" })
            )))
        )
      );
    }

    function OrdersPage() {
      const orders = patients.flatMap((patient) => patient.orders.map((order) => ({ ...order, patientId: patient.id }))).sort((a, b) => b.date.localeCompare(a.date));
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "FULFILLMENT", title: "Orders", description: "Follow recent grocery orders across fictional patient records." }),
        h("div", { className: "order-stats" },
          h("div", null, h("span", null, "TOTAL ORDERS"), h("strong", null, orders.length)),
          h("div", null, h("span", null, "PROCESSING"), h("strong", { className: "text-orange" }, orders.filter((order) => order.status === "Processing").length)),
          h("div", null, h("span", null, "DELIVERED"), h("strong", { className: "text-green" }, orders.filter((order) => order.status === "Delivered").length))
        ),
        h("section", { className: "panel table-panel" },
          h("div", { className: "table-toolbar" }, h("div", null, h("h2", null, "Recent orders"), h("p", null, "No patient names or contact details are stored."))),
          h("div", { className: "table-wrap" }, h("table", null,
            h("thead", null, h("tr", null, h("th", null, "ORDER"), h("th", null, "PATIENT ID"), h("th", null, "ORDER DATE"), h("th", null, "ITEMS"), h("th", null, "STATUS"))),
            h("tbody", null, ...orders.map((order) => h("tr", { key: order.id },
              h("td", null, h("strong", null, order.id)),
              h("td", null, h("span", { className: "table-patient-id" }, order.patientId)),
              h("td", null, formatDate(order.date)),
              h("td", null, `${order.items} items`),
              h("td", null, h(Tag, { tone: order.status === "Delivered" ? "green" : "orange" }, h("span", { className: "tag-dot" }), order.status))
            )))
          )),
          orders.length === 0 && h("div", { className: "empty-state" }, "No orders yet.")
        )
      );
    }

    function SettingsPage() {
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "WORKSPACE", title: "Settings", description: "A few workspace details for this local demo prototype." }),
        h("section", { className: "panel settings-card" },
          h("div", { className: "settings-row" }, h("span", { className: "settings-icon" }, h(Icon, { name: "leaf" })), h("div", null, h("strong", null, "Workspace"), h("span", null, "Byte Bots · Epic Cure")), h(Tag, { tone: "green" }, "Demo")),
          h("div", { className: "settings-row" }, h("span", { className: "settings-icon" }, h(Icon, { name: "bell" })), h("div", null, h("strong", null, "Email updates"), h("span", null, "Receive demo activity summaries")), h("button", { className: `toggle ${emailUpdates ? "toggle-on" : ""}`, onClick: () => setEmailUpdates(!emailUpdates), role: "switch", "aria-checked": emailUpdates, "aria-label": "Toggle email updates" }, h("span", null))),
          h("div", { className: "settings-privacy" }, h(Icon, { name: "check" }), h("span", null, "Privacy-first prototype: patient records exist only in React state and are cleared when the page is refreshed."))
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
        h("div", { className: "main-content" }, CurrentPage()),
        h("footer", { className: "app-footer" }, h("span", null, "BYTE BOTS · EPIC CURE"), h("span", null, "Built for care. Powered by good food."))
      ),
      RegistrationModal(),
      toast && h("div", { className: "toast", role: "status" }, h(Icon, { name: "check" }), toast)
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
