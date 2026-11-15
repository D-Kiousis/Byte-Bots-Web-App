(function () {
  const h = React.createElement;
  const { useEffect, useMemo, useState } = React;

  // What each role can open. The server enforces the same rules on every API
  // call; hiding a menu item here is only a convenience.
  const adminNav = [
    ["dashboard", "Dashboard", "grid"],
    ["patients", "Patients", "users"],
    ["inventory", "Grocery inventory", "box"],
    ["recipes", "Recipe recommendations", "sparkles"],
    ["cart", "Shopping cart", "cart"],
    ["orders", "Orders", "clipboard"],
  ];
  const patientNav = [
    ["myprofile", "My profile", "users"],
    ["groceries", "Groceries", "box"],
    ["recipes", "Recipe recommendations", "sparkles"],
    ["cart", "Shopping cart", "cart"],
  ];
  const allowedPages = {
    admin: ["dashboard", "patients", "patientDetail", "inventory", "recipes", "cart", "orders", "settings"],
    patient: ["myprofile", "groceries", "recipes", "cart"],
  };
  const homePage = { admin: "dashboard", patient: "myprofile" };
  const healthConditionOptions = [
    ["diabetes", "Diabetes"],
    ["hypertension", "Hypertension"],
    ["heart_disease", "Heart disease"],
    ["chronic_kidney_disease", "Chronic kidney disease"],
  ];
  const allergenOptions = [
    ["milk", "Milk"],
    ["eggs", "Eggs"],
    ["fish", "Fish"],
    ["shellfish", "Crustacean shellfish"],
    ["tree_nuts", "Tree nuts"],
    ["peanuts", "Peanuts"],
    ["wheat", "Wheat"],
    ["soy", "Soy"],
    ["sesame", "Sesame"],
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
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
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

  // Set by the app so any request that comes back "not signed in" returns the
  // person to the sign-in screen. Pass { quiet: true } to skip that.
  let onUnauthorized = null;

  async function api(path, options = {}) {
    const { quiet, ...fetchOptions } = options;
    const response = await fetch(path, {
      ...fetchOptions,
      credentials: "same-origin",
      headers: {
        ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
        ...(fetchOptions.headers || {}),
      },
    });
    let result = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }
    if (response.status === 401 && !quiet && onUnauthorized) onUnauthorized();
    if (!response.ok) {
      const error = new Error((result && result.error) || "Request failed.");
      error.status = response.status;
      throw error;
    }
    return result;
  }

  const visuals = {
    Grains: { icon: "🌾", color: "sand" },
    Pantry: { icon: "🫘", color: "lilac" },
    Produce: { icon: "🥬", color: "mint" },
    Protein: { icon: "🐟", color: "peach" },
  };
  function visualFor(category) {
    return visuals[category] || { icon: "🛒", color: "blue" };
  }

  const statusTones = { active: "green", pending: "orange", expired: "red" };
  function statusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function mapPatient(record) {
    const account = Array.isArray(record.accounts) ? record.accounts[0] : record.accounts;
    return {
      id: record.id,
      registeredAt: record.created_at.slice(0, 10),
      displayName: record.display_name || "",
      householdSize: Number(record.household_size || 1),
      enrollmentStatus: record.enrollment_status || "active",
      healthConditions: Array.isArray(record.health_conditions) ? record.health_conditions : [],
      allergens: Array.isArray(record.allergens) ? record.allergens : [],
      login: account
        ? { username: account.username, active: account.active, mustChange: account.must_change_password, lastLogin: account.last_login_at }
        : null,
    };
  }

  function mapInventory(record) {
    const product = record.products || {};
    const quantity = Number(record.quantity);
    const reorderLevel = Number(record.reorder_level);
    const visual = visualFor(product.category);

    return {
      id: record.product_id,
      name: product.name || "Unnamed product",
      category: product.category || "Other",
      quantity,
      reorderLevel,
      unit: product.unit || "each",
      calories: Number(product.calories_per_serving || 0),
      sodium: Number(product.sodium_mg || 0),
      allergens: Array.isArray(product.allergens) ? product.allergens : [],
      allergenInfoVerified: product.allergen_info_verified === true,
      stock: quantity === 0 ? "Out of stock" : quantity <= reorderLevel ? "Low stock" : "In stock",
      icon: visual.icon,
      color: visual.color,
      updatedAt: record.updated_at,
    };
  }

  // Patients get a smaller record: no exact quantities, SKUs or reorder levels.
  function mapGrocery(record) {
    const visual = visualFor(record.category);
    return {
      id: record.id,
      name: record.name,
      category: record.category || "Other",
      unit: record.unit || "each",
      calories: Number(record.calories_per_serving || 0),
      sodium: Number(record.sodium_mg || 0),
      allergens: Array.isArray(record.allergens) ? record.allergens : [],
      allergenInfoVerified: record.allergen_info_verified === true,
      limited: record.availability === "limited",
      icon: visual.icon,
      color: visual.color,
    };
  }

  function App() {
    // account: undefined while checking the session, null when signed out.
    const [account, setAccount] = useState(undefined);
    const [myPatient, setMyPatient] = useState(null);
    const [authError, setAuthError] = useState("");
    const [signingIn, setSigningIn] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [savingPassword, setSavingPassword] = useState(false);
    const [page, setPage] = useState("dashboard");
    const [patients, setPatients] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [groceries, setGroceries] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [credentials, setCredentials] = useState(null);
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
    const [savingPatient, setSavingPatient] = useState(false);
    const [savingHealthProfile, setSavingHealthProfile] = useState(false);
    const [savingLogin, setSavingLogin] = useState(false);
    const [emailUpdates, setEmailUpdates] = useState(true);
    const [cart, setCart] = useState([]);
    const [recipeResults, setRecipeResults] = useState([]);
    const [recipeError, setRecipeError] = useState("");
    const [recipeNote, setRecipeNote] = useState("");
    const [generatingRecipes, setGeneratingRecipes] = useState(false);

    const role = account ? account.role : null;
    const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
    const groceryItems = role === "admin" ? inventory.filter((item) => item.quantity > 0) : groceries;
    const filteredPatients = useMemo(() => {
      const query = search.trim().toLowerCase();
      return patients.filter((patient) => !query
        || patient.id.toLowerCase().includes(query)
        || patient.displayName.toLowerCase().includes(query)
        || (patient.login && patient.login.username.toLowerCase().includes(query)));
    }, [patients, search]);

    function notify(message) {
      setToast(message);
      window.setTimeout(() => setToast(""), 3000);
    }

    // Everything a person was looking at is cleared on sign-out, so the next
    // person on a shared kiosk or phone never sees leftovers.
    function resetSession(message) {
      setAccount(null);
      setMyPatient(null);
      setPatients([]);
      setInventory([]);
      setGroceries([]);
      setCart([]);
      setRecipeResults([]);
      setRecipeError("");
      setRecipeNote("");
      setSelectedPatientId(null);
      setCredentials(null);
      setSearch("");
      setMobileNavOpen(false);
      setRegisterOpen(false);
      setProductOpen(false);
      setDatabaseError("");
      setPasswordError("");
      setAuthError(message);
    }

    async function loadData(current) {
      const who = current || account;
      try {
        if (who.role === "admin") {
          const health = await api("/api/health");
          setGeminiConfigured(Boolean(health.geminiConfigured));
          if (!health.databaseConfigured) {
            throw new Error("Supabase is not configured. Add the project URL and secret key to .env.");
          }
          const [patientRows, inventoryRows] = await Promise.all([
            api("/api/patients"),
            api("/api/inventory"),
          ]);
          setPatients(patientRows.map(mapPatient));
          setInventory(inventoryRows.map(mapInventory));
        } else {
          const rows = await api("/api/groceries");
          setGroceries(rows.map(mapGrocery));
        }
        setDatabaseError("");
        return true;
      } catch (error) {
        // A 401 already sent the person back to the sign-in screen.
        if (error.status !== 401) setDatabaseError(error.message);
        return false;
      }
    }

    async function startSession(me) {
      setAuthError("");
      setAccount(me.account);
      setMyPatient(me.patient ? mapPatient(me.patient) : null);
      setPage(homePage[me.account.role]);
      if (!me.account.must_change_password) {
        await loadData(me.account);
      }
    }

    useEffect(() => {
      onUnauthorized = () => resetSession("Your session ended. Sign in again.");
      (async () => {
        try {
          const me = await api("/api/auth/me", { quiet: true });
          await startSession(me);
        } catch {
          setAccount(null);
        }
      })();
    }, []);

    async function signIn(event) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      setSigningIn(true);
      setAuthError("");
      try {
        const me = await api("/api/auth/login", {
          method: "POST",
          quiet: true,
          body: JSON.stringify({ username: values.username, password: values.password }),
        });
        await startSession(me);
      } catch (error) {
        setAuthError(error.message);
      } finally {
        setSigningIn(false);
      }
    }

    async function signOut() {
      try {
        await api("/api/auth/logout", { method: "POST", quiet: true });
      } catch {
        // The cookie may already be gone; either way this browser is signed out.
      }
      resetSession("");
    }

    async function changePassword(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const values = Object.fromEntries(new FormData(form).entries());
      setPasswordError("");
      if (values.new_password !== values.confirm_password) {
        setPasswordError("The new passwords do not match.");
        return;
      }
      if (values.new_password.length < 8) {
        setPasswordError("Use at least 8 characters for the new password.");
        return;
      }
      setSavingPassword(true);
      try {
        await api("/api/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ current_password: values.current_password, new_password: values.new_password }),
        });
        form.reset();
        const wasTemporary = account.must_change_password;
        const updated = { ...account, must_change_password: false };
        setAccount(updated);
        if (wasTemporary) await loadData(updated);
        notify("Password updated.");
      } catch (error) {
        setPasswordError(error.message);
      } finally {
        setSavingPassword(false);
      }
    }

    function goTo(nextPage) {
      setPage(nextPage);
      setMobileNavOpen(false);
      setSearch("");
      setCredentials(null);
    }

    function showPatient(patient) {
      setSelectedPatientId(patient.id);
      setPage("patientDetail");
      setMobileNavOpen(false);
      setCredentials(null);
    }

    async function registerPatient(event) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      setRegistering(true);
      let record;
      try {
        record = await api("/api/patients", {
          method: "POST",
          body: JSON.stringify({
            id: pendingUuid,
            display_name: values.display_name || "",
            household_size: Number(values.household_size || 1),
            enrollment_status: "active",
          }),
        });
      } catch (error) {
        setDatabaseError(error.message);
        notify(`Patient could not be saved: ${error.message}`);
        setRegistering(false);
        return;
      }

      let created = null;
      let loginError = "";
      if (values.create_login === "on") {
        try {
          const login = await api(`/api/patients/${encodeURIComponent(record.id)}/account`, {
            method: "POST",
            body: JSON.stringify({}),
          });
          created = { patientId: record.id, username: login.username, password: login.temporary_password };
        } catch (error) {
          loginError = error.message;
        }
      }

      setRegisterOpen(false);
      setPendingUuid(makeUuid());
      await loadData(account);
      showPatient(record);
      if (created) setCredentials(created);
      notify(loginError ? `Patient saved. The login could not be created: ${loginError}` : "Patient saved.");
      setRegistering(false);
    }

    async function savePatient(event) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      setSavingPatient(true);
      try {
        await api(`/api/patients/${encodeURIComponent(selectedPatientId)}`, {
          method: "PATCH",
          body: JSON.stringify({
            display_name: values.display_name || "",
            household_size: Number(values.household_size),
            enrollment_status: values.enrollment_status,
          }),
        });
        await loadData(account);
        notify("Patient updated.");
      } catch (error) {
        notify(`Patient could not be updated: ${error.message}`);
      } finally {
        setSavingPatient(false);
      }
    }

    async function saveHealthProfile(event) {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const healthConditions = values.getAll("health_conditions");
      const selectedAllergens = values.getAll("allergens");
      setSavingHealthProfile(true);
      try {
        await api("/api/patient/profile", {
          method: "PATCH",
          body: JSON.stringify({
            health_conditions: healthConditions,
            allergens: selectedAllergens,
          }),
        });
        setMyPatient((current) => current
          ? { ...current, healthConditions, allergens: selectedAllergens }
          : current);
        notify("Your health profile was saved.");
      } catch (error) {
        notify(`Your health profile could not be saved: ${error.message}`);
      } finally {
        setSavingHealthProfile(false);
      }
    }

    async function generateRecipeRecommendations() {
      setGeneratingRecipes(true);
      setRecipeError("");
      setRecipeResults([]);
      try {
        const result = await api("/api/ai/recipes", {
          method: "POST",
          body: JSON.stringify({}),
        });
        setRecipeResults(Array.isArray(result.recipes)
          ? result.recipes.map((recipe) => ({ ...recipe, source: recipe.source || result.source }))
          : []);
        setRecipeNote(result.excluded_count
          ? `${result.excluded_count} recipe idea${result.excluded_count === 1 ? "" : "s"} did not pass allergen screening.`
          : result.excluded_products_count
            ? `${result.excluded_products_count} in-stock product${result.excluded_products_count === 1 ? " was" : "s were"} left out because labels were unreviewed or conflicted with your selections.`
            : result.source === "none"
              ? ""
          : result.source === "gemini"
            ? "Generated from Gemini model knowledge; this is not live web search."
            : "Showing general fallback ideas because Gemini was unavailable.");
        if (!result.recipes || result.recipes.length === 0) {
          if (result.reason === "insufficient_eligible_inventory") {
            setRecipeError(result.eligible_products_count === 1
              ? "Only one in-stock product currently meets the allergen checks. Ask staff to review labels or add another compatible product."
              : "No in-stock products currently meet the allergen checks. Ask staff to review package labels or update stock.");
          } else if (result.reason === "no_stock") {
            setRecipeError("There are no in-stock products to build recipe ideas from.");
          } else if (result.excluded_count) {
            setRecipeError("No generated recipe ideas passed allergen screening.");
          } else {
            setRecipeError("There are not enough eligible in-stock products to build recipe ideas from.");
          }
        }
      } catch (error) {
        setRecipeError(error.message);
      } finally {
        setGeneratingRecipes(false);
      }
    }

    async function createLogin(event) {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.currentTarget).entries());
      setSavingLogin(true);
      try {
        const login = await api(`/api/patients/${encodeURIComponent(selectedPatientId)}/account`, {
          method: "POST",
          body: JSON.stringify(values.username ? { username: values.username } : {}),
        });
        setCredentials({ patientId: selectedPatientId, username: login.username, password: login.temporary_password });
        await loadData(account);
        notify("Login created.");
      } catch (error) {
        notify(`Login could not be created: ${error.message}`);
      } finally {
        setSavingLogin(false);
      }
    }

    async function resetPassword() {
      if (!window.confirm("Reset this patient's password? Their current password stops working right away and they are signed out.")) return;
      setSavingLogin(true);
      try {
        const login = await api(`/api/patients/${encodeURIComponent(selectedPatientId)}/reset-password`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        setCredentials({ patientId: selectedPatientId, username: login.username, password: login.temporary_password });
        await loadData(account);
        notify("Password reset.");
      } catch (error) {
        notify(`Password could not be reset: ${error.message}`);
      } finally {
        setSavingLogin(false);
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
            allergens: new FormData(event.currentTarget).getAll("product_allergens"),
            allergen_info_verified: values.allergen_info_verified === "on",
          }),
        });
        setProductOpen(false);
        const refreshed = await loadData(account);
        notify(refreshed ? "Product saved; its inventory starts at zero." : "Product saved, but the inventory list could not be refreshed.");
      } catch (error) {
        setDatabaseError(error.message);
        notify(`Product could not be saved: ${error.message}`);
      } finally {
        setSavingProduct(false);
      }
    }

    async function updateProductAllergens(event, item) {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      try {
        await api(`/api/products/${encodeURIComponent(item.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            allergens: values.getAll("product_allergens"),
            allergen_info_verified: values.get("allergen_info_verified") === "on",
          }),
        });
        const refreshed = await loadData(account);
        notify(refreshed ? "Allergen information updated." : "Allergen information saved, but inventory could not be refreshed.");
      } catch (error) {
        notify(`Allergen information could not be saved: ${error.message}`);
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
        const refreshed = await loadData(account);
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
      const items = role === "admin" ? adminNav : patientNav;
      return h(React.Fragment, null,
        mobileNavOpen && h("button", { className: "nav-scrim", "aria-label": "Close navigation", onClick: () => setMobileNavOpen(false) }),
        h("aside", { className: `sidebar ${mobileNavOpen ? "sidebar-open" : ""}` },
          h("div", { className: "brand" },
            h("div", { className: "brand-mark" }, "BB"),
            h("div", null, h("div", { className: "brand-name" }, "BYTE BOTS"), h("div", { className: "brand-subtitle" }, "EPIC CURE"))
          ),
          h("div", { className: "workspace-label" }, role === "admin" ? "ADMINISTRATOR" : "MY ACCOUNT"),
          h("nav", { className: "nav-list", "aria-label": "Main navigation" },
            ...items.map(([id, label, icon]) => h("button", {
              key: id,
              className: `nav-item ${page === id || (page === "patientDetail" && id === "patients") ? "nav-item-active" : ""}`,
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
            role === "admin" && h("button", { className: `nav-item ${page === "settings" ? "nav-item-active" : ""}`, onClick: () => goTo("settings") },
              h(Icon, { name: "settings" }), h("span", null, "Settings")),
            h("button", { className: "nav-item", onClick: signOut },
              h(Icon, { name: "logout" }), h("span", null, "Sign out"))
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
          placeholder: "Search by name, username or ID",
          "aria-label": "Search patients by name, username or ID",
        })
      ) : h("div", { className: "topbar-context" }, h("span", { className: "status-dot" }), "Demo environment");
      return h("header", { className: "topbar" },
        h("button", { className: "mobile-menu icon-button", onClick: () => setMobileNavOpen(true), "aria-label": "Open navigation" }, h(Icon, { name: "menu" })),
        h("div", { className: "breadcrumb" }, "Workspace", h(Icon, { name: "chevron" }), h("strong", null, "Epic Cure")),
        h("div", { className: "topbar-right" },
          searchBox,
          h("span", { className: "role-badge" }, role === "admin" ? "Administrator" : "Patient"),
          h("div", { className: "avatar", title: account.username, "aria-label": `Signed in as ${account.username}` }, account.username.slice(0, 2).toUpperCase())
        )
      );
    }

    function PageHeading({ eyebrow, title, description, actions }) {
      return h("div", { className: "page-heading" },
        h("div", null, eyebrow && h("div", { className: "eyebrow" }, eyebrow), h("h1", null, title), description && h("p", null, description)),
        actions && h("div", { className: "heading-actions" }, actions)
      );
    }

    function PasswordForm() {
      return h("form", { className: "auth-form", onSubmit: changePassword },
        h("label", { className: "auth-label", htmlFor: "current_password" }, "Current password"),
        h("input", { className: "auth-input", id: "current_password", name: "current_password", type: "password", autoComplete: "current-password", required: true }),
        h("label", { className: "auth-label", htmlFor: "new_password" }, "New password"),
        h("input", { className: "auth-input", id: "new_password", name: "new_password", type: "password", autoComplete: "new-password", minLength: 8, required: true }),
        h("label", { className: "auth-label", htmlFor: "confirm_password" }, "Confirm new password"),
        h("input", { className: "auth-input", id: "confirm_password", name: "confirm_password", type: "password", autoComplete: "new-password", minLength: 8, required: true }),
        h("p", { className: "auth-hint" }, "Use at least 8 characters."),
        passwordError && h("div", { className: "auth-error", role: "alert" }, passwordError),
        h(Button, { type: "submit", className: "auth-submit", disabled: savingPassword }, savingPassword ? "Saving..." : "Save new password")
      );
    }

    function LoginScreen() {
      return h("main", { className: "auth-screen" },
        h("section", { className: "auth-card", "aria-labelledby": "signin-title" },
          h("div", { className: "auth-brand" },
            h("div", { className: "brand-mark" }, "BB"),
            h("div", null, h("div", { className: "brand-name" }, "BYTE BOTS"), h("div", { className: "brand-subtitle" }, "EPIC CURE"))
          ),
          h("h1", { id: "signin-title" }, "Sign in"),
          h("p", { className: "auth-lead" }, "Use the username and password Epic Cure staff gave you."),
          authError && h("div", { className: "auth-error", role: "alert" }, authError),
          h("form", { className: "auth-form", onSubmit: signIn },
            h("label", { className: "auth-label", htmlFor: "username" }, "Username"),
            h("input", { className: "auth-input", id: "username", name: "username", autoComplete: "username", autoCapitalize: "none", autoCorrect: "off", spellCheck: false, required: true, autoFocus: true }),
            h("label", { className: "auth-label", htmlFor: "password" }, "Password"),
            h("input", { className: "auth-input", id: "password", name: "password", type: "password", autoComplete: "current-password", required: true }),
            h(Button, { type: "submit", className: "auth-submit", disabled: signingIn }, signingIn ? "Signing in..." : "Sign in")
          ),
          h("p", { className: "auth-note" }, "Demo environment. Use synthetic data only.")
        )
      );
    }

    function ChangePasswordScreen() {
      return h("main", { className: "auth-screen" },
        h("section", { className: "auth-card", "aria-labelledby": "password-title" },
          h("div", { className: "auth-brand" },
            h("div", { className: "brand-mark" }, "BB"),
            h("div", null, h("div", { className: "brand-name" }, "BYTE BOTS"), h("div", { className: "brand-subtitle" }, "EPIC CURE"))
          ),
          h("h1", { id: "password-title" }, "Choose a new password"),
          h("p", { className: "auth-lead" }, `You are signed in as ${account.username} with a temporary password. Choose your own to continue.`),
          PasswordForm(),
          h("button", { className: "auth-link", onClick: signOut }, "Sign out")
        )
      );
    }

    function CredentialsNotice() {
      if (!credentials || credentials.patientId !== selectedPatientId) return null;
      return h("section", { className: "panel credentials-panel", role: "status" },
        h("div", { className: "credentials-head" },
          h("strong", null, "Temporary sign-in details"),
          h("button", { className: "text-button", onClick: () => setCredentials(null) }, "Hide")
        ),
        h("p", null, "Give these to the patient now. The password is shown only once. They choose their own password the first time they sign in."),
        h("dl", { className: "credentials-list" },
          h("div", null, h("dt", null, "Username"), h("dd", null, credentials.username)),
          h("div", null, h("dt", null, "Temporary password"), h("dd", null, credentials.password))
        )
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
                ["users", "quick-orange", "View patients", "Browse saved records", () => goTo("patients")],
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
                h("div", { className: "activity-copy" }, h("strong", null, "Patients"), h("span", null, "Patient records and logins")),
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
        h(PageHeading, { eyebrow: "CARE NETWORK", title: "Patients", description: "Create patient records and their sign-ins. Keep names to a first name or nickname; no health details are stored.", actions: h(Button, { icon: "plus", onClick: () => setRegisterOpen(true) }, "Add patient") }),
        h("div", { className: "patient-summary-row" },
          h("div", { className: "patient-summary-card" }, h("span", { className: "summary-icon summary-violet" }, h(Icon, { name: "users" })), h("div", null, h("strong", null, patients.length), h("span", null, "Total records"))),
          h("div", { className: "privacy-inline" }, h(Icon, { name: "check" }), "Only administrators can see this page")
        ),
        h("section", { className: "panel table-panel" },
          h("div", { className: "table-toolbar" },
            h("div", null, h("h2", null, "Patient directory"), h("p", null, "Search by name, username or patient ID.")),
            h("button", { className: "text-button", onClick: () => loadData() }, "Refresh")
          ),
          h("div", { className: "table-wrap" },
            h("table", null,
              h("thead", null, h("tr", null, h("th", null, "PATIENT"), h("th", null, "HOUSEHOLD"), h("th", null, "STATUS"), h("th", null, "LOGIN"), h("th", null, "CREATED"), h("th", null, " "))),
              h("tbody", null, filteredPatients.length
                ? filteredPatients.map((patient) => h("tr", { key: patient.id },
                  h("td", null, h("div", { className: "patient-id-cell" }, h("span", { className: "patient-mini-avatar" }, h(Icon, { name: "users" })), h("span", null, h("strong", null, patient.displayName || "Patient"), h("small", null, patient.id)))),
                  h("td", null, patient.householdSize),
                  h("td", null, h(Tag, { tone: statusTones[patient.enrollmentStatus] || "neutral" }, h("span", { className: "tag-dot" }), statusLabel(patient.enrollmentStatus))),
                  h("td", null, patient.login
                    ? h("span", null, patient.login.username, patient.login.mustChange ? h(Tag, { tone: "orange" }, "Temporary password") : null)
                    : h(Tag, null, "No login")),
                  h("td", null, formatDate(patient.registeredAt)),
                  h("td", null, h("button", { className: "row-action", onClick: () => showPatient(patient), "aria-label": `Open ${patient.displayName || "patient"} record` }, "Open", h(Icon, { name: "arrow" })))
                ))
                : h("tr", null, h("td", { colSpan: 6, className: "patient-empty" }, "No patients found. Add one to get started."))
              )
            )
          )
        ),
        h("p", { className: "privacy-footnote" }, h(Icon, { name: "leaf" }), "Patient IDs are identifiers only, not passwords or access controls.")
      );
    }

    function RegistrationModal() {
      if (!registerOpen) return null;
      return h("div", { className: "modal-backdrop", onMouseDown: (event) => { if (event.target === event.currentTarget) setRegisterOpen(false); } },
        h("section", { className: "modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "register-title" },
          h("div", { className: "modal-header" },
            h("div", null, h("span", { className: "eyebrow" }, "NEW RECORD"), h("h2", { id: "register-title" }, "Add a patient"), h("p", null, "Saved: patient ID, optional first name or nickname, household size and enrollment status.")),
            h("button", { className: "icon-button", onClick: () => setRegisterOpen(false), "aria-label": "Close form" }, h(Icon, { name: "close" }))
          ),
          h("form", { onSubmit: registerPatient, className: "registration-form" },
            h("label", { className: "form-label" }, "Patient UUID",
              h("div", { className: "uuid-preview" }, h("span", null, pendingUuid), h("small", null, "Generated automatically"))
            ),
            h("label", { className: "form-label" }, "First name or nickname (optional)",
              h("input", { className: "form-control", name: "display_name", maxLength: 60, autoComplete: "off" })
            ),
            h("label", { className: "form-label" }, "Household size",
              h("input", { className: "form-control", name: "household_size", type: "number", min: "1", max: "20", step: "1", defaultValue: "1", required: true })
            ),
            h("label", { className: "checkbox-line" },
              h("input", { type: "checkbox", name: "create_login", defaultChecked: true }),
              h("span", null, "Create a sign-in for this patient")
            ),
            h("div", { className: "form-privacy" }, h(Icon, { name: "leaf" }), h("span", null, "Do not enter full names, contact details, or medical information.")),
            h("div", { className: "modal-actions" }, h(Button, { variant: "secondary", onClick: () => setRegisterOpen(false) }, "Cancel"), h(Button, { type: "submit", icon: "plus", disabled: registering }, registering ? "Saving..." : "Add patient"))
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
            h("fieldset", { className: "form-fieldset" },
              h("legend", null, "Contains (from package label)"),
              h("p", { className: "field-help" }, "Select every listed allergen. Do not guess if the label is unclear."),
              h("div", { className: "checkbox-grid" }, ...allergenOptions.map(([value, label]) =>
                h("label", { className: "form-checkbox", key: value },
                  h("input", { type: "checkbox", name: "product_allergens", value }),
                  h("span", null, label)
                )
              ))
            ),
            h("label", { className: "form-checkbox form-checkbox-review" },
              h("input", { type: "checkbox", name: "allergen_info_verified" }),
              h("span", null, "I reviewed the package label and verified the allergen information")
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

    // Administrator view of one patient: profile, and their sign-in.
    function PatientDetail() {
      if (!selectedPatient) return h("div", { className: "empty-state profile-empty" }, h("strong", null, "Choose a patient"), h(Button, { onClick: () => goTo("patients") }, "Back to patients"));
      const patient = selectedPatient;
      return h(React.Fragment, null,
        h("button", { className: "back-link", onClick: () => goTo("patients") }, h(Icon, { name: "chevron" }), "Back to patients"),
        h(PageHeading, { title: patient.displayName || "Patient", description: "Update this patient's details and manage their sign-in." }),
        h("section", { className: "profile-hero panel" },
          h("div", { className: "profile-avatar" }, h(Icon, { name: "users" })),
          h("div", { className: "profile-identity" },
            h("span", { className: "eyebrow" }, "PATIENT UUID"),
            h("h2", null, patient.id),
            h("span", null, `Created ${formatDate(patient.registeredAt)}`)
          )
        ),
        CredentialsNotice(),
        h("div", { className: "detail-grid" },
          h("section", { className: "panel detail-panel" },
            h("h2", null, "Profile"),
            h("form", {
              className: "registration-form",
              key: `${patient.id}-${patient.displayName}-${patient.householdSize}-${patient.enrollmentStatus}`,
              onSubmit: savePatient,
            },
              h("label", { className: "form-label" }, "First name or nickname",
                h("input", { className: "form-control", name: "display_name", maxLength: 60, defaultValue: patient.displayName, autoComplete: "off" })
              ),
              h("label", { className: "form-label" }, "Household size",
                h("input", { className: "form-control", name: "household_size", type: "number", min: "1", max: "20", step: "1", defaultValue: patient.householdSize, required: true })
              ),
              h("label", { className: "form-label" }, "Enrollment status",
                h("select", { className: "form-control", name: "enrollment_status", defaultValue: patient.enrollmentStatus },
                  h("option", { value: "active" }, "Active"),
                  h("option", { value: "pending" }, "Pending"),
                  h("option", { value: "expired" }, "Expired")
                )
              ),
              h("div", { className: "modal-actions" }, h(Button, { type: "submit", disabled: savingPatient }, savingPatient ? "Saving..." : "Save changes"))
            )
          ),
          h("section", { className: "panel detail-panel" },
            h("h2", null, "Sign-in"),
            patient.login
              ? h(React.Fragment, null,
                h("dl", { className: "facts-list" },
                  h("div", null, h("dt", null, "Username"), h("dd", null, patient.login.username)),
                  h("div", null, h("dt", null, "Password"), h("dd", null, patient.login.mustChange ? "Temporary, not changed yet" : "Chosen by the patient")),
                  h("div", null, h("dt", null, "Last signed in"), h("dd", null, patient.login.lastLogin ? new Date(patient.login.lastLogin).toLocaleString("en-US") : "Never"))
                ),
                h(Button, { variant: "secondary", onClick: resetPassword, disabled: savingLogin }, savingLogin ? "Working..." : "Reset password")
              )
              : h("form", { className: "registration-form", onSubmit: createLogin },
                h("p", { className: "detail-note" }, "This patient cannot sign in yet."),
                h("label", { className: "form-label" }, "Username (optional)",
                  h("input", { className: "form-control", name: "username", maxLength: 32, autoComplete: "off", autoCapitalize: "none", placeholder: "Leave blank to generate one" })
                ),
                h("div", { className: "modal-actions" }, h(Button, { type: "submit", icon: "plus", disabled: savingLogin }, savingLogin ? "Creating..." : "Create sign-in"))
              )
          )
        )
      );
    }

    // Patient view of their own information.
    function MyProfilePage() {
      const me = myPatient;
      const renderOptions = (options, selected, name) => h("div", { className: "checkbox-grid" },
        ...options.map(([value, label]) => h("label", { className: "form-checkbox", key: value },
          h("input", { type: "checkbox", name, value, defaultChecked: selected.includes(value) }),
          h("span", null, label)
        ))
      );
      return h(React.Fragment, null,
        h(PageHeading, { title: me && me.displayName ? `Hi, ${me.displayName}` : "My profile", description: "Your details at Epic Cure." }),
        !me
          ? h("section", { className: "panel empty-state" }, h("strong", null, "We could not find your record"), h("span", null, "Ask a volunteer to check your account."))
          : h(React.Fragment, null,
            h("section", { className: "profile-hero panel" },
              h("div", { className: "profile-avatar" }, h(Icon, { name: "users" })),
              h("div", { className: "profile-identity" },
                h("span", { className: "eyebrow" }, "YOUR PATIENT ID"),
                h("h2", null, me.id),
                h("span", null, `Member since ${formatDate(me.registeredAt)}`)
              )
            ),
            h("section", { className: "info-grid", "aria-label": "Your details" },
              h("div", { className: "info-tile" }, h("span", null, "Household size"), h("strong", null, me.householdSize)),
              h("div", { className: "info-tile" }, h("span", null, "Enrollment"), h(Tag, { tone: statusTones[me.enrollmentStatus] || "neutral" }, h("span", { className: "tag-dot" }), statusLabel(me.enrollmentStatus))),
              h("div", { className: "info-tile" }, h("span", null, "Username"), h("strong", null, account.username))
            ),
            h("section", { className: "panel detail-panel profile-health" },
              h("h2", null, "Health and allergy profile"),
              h("p", { className: "detail-note" }, "Only you can view and update these selections."),
              h("form", { className: "registration-form", onSubmit: saveHealthProfile },
                h("fieldset", { className: "form-fieldset" },
                  h("legend", null, "Health conditions"),
                  h("p", { className: "field-help" }, "For your care team's context; this prototype does not use conditions to make medical diet claims."),
                  renderOptions(healthConditionOptions, me.healthConditions, "health_conditions")
                ),
                h("fieldset", { className: "form-fieldset" },
                  h("legend", null, "Allergens"),
                  h("p", { className: "field-help" }, "Select any of the nine listed allergens. Recommendations are filtered using staff-reviewed product labels; other allergens are not supported. Always check packaging and cross-contact warnings."),
                  renderOptions(allergenOptions, me.allergens, "allergens")
                ),
                h("div", { className: "form-privacy" }, h(Icon, { name: "leaf" }), h("span", null, "Your conditions and allergens are saved to your Epic Cure profile and are not sent to Gemini. Conditions are not used as medical diet rules; recommendations are general food ideas, not medical advice.")),
                h("div", { className: "modal-actions" }, h(Button, { type: "submit", disabled: savingHealthProfile }, savingHealthProfile ? "Saving..." : "Save profile"))
              )
            ),
            h("section", { className: "panel detail-panel password-panel" },
              h("h2", null, "Change password"),
              PasswordForm()
            ),
            h("p", { className: "privacy-footnote" }, h(Icon, { name: "leaf" }), "Ask your care team to review any recipe before changing your diet.")
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
          h("div", { className: "table-toolbar" }, h("div", null, h("h2", null, "Products"), h("p", null, "Edit available quantity and its low-stock threshold.")), h("button", { className: "text-button", onClick: () => loadData() }, "Refresh")),
          h("div", { className: "table-wrap" }, h("table", null,
            h("thead", null, h("tr", null, h("th", null, "PRODUCT"), h("th", null, "CATEGORY"), h("th", null, "QTY AVAILABLE"), h("th", null, "STOCK STATUS"), h("th", null, "NUTRITION / SERVING"))),
            h("tbody", null, inventory.length
              ? inventory.map((item) => h("tr", { key: item.id },
                h("td", null,
                  h("div", { className: "product-cell" }, h("span", { className: `product-emoji product-${item.color}` }, item.icon), h("strong", null, item.name)),
                  h("details", { className: "allergen-editor" },
                    h("summary", null, item.allergenInfoVerified ? "Edit verified allergens" : "Review allergen label"),
                    h("form", { onSubmit: (event) => updateProductAllergens(event, item) },
                      h("div", { className: "checkbox-grid" }, ...allergenOptions.map(([value, label]) =>
                        h("label", { className: "form-checkbox", key: value },
                          h("input", { type: "checkbox", name: "product_allergens", value, defaultChecked: item.allergens.includes(value) }),
                          h("span", null, label)
                        )
                      )),
                      h("label", { className: "form-checkbox form-checkbox-review" },
                        h("input", { type: "checkbox", name: "allergen_info_verified", defaultChecked: item.allergenInfoVerified }),
                        h("span", null, "Package label reviewed")
                      ),
                      h(Button, { type: "submit", variant: "secondary" }, "Save allergen data")
                    )
                  )
                ),
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

    // Read-only list for patients: only what is on the shelves right now.
    function GroceriesPage() {
      return h(React.Fragment, null,
        h(PageHeading, { title: "Groceries", description: "What is on the shelves right now. Availability changes during the day." }),
        h("section", { className: "panel grocery-panel" },
          h("div", { className: "table-toolbar" },
            h("div", null, h("h2", null, "Available now"), h("p", null, `${groceries.length} items`)),
            h("button", { className: "text-button", onClick: () => loadData() }, "Refresh")
          ),
          groceries.length
            ? h("div", { className: "grocery-grid" }, ...groceries.map((item) => h("article", { className: "grocery-card", key: item.id },
              h("span", { className: `product-emoji product-${item.color}` }, item.icon),
              h("div", { className: "grocery-info" },
                h("strong", null, item.name),
                h("span", null, `${item.category} · per ${item.unit}`),
                h("span", { className: "nutrition-cell" }, `${item.calories} cal`, h("i", null), `${item.sodium} mg sodium`)
              ),
              h(Tag, { tone: item.limited ? "orange" : "green" }, h("span", { className: "tag-dot" }), item.limited ? "Limited" : "In stock"),
              h(Button, { variant: "secondary", icon: "plus", onClick: () => addToCart(item.name) }, "Add to cart")
            )))
            : h("div", { className: "empty-state" }, h("strong", null, "Nothing is listed right now"), h("span", null, "Check again soon, or ask a volunteer."))
        )
      );
    }

    function RecipesPage() {
      return h(React.Fragment, null,
        h(PageHeading, {
          eyebrow: "RECIPE IDEAS",
          title: "Recipe recommendations",
          description: "Generate up to five ideas from available inventory. Review every product label before preparing food.",
          actions: role === "patient"
            ? h(Button, { icon: "sparkles", disabled: generatingRecipes, onClick: generateRecipeRecommendations },
              generatingRecipes ? "Generating..." : "Generate AI recommendations")
            : null,
        }),
        h("div", { className: "demo-notice" }, h(Icon, { name: "leaf" }), h("span", null, "Your health conditions and allergen selections are not sent to Gemini. Allergen filtering happens on this server using staff-reviewed product labels; recommendations are not medical advice or live web search.")),
        role !== "patient"
          ? h("section", { className: "panel empty-state" }, h("strong", null, "Patient recommendations"), h("span", null, "Sign in with a patient account to generate recipe ideas."))
          : h(React.Fragment, null,
            recipeError && h("div", { className: "database-warning", role: "alert" }, recipeError),
            recipeNote && h("div", { className: "recipe-note", role: "status" }, recipeNote),
            recipeResults.length
              ? h("section", { className: "recipe-grid", "aria-label": "Recommended recipes" },
                ...recipeResults.map((recipe, index) => h("article", { className: "panel ai-recipe-card", key: `${recipe.title}-${index}` },
                  h("div", { className: `recipe-art recipe-${["mint", "blue", "sand"][index % 3]}` },
                    h("span", { className: "recipe-art-label" }, recipe.source === "gemini" ? "GEMINI IDEA" : "GENERAL IDEA"),
                    h("span", { className: "recipe-art-emoji", "aria-hidden": "true" }, ["🥗", "🍲", "🍚", "🥘", "🥬"][index % 5])
                  ),
                  h("div", { className: "recipe-body" },
                    h("h2", null, recipe.title),
                    h("div", { className: "ingredients-line" },
                      h("strong", null, "Available ingredients"),
                      h("p", null, [...(recipe.uses || []), ...(recipe.missing || [])].map((item) => item.name).join(", "))
                    ),
                    h("ol", { className: "recipe-steps" }, ...(recipe.steps || []).map((step, stepIndex) => h("li", { key: stepIndex }, step))),
                    recipe.why_it_fits && h("p", { className: "recipe-why" }, recipe.why_it_fits),
                    h(Tag, { tone: recipe.source === "gemini" ? "green" : "orange" }, recipe.source === "gemini" ? "Gemini generated" : "Fallback")
                  )
                ))
              )
              : h("section", { className: "panel empty-state" }, h("strong", null, "No recipe ideas yet"), h("span", null, "Generate ideas when products are in stock."))
          )
      );
    }

    function CartPage() {
      const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
      return h(React.Fragment, null,
        h(PageHeading, { eyebrow: "GROCERY PLANNING", title: "Shopping cart", description: "A lightweight demo basket. No checkout or order submission is connected." }),
        h("section", { className: "panel cart-panel" },
          h("div", { className: "table-toolbar" }, h("div", null, h("h2", null, "Your basket"), h("p", null, `${totalItems} items in this demo cart`)), h(Tag, { tone: "green" }, "Demo only")),
          cart.length
            ? h("div", { className: "cart-items" }, ...cart.map((item) => h("div", { className: "cart-item", key: item.name },
              h("span", { className: "cart-item-icon" }, "🛒"), h("strong", null, item.name), h("span", { className: "cart-quantity" }, `Qty ${item.quantity}`),
              h("button", { className: "remove-button", onClick: () => setCart((current) => current.filter((entry) => entry.name !== item.name)), "aria-label": `Remove ${item.name}` }, h(Icon, { name: "close" }))
            )))
            : h("div", { className: "empty-state" }, h("strong", null, "Your basket is empty"), h("span", null, "Explore the grocery list to add items.")),
          h("div", { className: "cart-footer" }, h("span", null, "Items in cart"), h("strong", null, totalItems), h(Button, { onClick: () => notify("Checkout is not connected in this demo.") }, "Continue to checkout"))
        ),
        h("div", { className: "suggested-products" }, h("h2", null, "Thoughtful staples"),
          h("div", { className: "suggested-row" }, ...groceryItems.slice(0, 3).map((item) =>
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
            h("p", null, "Open the project-root .env file and add this line. Replace the placeholder locally with your key:"),
            h("pre", null, "GEMINI_API_KEY=your-key"),
            h("p", null, "Save the file and restart node backend/server.js. The server reads the key; it is never sent to or stored in frontend code."),
            h("p", { className: "settings-key-note" }, "This status only checks whether the server sees a key. Open /api/ai/ping to test the connection.")
          )
        ),
        h("section", { className: "panel settings-card" },
          h("div", { className: "settings-row" }, h("span", { className: "settings-icon" }, h(Icon, { name: "leaf" })), h("div", null, h("strong", null, "Workspace"), h("span", null, "Byte Bots · Epic Cure")), h(Tag, { tone: "green" }, "Demo")),
          h("div", { className: "settings-row" }, h("span", { className: "settings-icon" }, h(Icon, { name: "bell" })), h("div", null, h("strong", null, "Email updates"), h("span", null, "Receive demo activity summaries")), h("button", { className: `toggle ${emailUpdates ? "toggle-on" : ""}`, onClick: () => setEmailUpdates(!emailUpdates), role: "switch", "aria-checked": emailUpdates, "aria-label": "Toggle email updates" }, h("span", null))),
          h("div", { className: "settings-privacy" }, h(Icon, { name: "check" }), h("span", null, "Supabase stores patient records, sign-ins and product/inventory records. Orders and recommendations are not connected yet."))
        )
      );
    }

    const pages = {
      dashboard: Dashboard,
      patients: PatientsPage,
      patientDetail: PatientDetail,
      myprofile: MyProfilePage,
      inventory: InventoryPage,
      groceries: GroceriesPage,
      recipes: RecipesPage,
      cart: CartPage,
      orders: OrdersPage,
      settings: SettingsPage,
    };

    // Still checking the session.
    if (account === undefined) {
      return h("main", { className: "auth-screen" }, h("p", { className: "auth-lead", role: "status" }, "Loading…"));
    }
    if (account === null) return LoginScreen();
    if (account.must_change_password) return ChangePasswordScreen();

    const activePage = allowedPages[role].includes(page) ? page : homePage[role];
    const CurrentPage = pages[activePage];

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
      role === "admin" ? RegistrationModal() : null,
      role === "admin" ? ProductModal() : null,
      toast && h("div", { className: "toast", role: "status" }, h(Icon, { name: "check" }), toast)
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
