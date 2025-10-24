// Main Application Logic for MedApp
class MedApp {
  constructor() {
    this.currentEditId = null;
    this.medicines = [];
    this.init();
  }

  async init() {
    try {
      this.showLoading(true);

      // Initialize database
      await dbManager.initialize();

      // Setup event listeners
      this.setupEventListeners();

      // Load medicines
      await this.loadMedicines();

      // Set today's date as default
      document.getElementById("purchase-date").value = new Date().toISOString().split("T")[0];

      // Check for low stock and show alerts
      this.checkLowStock();

      this.showLoading(false);
      this.showToast("App loaded successfully!", "success");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      this.showToast("Failed to initialize app. Please refresh the page.", "error");
      this.showLoading(false);
    }
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Medicine form submission
    document.getElementById("medicine-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Cancel button
    document.getElementById("cancel-btn").addEventListener("click", () => {
      this.resetForm();
    });

    // Search functionality
    document.getElementById("search-input").addEventListener("input", (e) => {
      this.searchMedicines(e.target.value);
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        this.switchTab("add");
      }
    });
  }

  switchTab(tabName, skipReset = false) {
    // Update tab buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    // Update tab content
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("active");
    });
    document.getElementById(`${tabName}-tab`).classList.add("active");

    // Reset form when switching to add tab (unless we're editing)
    if (tabName === "add" && !skipReset) {
      this.resetForm();
    }

    // Refresh alerts when switching to alerts tab
    if (tabName === "alerts") {
      this.loadAlerts();
    }
  }

  async loadMedicines() {
    try {
      this.medicines = dbManager.getAllMedicines();
      this.renderMedicinesTable();
    } catch (error) {
      console.error("Error loading medicines:", error);
      this.showToast("Error loading medicines", "error");
    }
  }

  renderMedicinesTable() {
    const tbody = document.getElementById("medicines-tbody");
    const noMedicinesDiv = document.getElementById("no-medicines");

    if (this.medicines.length === 0) {
      tbody.innerHTML = "";
      noMedicinesDiv.style.display = "block";
      return;
    }

    noMedicinesDiv.style.display = "none";

    tbody.innerHTML = this.medicines
      .map((medicine) => {
        const stockInfo = dbManager.calculateRemainingDays(medicine);
        const stockClass = this.getStockAlertClass(stockInfo.remainingDays);
        const nameClass = stockClass ? `medicine-name ${stockClass}` : "medicine-name";

        return `
                <tr class="${stockClass}">
                    <td class="${nameClass}">${this.escapeHtml(medicine.name)}</td>
                    <td>${medicine.quantity_bought}</td>
                    <td>${medicine.dosage_amount} ${medicine.dosage_frequency}</td>
                    <td>
                        ${stockInfo.remainingDays} days
                        <small style="display: block; color: #666;">
                            (${stockInfo.remainingAmount.toFixed(1)} left)
                        </small>
                    </td>
                    <td>
                        <button class="btn btn-edit" onclick="app.editMedicine(${medicine.id})">
                            Edit
                        </button>
                        <button class="btn btn-danger" onclick="app.deleteMedicine(${medicine.id})">
                            Delete
                        </button>
                    </td>
                </tr>
            `;
      })
      .join("");
  }

  getStockAlertClass(remainingDays) {
    if (remainingDays <= 3) return "critical-stock";
    if (remainingDays <= 7) return "low-stock";
    return "";
  }

  async handleFormSubmit() {
    try {
      console.log("Form submitted, currentEditId:", this.currentEditId);
      const formData = this.getFormData();
      console.log("Form data:", formData);

      if (!this.validateFormData(formData)) {
        return;
      }

      if (this.currentEditId) {
        // Update existing medicine
        console.log("Updating medicine with ID:", this.currentEditId);
        await dbManager.updateMedicine(this.currentEditId, formData);
        this.showToast("Medicine updated successfully!", "success");
      } else {
        // Add new medicine
        console.log("Adding new medicine");
        await dbManager.addMedicine(formData);
        this.showToast("Medicine added successfully!", "success");
      }

      // Refresh the medicines list
      await this.loadMedicines();

      // Reset form and switch to medicines tab
      this.resetForm();
      this.switchTab("medicines");

      // Check for alerts
      this.checkLowStock();
    } catch (error) {
      console.error("Error saving medicine:", error);
      this.showToast("Error saving medicine. Please try again.", "error");
    }
  }

  getFormData() {
    return {
      name: document.getElementById("medicine-name").value.trim(),
      quantityBought: parseInt(document.getElementById("quantity-bought").value),
      dosageAmount: parseFloat(document.getElementById("dosage-amount").value),
      dosageFrequency: document.getElementById("dosage-frequency").value,
      purchaseDate: document.getElementById("purchase-date").value,
      notes: document.getElementById("notes").value.trim(),
    };
  }

  validateFormData(data) {
    if (!data.name) {
      this.showToast("Please enter medicine name", "error");
      return false;
    }
    if (!data.quantityBought || data.quantityBought < 1) {
      this.showToast("Please enter valid quantity bought", "error");
      return false;
    }
    if (!data.dosageAmount || data.dosageAmount < 0.5) {
      this.showToast("Please enter valid dosage amount", "error");
      return false;
    }
    if (!data.dosageFrequency) {
      this.showToast("Please select dosage frequency", "error");
      return false;
    }
    if (!data.purchaseDate) {
      this.showToast("Please select purchase date", "error");
      return false;
    }

    // Check if purchase date is not in future
    const purchaseDate = new Date(data.purchaseDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    if (purchaseDate > today) {
      this.showToast("Purchase date cannot be in the future", "error");
      return false;
    }

    return true;
  }

  async editMedicine(id) {
    try {
      console.log("Editing medicine with ID:", id);

      // Ensure database is initialized
      if (!dbManager.isInitialized) {
        this.showToast("Database not ready. Please wait and try again.", "error");
        return;
      }

      const medicine = dbManager.getMedicineById(id);
      console.log("Retrieved medicine:", medicine);

      if (!medicine) {
        this.showToast("Medicine not found", "error");
        console.error("Medicine with ID", id, "not found in database");
        return;
      }

      // Switch to add tab first to ensure elements are visible (but don't reset form)
      this.switchTab("add", true);

      // Use requestAnimationFrame to ensure DOM is ready after tab switch
      requestAnimationFrame(() => {
        try {
          // Verify elements exist before populating
          const nameEl = document.getElementById("medicine-name");
          const quantityEl = document.getElementById("quantity-bought");
          const dosageAmountEl = document.getElementById("dosage-amount");
          const dosageFreqEl = document.getElementById("dosage-frequency");
          const purchaseDateEl = document.getElementById("purchase-date");
          const notesEl = document.getElementById("notes");

          if (
            !nameEl ||
            !quantityEl ||
            !dosageAmountEl ||
            !dosageFreqEl ||
            !purchaseDateEl ||
            !notesEl
          ) {
            console.error("Some form elements not found");
            this.showToast("Form elements not ready. Please try again.", "error");
            return;
          }

          // Fill form with medicine data
          nameEl.value = medicine.name || "";
          quantityEl.value = medicine.quantity_bought || "";
          dosageAmountEl.value = medicine.dosage_amount || "";
          dosageFreqEl.value = medicine.dosage_frequency || "";
          purchaseDateEl.value = medicine.purchase_date || "";
          notesEl.value = medicine.notes || "";

          // Update form UI
          this.currentEditId = id;
          document.getElementById("form-title").textContent = "Edit Medicine";
          document.getElementById("submit-text").textContent = "Update Medicine";
          document.getElementById("cancel-btn").style.display = "inline-block";
          document.getElementById("edit-id").value = id;

          console.log("Form populated for editing:");
          console.log("- Name:", nameEl.value);
          console.log("- Quantity:", quantityEl.value);
          console.log("- Dosage Amount:", dosageAmountEl.value);
          console.log("- Dosage Frequency:", dosageFreqEl.value);
          console.log("- Purchase Date:", purchaseDateEl.value);
          console.log("- CurrentEditId:", this.currentEditId);

          this.showToast("Medicine loaded for editing", "success");
        } catch (error) {
          console.error("Error populating form:", error);
          this.showToast("Error populating form", "error");
        }
      });
    } catch (error) {
      console.error("Error editing medicine:", error);
      this.showToast("Error loading medicine for editing", "error");
    }
  }

  async deleteMedicine(id) {
    const medicine = dbManager.getMedicineById(id);
    if (!medicine) {
      this.showToast("Medicine not found", "error");
      return;
    }

    if (confirm(`Are you sure you want to delete "${medicine.name}"?`)) {
      try {
        await dbManager.deleteMedicine(id);
        await this.loadMedicines();
        this.showToast("Medicine deleted successfully", "success");
        this.checkLowStock();
      } catch (error) {
        console.error("Error deleting medicine:", error);
        this.showToast("Error deleting medicine", "error");
      }
    }
  }

  resetForm() {
    console.log("Resetting form, clearing edit state");
    document.getElementById("medicine-form").reset();
    document.getElementById("purchase-date").value = new Date().toISOString().split("T")[0];
    this.currentEditId = null;
    document.getElementById("form-title").textContent = "Add New Medicine";
    document.getElementById("submit-text").textContent = "Add Medicine";
    document.getElementById("cancel-btn").style.display = "none";
    document.getElementById("edit-id").value = "";
    console.log("Form reset complete, currentEditId:", this.currentEditId);
  }

  searchMedicines(searchTerm) {
    if (!searchTerm.trim()) {
      this.medicines = dbManager.getAllMedicines();
    } else {
      this.medicines = dbManager.searchMedicines(searchTerm.trim());
    }
    this.renderMedicinesTable();
  }

  checkLowStock() {
    try {
      const lowStockMedicines = dbManager.getLowStockMedicines();

      if (lowStockMedicines.length > 0) {
        console.log("Low stock alert:", lowStockMedicines);

        lowStockMedicines.forEach((medicine) => {
          const daysLeft = medicine.remainingDays;
          const alertType = daysLeft <= 3 ? "CRITICAL" : "WARNING";

          console.log(
            `${alertType}: ${
              medicine.name
            } has only ${daysLeft} days left (${medicine.remainingAmount.toFixed(1)} units)`
          );
        });

        // Update alerts tab badge (if we had one)
        this.updateAlertsTab(lowStockMedicines.length);
      }
    } catch (error) {
      console.error("Error checking low stock:", error);
    }
  }

  updateAlertsTab(alertCount) {
    const alertsTab = document.querySelector('[data-tab="alerts"]');
    if (alertCount > 0) {
      alertsTab.innerHTML = `⚠️ Alerts (${alertCount})`;
      alertsTab.style.color = "#dc3545";
    } else {
      alertsTab.innerHTML = "⚠️ Alerts";
      alertsTab.style.color = "";
    }
  }

  loadAlerts() {
    try {
      const lowStockMedicines = dbManager.getLowStockMedicines();
      const alertsContainer = document.getElementById("alerts-container");

      if (lowStockMedicines.length === 0) {
        alertsContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>No alerts</h3>
                        <p>All medicines have sufficient stock!</p>
                    </div>
                `;
        return;
      }

      alertsContainer.innerHTML = lowStockMedicines
        .map((medicine) => {
          const isCritical = medicine.remainingDays <= 3;
          const alertClass = isCritical ? "alert-item critical" : "alert-item";

          return `
                    <div class="${alertClass}">
                        <h4>${this.escapeHtml(medicine.name)}</h4>
                        <p><strong>${
                          medicine.remainingDays
                        } days left</strong> (${medicine.remainingAmount.toFixed(
            1
          )} units remaining)</p>
                        <p>Daily consumption: ${medicine.dailyConsumption.toFixed(1)} units</p>
                        <p>Purchased: ${new Date(medicine.purchase_date).toLocaleDateString()}</p>
                        ${
                          isCritical
                            ? "<p><strong>⚠️ Critical: Reorder immediately!</strong></p>"
                            : "<p>⚠️ Low stock: Consider reordering soon</p>"
                        }
                    </div>
                `;
        })
        .join("");
    } catch (error) {
      console.error("Error loading alerts:", error);
      document.getElementById("alerts-container").innerHTML = `
                <div class="alert-item critical">
                    <h4>Error</h4>
                    <p>Failed to load alerts. Please try again.</p>
                </div>
            `;
    }
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.getElementById("toast-container").appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  showLoading(show) {
    document.getElementById("loading").style.display = show ? "flex" : "none";
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Export functionality
  exportData() {
    try {
      const data = dbManager.exportData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medapp-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast("Data exported successfully!", "success");
    } catch (error) {
      console.error("Error exporting data:", error);
      this.showToast("Error exporting data", "error");
    }
  }

  // Import functionality
  importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        dbManager.importData(e.target.result);
        this.loadMedicines();
        this.showToast("Data imported successfully!", "success");
      } catch (error) {
        console.error("Error importing data:", error);
        this.showToast("Error importing data. Please check the file format.", "error");
      }
    };
    reader.readAsText(file);
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new MedApp();
});

// Add some keyboard shortcuts info
document.addEventListener("keydown", (e) => {
  if (e.key === "F1") {
    e.preventDefault();
    alert(`MedApp Keyboard Shortcuts:
        
Ctrl + N: Add new medicine
F1: Show this help
        
Features:
• Track medicine inventory
• Calculate remaining days
• Get low stock alerts
• Mobile-friendly PWA
• Offline functionality`);
  }
});
