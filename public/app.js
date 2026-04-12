// Current Session
let currentUser = null;
let currentShop = null; // if Owner
let activeContext = "Products"; // which table we are viewing

document.addEventListener("DOMContentLoaded", () => {
    checkSession();
});

// --- View Router ---
function showView(viewId, subView = null) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    if (viewId === 'auth-view' && subView) {
        toggleAuth(subView);
    }
}

// --- Session Logic ---
async function checkSession() {
    const userStr = localStorage.getItem("shopms_user");
    if (userStr) {
        currentUser = JSON.parse(userStr);
        document.getElementById('user-display-name').textContent = `${currentUser.full_name} (${currentUser.role})`;
        
        if (currentUser.role === 'Owner') {
            // Fetch Shop Details
            try {
                const res = await fetch(`/api/my-shop/${currentUser.id}`);
                const shops = await res.json();
                if (shops.length > 0) currentShop = shops[0];
            } catch (e) {
                console.error("Failed to load shop", e);
            }
        }
        
        setupDashboard();
        showView('dashboard-view');
    } else {
        showView('home-view');
    }
}

function logout() {
    localStorage.removeItem("shopms_user");
    currentUser = null;
    currentShop = null;
    showView('home-view');
    showToast("Logged out successfully", "success");
}

// --- Auth UI Management ---
function toggleAuth(type) {
    if (type === 'login') {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('auth-title').innerText = 'Login';
    } else {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
        document.getElementById('auth-title').innerText = 'Sign Up';
    }
}

function toggleShopOption() {
    const role = document.getElementById('reg_role').value;
    const shopOptionDiv = document.getElementById('shop-option-div');
    if (role === 'Owner') {
        shopOptionDiv.style.display = 'block';
    } else {
        shopOptionDiv.style.display = 'none';
        document.getElementById('reg_open_shop').checked = false;
        toggleShopFields();
    }
}

function toggleShopFields() {
    const isChecked = document.getElementById('reg_open_shop').checked;
    document.getElementById('shop-details-div').style.display = isChecked ? 'grid' : 'none';
}

// --- Auth API Actions ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('login_phone').value;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem("shopms_user", JSON.stringify(data.user));
            checkSession(); // Will route to dashboard
            showToast(`Welcome back, ${data.user.full_name}!`, "success");
        } else {
            showToast(data.error || "Login failed", "error");
        }
    } catch (e) {
        showToast("Network error", "error");
    }
});

document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Gather details
    const payload = {
        full_name: document.getElementById('reg_name').value,
        phone: document.getElementById('reg_phone').value,
        email: document.getElementById('reg_email').value,
        address: document.getElementById('reg_address').value,
        role: document.getElementById('reg_role').value,
        open_shop: document.getElementById('reg_open_shop').checked,
        shop_name: document.getElementById('reg_shop_name').value,
        shop_address: document.getElementById('reg_shop_address').value
    };

    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            showToast("Account created successfully! Please login.", "success");
            toggleAuth('login');
            document.getElementById('login_phone').value = payload.phone;
        } else {
            showToast(data.error || "Signup failed", "error");
        }
    } catch (e) {
        showToast("Network error", "error");
    }
});


// --- Dashboard Management ---

function setupDashboard() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = ''; // clear

    // Context dependent Navigation
    if (currentUser.role === 'Owner') {
        addNavBtn('My Shop Products', 'Owner_Products');
        addNavBtn('Orders Received', 'Owner_Orders');
        activeContext = 'Owner_Products';
    } else {
        addNavBtn('All Products', 'Customer_Products');
        addNavBtn('My Orders', 'Customer_Orders');
        activeContext = 'Customer_Products';
    }
    
    loadDashboardContext();
}

function addNavBtn(label, context) {
    const nav = document.getElementById('sidebar-nav');
    const btn = document.createElement('button');
    btn.className = `nav-btn ${activeContext === context ? 'active' : ''}`;
    btn.innerText = label;
    btn.onclick = () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeContext = context;
        loadDashboardContext();
    };
    nav.appendChild(btn);
}

