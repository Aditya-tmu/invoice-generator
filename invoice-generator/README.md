# Invoice Generator Project

This project consists of a React frontend and a Node.js backend to generate invoices in PDF and Excel formats.

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (Node Package Manager, usually comes with Node.js)

### Installation

1.  **Install Backend Dependencies:**
    Navigate to the `backend` directory and install the required packages:
    ```bash
    cd backend
    npm install
    ```

2.  **Install Frontend Dependencies:**
    Navigate to the `frontend` directory and install the required packages:
    ```bash
    cd ../frontend
    npm install
    ```

### Running the Project

You need to start both the backend server and the frontend development server.

1.  **Start the Backend Server:**
    Open a new terminal or command prompt, navigate to the `backend` directory, and run:
    ```bash
    cd backend
    node server.js
    ```
    The backend server will typically run on `http://localhost:5000`. Keep this terminal window open.

2.  **Start the Frontend Development Server:**
    Open another new terminal or command prompt, navigate to the `frontend` directory, and run:
    ```bash
    cd frontend
    npm run dev
    ```
    The frontend application will usually open in your browser at a URL like `http://localhost:5173` (or similar).

Once both servers are running, you can access the Invoice Generator application in your web browser.
