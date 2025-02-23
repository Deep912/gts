Here's your **README.md** file for the **GTS (Gas Cylinder Tracking System)** in a single file format:

```markdown
# GTS (Gas Cylinder Tracking System)

## Overview
GTS is a **web-based gas cylinder tracking system** designed to streamline the management of gas cylinder shipments, refills, and transfers between companies. The system ensures **real-time tracking** using **barcodes**, allowing efficient monitoring and management of cylinder movements.

## Features
- **Barcode-based Tracking** – Scan and manage cylinders efficiently.  
- **Role-based Access** – Admins can:
  - Add new cylinders  
  - Re-print barcodes  
  - Remove (trash) cylinders  
  - Track shipments by workers  
- **Worker Operations** – Workers can:
  - **Send to Other Company**  
  - **Receive Cylinders**  
  - **Send for Refill**  
  - **Receive Filled Cylinders**  
- **Offline Barcode Scanning** – Uses free, open-source libraries (ZXing, QuaggaJS) for local scanning without external APIs.  
- **Secure Authentication** – Username and password-based login for workers and admins.  

## Tech Stack
- **Frontend:** React.js (Web-based UI for Admin & Workers)  
- **Backend:** Node.js with Express  
- **Database:** PostgreSQL (GTS System)  
- **Barcode Scanning:** ZXing, QuaggaJS  

## Installation & Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/gts-system.git
   cd gts-system
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the backend server:
   ```sh
   npm start
   ```
4. Start the frontend:
   ```sh
   cd frontend
   npm install
   npm start
   ```

## Future Enhancements
- **Real-time sync with cloud storage**  
- **Analytics & reporting for cylinder usage**  
- **Mobile-friendly worker UI improvements**  