function loadDashboardContext() {
    const formSection = document.getElementById('dynamic-form-section');
    const title = document.getElementById('page-title');
    title.innerText = activeContext.replace('_', ' ');

    if (activeContext === 'Owner_Products') {
        if (!currentShop) {
            formSection.style.display = 'none';
            document.getElementById('table-body').innerHTML = `<tr><td colspan="100%">You do not have a shop set up.</td></tr>`;
            return;
        }

        // Allow owner to add product
        formSection.style.display = 'block';
        document.getElementById('form-heading').innerText = `Add Product to ${currentShop.name}`;
        renderForm([
            { name: "name", type: "text" },
            { name: "quantity", type: "number" },
            { name: "price", type: "number", step: "0.01" },
            { name: "category", type: "text" }
        ]);
        
        loadTableData('product'); // We'll filter visually or via API later, for now we load all Product
    } else if (activeContext === 'Customer_Products') {
        formSection.style.display = 'none'; // Customers don't add products
        loadTableData('product');
    } else if (activeContext === 'Owner_Orders' || activeContext === 'Customer_Orders') {
        formSection.style.display = 'none';
        loadTableData('order');
    }
}

function renderForm(fields) {
    const formFieldsContainer = document.getElementById('form-fields');
    formFieldsContainer.innerHTML = '';
    
    fields.forEach(f => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label>${f.name}</label>
            <input type="${f.type}" name="${f.name}" id="field_${f.name}" ${f.step ? `step="${f.step}"` : ''} required>
        `;
        formFieldsContainer.appendChild(div);
    });

    const form = document.getElementById('data-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {};
        fields.forEach(f => {
            payload[f.name] = document.getElementById(`field_${f.name}`).value;
        });

        // Add context variables mapping
        if (activeContext === 'Owner_Products' && currentShop) {
            payload.shopid = currentShop.id; // inject shop id
        }

        try {
            // Note: API saves to the appropriate table implicitly based on context
            let table = 'product';
            if (activeContext.includes('Order')) table = 'order';

            const res = await fetch(`/api/${table}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (res.ok) {
                showToast("Added successfully!", "success");
                form.reset();
                loadTableData(table);
            } else {
                showToast(data.error || "Failed adding record", "error");
            }
        } catch(e) {
            showToast("Network Error", "error");
        }
    };
}

async function loadTableData(table) {
    const head = document.getElementById('table-head');
    const body = document.getElementById('table-body');
    body.innerHTML = `<tr><td colspan="100%" class="loading-state">Loading...</td></tr>`;

    try {
        const res = await fetch(`/api/${table}`);
        let data = await res.json();

        // Optional Frontend Filtering based on context
        if (activeContext === 'Owner_Products' && currentShop) {
            data = data.filter(r => r.shopid === currentShop.id); // Filter owner products
        } else if (activeContext === 'Customer_Orders') {
            data = data.filter(r => r.customer_id === currentUser.id);
        } else if (activeContext === 'Owner_Orders' && currentShop) {
            data = data.filter(r => r.shop_id === currentShop.id);
        }

        if (data.length === 0) {
            body.innerHTML = `<tr><td colspan="100%" class="loading-state">No records found.</td></tr>`;
            head.innerHTML = '';
            return;
        }

        const cols = Object.keys(data[0]);
        head.innerHTML = cols.map(c => `<th>${c.replace('_', ' ')}</th>`).join('');
        
        body.innerHTML = data.map(row => {
            return `<tr>${cols.map(c => {
                let v = row[c];
                if (v === null || v === undefined) v = '-';
                if (typeof v === 'string' && v.includes('T') && v.includes('Z')) v = new Date(v).toLocaleString();
                return `<td>${v}</td>`;
            }).join('')}</tr>`;
        }).join('');
    } catch(e) {
        body.innerHTML = `<tr><td colspan="100%" class="loading-state" style="color:var(--danger)">Error fetching data</td></tr>`;
    }
}

// --- Utilities ---
function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = 0;
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
