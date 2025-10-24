# MedApp - Medicine Inventory Manager

A Progressive Web App (PWA) for managing personal medicine inventory with smart stock alerts.

## Features

✅ **Medicine Management**

- Add, edit, and delete medicines
- Track quantity bought, dosage, and purchase date
- Support for daily and weekly dosages
- Search functionality

✅ **Smart Stock Monitoring**

- Automatic calculation of remaining days
- Visual alerts for low stock (≤7 days)
- Critical alerts for very low stock (≤3 days)
- Console logging for stock alerts

✅ **Progressive Web App**

- Install on mobile devices like a native app
- Offline functionality
- Responsive design for mobile and desktop
- Local SQLite database storage

✅ **User-Friendly Interface**

- Clean, tabular interface
- Mobile-optimized design
- Toast notifications
- Keyboard shortcuts (Ctrl+N for new medicine, F1 for help)

## Installation

### As a Web App

1. Open `index.html` in a web browser
2. Use the app directly in your browser

### As a PWA (Recommended for Mobile)

1. Open the app in a mobile browser (Chrome, Safari, etc.)
2. Look for "Add to Home Screen" option
3. Install the app like a native mobile app
4. Use offline without internet connection

### Local Development

1. Serve the files using a local web server:

   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve .

   # Using PHP
   php -S localhost:8000
   ```

2. Access at `http://localhost:8000`

## Usage

### Adding Medicines

1. Click "Add Medicine" tab
2. Fill in medicine details:
   - **Medicine Name**: Name of the medication
   - **Quantity Bought**: Total pills/tablets purchased
   - **Dosage Frequency**: Daily or Weekly
   - **Dosage Amount**: Pills per dose
   - **Purchase Date**: When you bought it
   - **Notes**: Optional additional information

### Monitoring Stock

- View all medicines in the "Medicines" tab
- Check "Days Left" column for remaining supply
- Yellow highlighting = Low stock (≤7 days)
- Red highlighting = Critical stock (≤3 days)

### Alerts

- Check "Alerts" tab for low stock warnings
- Console logs also show stock alerts
- Visual indicators in the medicines list

### Search

- Use the search box to find specific medicines
- Searches both medicine names and notes

## Technical Details

### Database

- **SQLite** via SQL.js (JavaScript implementation)
- **Local Storage** in browser (no cloud dependency)
- **Automatic backup** to localStorage

### Data Structure

```sql
medicines (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    quantity_bought INTEGER NOT NULL,
    dosage_amount REAL NOT NULL,
    dosage_frequency TEXT NOT NULL, -- 'daily' or 'weekly'
    purchase_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
)
```

### Stock Calculation

- **Daily consumption** = dosage_amount (if daily) or dosage_amount/7 (if weekly)
- **Consumed amount** = days_since_purchase × daily_consumption
- **Remaining amount** = quantity_bought - consumed_amount
- **Remaining days** = remaining_amount ÷ daily_consumption

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Safari**: Full support
- **Firefox**: Full support
- **Mobile browsers**: Optimized for mobile use

## Data Management

### Export Data

- Use browser developer tools: `app.exportData()`
- Downloads JSON file with all medicine data

### Import Data

- Use browser developer tools: `app.importData(event)`
- Requires JSON file in correct format

## Offline Usage

The app works completely offline once loaded:

- All data stored locally
- No internet required after first load
- Service worker caches all resources

## File Structure

```
medApp/
├── index.html          # Main app interface
├── manifest.json       # PWA configuration
├── sw.js              # Service worker
├── css/
│   └── styles.css     # App styling
├── js/
│   ├── app.js         # Main application logic
│   └── database.js    # SQLite database operations
├── icons/             # PWA icons (create these)
└── README.md          # This file
```

## Future Enhancements

Potential features for future versions:

- Prescription refill reminders
- Medicine interaction warnings
- Dosage scheduling
- Photo attachments for medicine boxes
- Export to calendar apps
- Cloud synchronization
- Barcode scanning
- Expiration date tracking

## Troubleshooting

### App won't load

- Check internet connection for first load
- Clear browser cache and reload
- Make sure JavaScript is enabled

### Data not saving

- Check if localStorage is available
- Clear browser data and start fresh
- Try different browser

### PWA installation issues

- Use Chrome or Safari for best PWA support
- Make sure you're using HTTPS (for production)
- Check manifest.json is valid

## Support

This is a personal medicine management tool. For issues:

1. Check browser console for errors
2. Try clearing browser data
3. Use different browser
4. Verify all files are present

## License

This project is for personal use. Feel free to modify and adapt for your needs.
