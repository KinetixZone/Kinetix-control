import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("kinetix.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE, -- Evita duplicados por teléfono
    email TEXT,
    birth_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    pin TEXT NOT NULL,
    role TEXT NOT NULL -- 'Leslie', 'Jorge', 'Staff'
  );

  -- Insert default users if they don't exist
  INSERT OR IGNORE INTO users (username, pin, role) VALUES ('Leslie', '1234', 'Leslie');
  INSERT OR IGNORE INTO users (username, pin, role) VALUES ('Jorge', '5678', 'Jorge');
  INSERT OR IGNORE INTO users (username, pin, role) VALUES ('Staff', '0000', 'Staff');

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_type TEXT NOT NULL, -- 'monthly', 'visit'
    discount_type TEXT, -- 'birthday', 'other', 'none'
    discount_amount REAL DEFAULT 0,
    received_by TEXT NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATETIME,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL, -- 'rent', 'utilities', 'equipment', 'salary', 'other'
    expense_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members (id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    category TEXT -- 'supplements', 'clothing', 'drinks', 'other'
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_price REAL NOT NULL,
    sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory (id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.get("/api/members", (req, res) => {
    const members = db.prepare(`
      SELECT m.*, 
      (SELECT MAX(expiry_date) FROM payments WHERE member_id = m.id) as last_expiry
      FROM members m
    `).all();
    res.json(members);
  });

  app.post("/api/members", (req, res) => {
    const { name, phone, email, birth_date } = req.body;
    try {
      const result = db.prepare("INSERT INTO members (name, phone, email, birth_date) VALUES (?, ?, ?, ?)").run(name, phone, email, birth_date);
      res.json({ id: result.lastInsertRowid });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "Este número de teléfono ya está registrado a otro miembro." });
      } else {
        res.status(500).json({ error: "Error al registrar miembro." });
      }
    }
  });

  app.put("/api/members/:id", (req, res) => {
    const { id } = req.params;
    const { name, phone, email, birth_date } = req.body;
    try {
      db.prepare("UPDATE members SET name = ?, phone = ?, email = ?, birth_date = ? WHERE id = ?").run(name, phone, email, birth_date, id);
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "Este número de teléfono ya está registrado a otro miembro." });
      } else {
        res.status(500).json({ error: "Error al actualizar miembro." });
      }
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, pin } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND pin = ?").get(username, pin) as any;
    if (user) {
      res.json({ success: true, role: user.role, username: user.username });
    } else {
      res.status(401).json({ success: false, error: "PIN incorrecto" });
    }
  });

  app.get("/api/payments", (req, res) => {
    const payments = db.prepare(`
      SELECT p.*, m.name as member_name 
      FROM payments p 
      JOIN members m ON p.member_id = m.id 
      ORDER BY p.payment_date DESC
    `).all();
    res.json(payments);
  });

  app.get("/api/expenses", (req, res) => {
    const expenses = db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC").all();
    res.json(expenses);
  });

  app.post("/api/expenses", (req, res) => {
    const { description, amount, category, created_by } = req.body;
    const result = db.prepare("INSERT INTO expenses (description, amount, category, created_by) VALUES (?, ?, ?, ?)").run(description, amount, category, created_by);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/expenses/:id", (req, res) => {
    const { id } = req.params;
    const { description, amount, category } = req.body;
    try {
      db.prepare("UPDATE expenses SET description = ?, amount = ?, category = ? WHERE id = ?").run(description, amount, category, id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al actualizar gasto." });
    }
  });

  app.get("/api/inventory", (req, res) => {
    const items = db.prepare("SELECT * FROM inventory").all();
    res.json(items);
  });

  app.post("/api/inventory", (req, res) => {
    const { name, price, stock, category } = req.body;
    const result = db.prepare("INSERT INTO inventory (name, price, stock, category) VALUES (?, ?, ?, ?)").run(name, price, stock, category);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/inventory/:id", (req, res) => {
    const { id } = req.params;
    const { name, price, stock, category } = req.body;
    db.prepare("UPDATE inventory SET name = ?, price = ?, stock = ?, category = ? WHERE id = ?").run(name, price, stock, category, id);
    res.json({ success: true });
  });

  app.post("/api/sales", (req, res) => {
    const { item_id, quantity, total_price } = req.body;
    db.transaction(() => {
      db.prepare("INSERT INTO sales (item_id, quantity, total_price) VALUES (?, ?, ?)").run(item_id, quantity, total_price);
      db.prepare("UPDATE inventory SET stock = stock - ? WHERE id = ?").run(quantity, item_id);
    })();
    res.json({ success: true });
  });

  app.get("/api/stats/financial", (req, res) => {
    const income = db.prepare("SELECT SUM(amount) as total FROM payments").get() as any;
    const salesIncome = db.prepare("SELECT SUM(total_price) as total FROM sales").get() as any;
    const expenses = db.prepare("SELECT SUM(amount) as total FROM expenses").get() as any;
    
    const totalIncome = (income?.total || 0) + (salesIncome?.total || 0);
    res.json({
      total_income: totalIncome,
      total_expenses: expenses?.total || 0,
      profit: totalIncome - (expenses?.total || 0)
    });
  });

  app.get("/api/attendance/today", (req, res) => {
    const attendance = db.prepare(`
      SELECT a.*, m.name 
      FROM attendance a 
      JOIN members m ON a.member_id = m.id 
      WHERE date(a.check_in_time) = date('now')
      ORDER BY a.check_in_time DESC
    `).all();
    res.json(attendance);
  });

  app.post("/api/attendance", (req, res) => {
    const { member_id } = req.body;
    db.prepare("INSERT INTO attendance (member_id) VALUES (?)").run(member_id);
    res.json({ success: true });
  });

  app.get("/api/alerts/birthdays", (req, res) => {
    const birthdays = db.prepare(`
      SELECT * FROM members 
      WHERE strftime('%m-%d', birth_date) = strftime('%m-%d', 'now')
    `).all();
    res.json(birthdays);
  });

  app.get("/api/alerts/payments", (req, res) => {
    const alerts = db.prepare(`
      SELECT m.*, 
      (SELECT MAX(expiry_date) FROM payments WHERE member_id = m.id) as last_expiry
      FROM members m
      WHERE last_expiry IS NOT NULL 
      AND (
        date(last_expiry) <= date('now', '+3 days')
      )
      ORDER BY last_expiry ASC
    `).all();
    res.json(alerts);
  });

  app.post("/api/payments", (req, res) => {
    const { member_id, amount, payment_type, discount_type, discount_amount, received_by, months } = req.body;
    
    let expiry_date = null;
    if (payment_type === 'monthly') {
      const date = new Date();
      date.setMonth(date.getMonth() + (months || 1));
      expiry_date = date.toISOString();
    }

    const result = db.prepare(`
      INSERT INTO payments (member_id, amount, payment_type, discount_type, discount_amount, received_by, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(member_id, amount, payment_type, discount_type, discount_amount, received_by, expiry_date);
    
    res.json({ id: result.lastInsertRowid, expiry_date });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
