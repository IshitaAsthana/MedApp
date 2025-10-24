// Database Manager for MedApp
class DatabaseManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Initialize SQL.js
      const sqlPromise = initSqlJs({
        locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
      });
      const SQL = await sqlPromise;

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem("medapp_database");
      if (savedDb) {
        const uint8Array = new Uint8Array(JSON.parse(savedDb));
        this.db = new SQL.Database(uint8Array);
        console.log("Loaded existing database from localStorage");
      } else {
        // Create new database
        this.db = new SQL.Database();
        console.log("Created new database");
      }

      // Create tables
      this.createTables();
      this.isInitialized = true;
      console.log("Database initialized successfully");

      return true;
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  createTables() {
    // Create medicines table
    const createMedicinesTable = `
            CREATE TABLE IF NOT EXISTS medicines (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                quantity_bought INTEGER NOT NULL,
                dosage_amount REAL NOT NULL,
                dosage_frequency TEXT NOT NULL CHECK (dosage_frequency IN ('daily', 'weekly')),
                purchase_date TEXT NOT NULL,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `;

    // Create consumption log table (for future enhancements)
    const createConsumptionTable = `
            CREATE TABLE IF NOT EXISTS consumption_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                medicine_id INTEGER NOT NULL,
                amount_consumed REAL NOT NULL,
                consumption_date TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (medicine_id) REFERENCES medicines (id) ON DELETE CASCADE
            );
        `;

    try {
      this.db.run(createMedicinesTable);
      this.db.run(createConsumptionTable);
      this.saveDatabase();
      console.log("Tables created successfully");
    } catch (error) {
      console.error("Error creating tables:", error);
      throw error;
    }
  }

  saveDatabase() {
    try {
      const data = this.db.export();
      const buffer = JSON.stringify(Array.from(data));
      localStorage.setItem("medapp_database", buffer);
    } catch (error) {
      console.error("Error saving database:", error);
    }
  }

  // Medicine CRUD operations
  async addMedicine(medicineData) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    const { name, quantityBought, dosageAmount, dosageFrequency, purchaseDate, notes } =
      medicineData;

    const query = `
            INSERT INTO medicines (name, quantity_bought, dosage_amount, dosage_frequency, purchase_date, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

    try {
      this.db.run(query, [
        name,
        quantityBought,
        dosageAmount,
        dosageFrequency,
        purchaseDate,
        notes || "",
      ]);
      this.saveDatabase();

      // Get the inserted medicine
      const result = this.db.exec("SELECT last_insert_rowid() as id")[0];
      const newId = result.values[0][0];

      console.log(`Added medicine: ${name} with ID: ${newId}`);
      return newId;
    } catch (error) {
      console.error("Error adding medicine:", error);
      throw error;
    }
  }

  getAllMedicines() {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    try {
      const query = `
                SELECT id, name, quantity_bought, dosage_amount, dosage_frequency, 
                       purchase_date, notes, created_at, updated_at
                FROM medicines 
                ORDER BY name ASC
            `;

      const result = this.db.exec(query);

      if (result.length === 0) {
        return [];
      }

      const columns = result[0].columns;
      const values = result[0].values;

      return values.map((row) => {
        const medicine = {};
        columns.forEach((col, index) => {
          medicine[col] = row[index];
        });
        return medicine;
      });
    } catch (error) {
      console.error("Error getting medicines:", error);
      throw error;
    }
  }

  getMedicineById(id) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    try {
      console.log("Getting medicine by ID:", id);
      const query = `
                SELECT id, name, quantity_bought, dosage_amount, dosage_frequency, 
                       purchase_date, notes, created_at, updated_at
                FROM medicines 
                WHERE id = ?
            `;

      const result = this.db.exec(query, [id]);
      console.log("Database query result:", result);

      if (result.length === 0) {
        console.log("No medicine found with ID:", id);
        return null;
      }

      const columns = result[0].columns;
      const values = result[0].values[0];

      const medicine = {};
      columns.forEach((col, index) => {
        medicine[col] = values[index];
      });

      console.log("Retrieved medicine object:", medicine);
      return medicine;
    } catch (error) {
      console.error("Error getting medicine by ID:", error);
      throw error;
    }
  }

  updateMedicine(id, medicineData) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    const { name, quantityBought, dosageAmount, dosageFrequency, purchaseDate, notes } =
      medicineData;

    const query = `
            UPDATE medicines 
            SET name = ?, quantity_bought = ?, dosage_amount = ?, dosage_frequency = ?, 
                purchase_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

    try {
      this.db.run(query, [
        name,
        quantityBought,
        dosageAmount,
        dosageFrequency,
        purchaseDate,
        notes || "",
        id,
      ]);
      this.saveDatabase();
      console.log(`Updated medicine with ID: ${id}`);
      return true;
    } catch (error) {
      console.error("Error updating medicine:", error);
      throw error;
    }
  }

  deleteMedicine(id) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    try {
      const query = "DELETE FROM medicines WHERE id = ?";
      this.db.run(query, [id]);
      this.saveDatabase();
      console.log(`Deleted medicine with ID: ${id}`);
      return true;
    } catch (error) {
      console.error("Error deleting medicine:", error);
      throw error;
    }
  }

  searchMedicines(searchTerm) {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    try {
      const query = `
                SELECT id, name, quantity_bought, dosage_amount, dosage_frequency, 
                       purchase_date, notes, created_at, updated_at
                FROM medicines 
                WHERE name LIKE ? OR notes LIKE ?
                ORDER BY name ASC
            `;

      const searchPattern = `%${searchTerm}%`;
      const result = this.db.exec(query, [searchPattern, searchPattern]);

      if (result.length === 0) {
        return [];
      }

      const columns = result[0].columns;
      const values = result[0].values;

      return values.map((row) => {
        const medicine = {};
        columns.forEach((col, index) => {
          medicine[col] = row[index];
        });
        return medicine;
      });
    } catch (error) {
      console.error("Error searching medicines:", error);
      throw error;
    }
  }

  // Calculate remaining days for a medicine
  calculateRemainingDays(medicine) {
    const purchaseDate = new Date(medicine.purchase_date);
    const today = new Date();

    // Calculate days since purchase
    const daysSincePurchase = Math.floor((today - purchaseDate) / (1000 * 60 * 60 * 24));

    // Calculate daily consumption rate
    let dailyConsumption;
    if (medicine.dosage_frequency === "daily") {
      dailyConsumption = medicine.dosage_amount;
    } else if (medicine.dosage_frequency === "weekly") {
      dailyConsumption = medicine.dosage_amount / 7;
    }

    // Calculate consumed amount
    const consumedAmount = daysSincePurchase * dailyConsumption;
    const remainingAmount = medicine.quantity_bought - consumedAmount;

    // Calculate remaining days
    const remainingDays = Math.floor(remainingAmount / dailyConsumption);

    return {
      remainingAmount: Math.max(0, remainingAmount),
      remainingDays: Math.max(0, remainingDays),
      dailyConsumption: dailyConsumption,
      consumedAmount: Math.max(0, consumedAmount),
    };
  }

  // Get medicines with low stock (less than 7 days remaining)
  getLowStockMedicines() {
    const medicines = this.getAllMedicines();
    const lowStockMedicines = [];

    medicines.forEach((medicine) => {
      const stockInfo = this.calculateRemainingDays(medicine);
      if (stockInfo.remainingDays <= 7) {
        lowStockMedicines.push({
          ...medicine,
          ...stockInfo,
        });
      }
    });

    return lowStockMedicines;
  }

  // Export data as JSON
  exportData() {
    try {
      const medicines = this.getAllMedicines();
      const exportData = {
        export_date: new Date().toISOString(),
        medicines: medicines,
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("Error exporting data:", error);
      throw error;
    }
  }

  // Import data from JSON
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      if (!data.medicines || !Array.isArray(data.medicines)) {
        throw new Error("Invalid import data format");
      }

      // Clear existing data
      this.db.run("DELETE FROM medicines");

      // Import medicines
      data.medicines.forEach((medicine) => {
        this.addMedicine({
          name: medicine.name,
          quantityBought: medicine.quantity_bought,
          dosageAmount: medicine.dosage_amount,
          dosageFrequency: medicine.dosage_frequency,
          purchaseDate: medicine.purchase_date,
          notes: medicine.notes || "",
        });
      });

      console.log(`Imported ${data.medicines.length} medicines`);
      return true;
    } catch (error) {
      console.error("Error importing data:", error);
      throw error;
    }
  }
}

// Create global database instance
const dbManager = new DatabaseManager();
