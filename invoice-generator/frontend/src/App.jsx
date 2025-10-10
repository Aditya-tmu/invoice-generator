import React from 'react';
import InvoiceForm from './components/InvoiceForm';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="bg-primary text-white text-center py-3 mb-4">
        <h1>Invoice Generator</h1>
      </header>
      <main className="container">
        <InvoiceForm />
      </main>
      <footer className="text-center mt-4 py-3 bg-light">
        <p>&copy; 2025 Your Company. Built with Gemini.</p>
      </footer>
    </div>
  );
}

export default App;
