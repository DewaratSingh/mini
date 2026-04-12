const express = require("express");
const mysql = require("mysql2");

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Create connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "sea145"
});

const util = require('util');
// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.log("DB Error:", err);
    } else {
        console.log("MySQL Connected ✅");
    }
});

const queryDb = util.promisify(db.query).bind(db);

// AUTH ENDPOINTS

// Login via Phone
app.post("/api/login", async (req, res) => {
    const { phone } = req.body;
    try {
        const users = await queryDb("SELECT * FROM \`People\` WHERE phone = ?", [phone]);
        if (users.length === 0) return res.status(404).json({ error: "User not found" });
        res.json({ success: true, user: users[0] });
    } catch (err) {
        res.status(500).json({ error: "DB Error", details: err.sqlMessage });
    }
});

// Signup Flow (With Optional Shop)
app.post("/api/signup", async (req, res) => {
    const { full_name, phone, role, address, email, open_shop, shop_name, shop_address } = req.body;
    try {
        // Insert Person
        const personResult = await queryDb(
            "INSERT INTO \`People\` (full_name, phone, role, address, email) VALUES (?, ?, ?, ?, ?)",
            [full_name, phone, role, address, email]
        );
        const personId = personResult.insertId;

        // Optionally Insert Shop
        if (open_shop && role === 'Owner' && shop_name) {
            await queryDb(
                "INSERT INTO \`Shop\` (name, address, owner_id) VALUES (?, ?, ?)",
                [shop_name, shop_address || address, personId]
            );
        }

        res.json({ success: true, insertId: personId });
    } catch (err) {
        res.status(500).json({ error: "DB Error", details: err.sqlMessage });
    }
});

app.get("/api/my-shop/:ownerId", async (req, res) => {
    try {
        const shops = await queryDb("SELECT * FROM \`Shop\` WHERE owner_id = ?", [req.params.ownerId]);
        res.json(shops);
    } catch (err) {
        res.status(500).json({ error: "DB Error", details: err.sqlMessage });
    }
});

// Generic API route to fetch data from any table
app.get("/api/:table", (req, res) => {
    const table = req.params.table;
    const allowedTables = ["people", "shop", "product", "payment", "order", "order_item"];
    
    if (!allowedTables.includes(table.toLowerCase())) {
        return res.status(400).json({ error: "Invalid table" });
    }

    const query = `SELECT * FROM \`${table}\``;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching data:", err);
            return res.status(500).json({ error: "Failed to fetch data" });
        }
        res.json(results);
    });
});

// Generic API route to insert data into any table
app.post("/api/:table", (req, res) => {
    const table = req.params.table;
    const allowedTables = ["people", "shop", "product", "payment", "order", "order_item"];
    
    if (!allowedTables.includes(table.toLowerCase())) {
        return res.status(400).json({ error: "Invalid table" });
    }

    const data = req.body;
    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: "No data provided" });
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => "?").join(", ");
    
    const query = `INSERT INTO \`${table}\` (${keys.join(", ")}) VALUES (${placeholders})`;

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("Error inserting data:", err);
            return res.status(500).json({ error: "Failed to insert data", details: err.sqlMessage });
        }
        res.json({ success: true, insertId: result.insertId });
    });
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});