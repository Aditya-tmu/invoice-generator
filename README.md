# Invoice Generator

This project is a comprehensive, full-stack invoicing solution designed to empower freelancers and small businesses by simplifying the entire billing process. Built from the ground up, it addresses the common need for a fast, reliable, and user-friendly tool to create and manage professional invoices. The application's frontend is developed using React and Vite, ensuring a lightning-fast and modern user interface, while the robust backend is powered by Node.js and Express, capable of handling file uploads and dynamic document generation with ease.

## ✨ Key Features

*   **Modern & Responsive UI:** A clean, intuitive, and mobile-friendly user interface built with React and React-Bootstrap.
*   **Real-Time Preview:** See a live preview of your invoice update instantly as you add details.
*   **Professional PDF & Excel Exports:** Generate beautiful, professional invoices in PDF format or export the raw data to an Excel spreadsheet.
*   **Dynamic UPI QR Codes:** Automatically generate a QR code on the PDF that includes the invoice amount. When scanned, it pre-fills the payment details in your customer's UPI app.
*   **Easy Customization:** Add your own business logo and authorized signature to personalize your invoices.
*   **WhatsApp Integration:** Quickly send invoice details and a payment reminder to your customers directly via WhatsApp.

## 🏗️ Tech Stack

*   **Frontend:** React, Vite, React-Bootstrap, Axios
*   **Backend:** Node.js, Express.js
*   **PDF Generation:** `pdfkit`
*   **Excel Generation:** `exceljs`
*   **QR Code Generation:** `qrcode`

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have the following installed on your system:
*   [Node.js](https://nodejs.org/) (which includes npm)
*   [Git](https://git-scm.com/)

### Installation & Setup

1.  **Clone the repository:**
    Open your terminal and clone the repository to your local machine.
    ```bash
    git clone https://github.com/Aditya-tmu/invoice-generator.git
    cd invoice-generator
    ```

2.  **Set up the Backend Server:**
    In your terminal, navigate to the `backend` directory, install the necessary dependencies, and start the server.
    ```bash
    cd backend
    npm install
    node server.js
    ```
    The backend server will start running on `http://localhost:5000`.

3.  **Set up the Frontend Application:**
    Open a **new terminal window** and navigate to the `frontend` directory. Install its dependencies and start the development server.
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    The frontend application will be available at the local URL provided by Vite (usually `http://localhost:5173`).

4.  **Open the Application:**
    Open your web browser and go to `http://localhost:5173` to use the application.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
