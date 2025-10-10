
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const exceljs = require('exceljs');
const fs = require('fs');
const path = require('path');
const { toWords } = require('number-to-words');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- PDF Generation Logic (New Layout) ---
const generatePdf = (invoiceData, logoPath, stream) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    // 1. "TAX INVOICE" on top middle
    doc.font('Helvetica-Bold').fontSize(20).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();

    // 2. Header: Logo left, Business details middle
    const headerY = doc.y;
    if (logoPath && fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, headerY, { width: 100 });
    }

    doc.font('Helvetica-Bold').fontSize(16).text(invoiceData.businessDetails.name, 250, headerY, { align: 'center' });
    doc.font('Helvetica').fontSize(10);
    doc.text(invoiceData.businessDetails.address, 250, doc.y, { align: 'center' });
    const contactInfo = [
        `GSTIN: ${invoiceData.businessDetails.gstin}`,
        `Contact: ${invoiceData.businessDetails.contact}`,
        `Email: ${invoiceData.businessDetails.email}`
    ].filter(Boolean).join(' | ');
    doc.text(contactInfo, 250, doc.y, { align: 'center' });
    
    doc.y = headerY + 100; // Set Y for the next section

    // 3. Sub-Header: Bill To/Ship To left, Invoice details right
    const subHeaderY = doc.y;
    doc.font('Helvetica-Bold').text('Bill To:', 50, subHeaderY);
    doc.font('Helvetica').text(invoiceData.customerDetails.billTo.name, 50, doc.y);
    doc.text(invoiceData.customerDetails.billTo.address, 50, doc.y, { width: 200 });
    doc.text(`GSTIN: ${invoiceData.customerDetails.billTo.gstin}`, 50, doc.y);

    const invoiceDetailsX = 350;
    doc.font('Helvetica-Bold').text(`Invoice #:`, invoiceDetailsX, subHeaderY);
    doc.font('Helvetica').text(invoiceData.invoiceDetails.number, invoiceDetailsX + 70, subHeaderY);

    doc.font('Helvetica-Bold').text(`Invoice Date:`, invoiceDetailsX, subHeaderY + 15);
    doc.font('Helvetica').text(invoiceData.invoiceDetails.date, invoiceDetailsX + 70, subHeaderY + 15);

    doc.moveDown(3);

    // 4. Product Details Table
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    const tableHeaders = ['Item', 'HSN', 'Qty', 'Unit', 'Rate', 'Discount', 'GST', 'Total'];
    const colWidths = [125, 65, 40, 40, 60, 60, 50, 70];
    let x = 50;
    tableHeaders.forEach((header, i) => {
        doc.rect(x, tableTop, colWidths[i], 20).stroke();
        doc.text(header, x + 5, tableTop + 5, { width: colWidths[i] - 10 });
        x += colWidths[i];
    });

    doc.font('Helvetica');
    let tableY = tableTop + 20;
    invoiceData.items.forEach(item => {
        x = 50;
        const itemData = [ item.name, item.hsn, item.quantity, item.unit, `Rs ${parseFloat(item.rate).toFixed(2)}`, `${item.discount || 0}%`, `${item.gst}%`, `Rs ${parseFloat(item.total).toFixed(2)}`];
        const rowHeight = 25;
        itemData.forEach((cell, i) => {
            doc.rect(x, tableY, colWidths[i], rowHeight).stroke();
            doc.text(cell, x + 5, tableY + 5, { width: colWidths[i] - 10 });
            x += colWidths[i];
        });
        tableY += rowHeight;
        if (tableY > 650) { doc.addPage(); tableY = 50; }
    });

    // --- Summary Section (right aligned) & Amount in Words (left aligned) ---
    const summaryY = tableY + 10;
    
    // Summary on the right
    const summaryX = 350;
    doc.font('Helvetica-Bold').text('Subtotal:', summaryX, summaryY);
    doc.font('Helvetica').text(`Rs ${invoiceData.summary.subtotal.toFixed(2)}`, summaryX + 100, summaryY, { align: 'right' });
    doc.font('Helvetica-Bold').text('GST:', summaryX, doc.y);
    doc.font('Helvetica').text(`Rs ${invoiceData.summary.taxAmount.toFixed(2)}`, summaryX + 100, doc.y - 15, { align: 'right' });
    const grandTotalY = doc.y + 5;
    doc.font('Helvetica-Bold').fontSize(12).text('Grand Total:', summaryX, grandTotalY);
    doc.text(`Rs ${invoiceData.summary.grandTotal.toFixed(2)}`, summaryX + 100, grandTotalY, { align: 'right' });

    // Amount in words on the left
    const amountInWords = toWords(invoiceData.summary.grandTotal).replace(/,/g, '').replace(/\b\w/g, l => l.toUpperCase()) + ' Only';
    doc.font('Helvetica-Bold').text('Amount in Words (INR):', 50, summaryY);
    doc.font('Helvetica').text(amountInWords, 50, summaryY + 15, { width: 250 });

    doc.moveDown(3);

    // 6. Footer: Bank/Terms left, Signatory right
    let footerY = doc.y;
    if (footerY > 600) { // Check if footer needs to move to a new page
        doc.addPage();
        footerY = 50;
    }

    doc.font('Helvetica-Bold').text('Bank Details:', 50, footerY);
    doc.font('Helvetica').text(`Bank: ${invoiceData.bankDetails.name}`, 50, footerY + 15);
    doc.text(`A/C No: ${invoiceData.bankDetails.accountNumber}`, 50, footerY + 30);
    doc.text(`IFSC: ${invoiceData.bankDetails.ifsc}`, 50, footerY + 45);

    doc.font('Helvetica-Bold').text('Terms & Conditions:', 50, footerY + 75);
    doc.font('Helvetica').text(invoiceData.terms, 50, footerY + 90, { width: 250 });

    const signatoryY = footerY > doc.y ? footerY : doc.y;
    doc.font('Helvetica-Bold').text('Authorised Signatory', 350, signatoryY, { align: 'right' });

    // Final footer text
    doc.fontSize(8).text('This is a computer generated invoice.', 50, 780, { align: 'center', width: 500 });

    doc.end();
};

// --- Excel Generation Logic (Unchanged) ---
const generateExcel = async (invoiceData, stream) => {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Invoice');
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = invoiceData.businessDetails.name;
    worksheet.getCell('A1').font = { size: 20, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };
    worksheet.getRow(5).values = ['Item Name', 'HSN Code', 'Quantity', 'Unit', 'Rate', 'Discount (%)', 'GST (%)', 'Total'];
    worksheet.getRow(5).font = { bold: true };
    let currentRow = 6;
    invoiceData.items.forEach(item => {
        worksheet.getRow(currentRow).values = [item.name, item.hsn, item.quantity, item.unit, parseFloat(item.rate), parseFloat(item.discount) || 0, parseFloat(item.gst), parseFloat(item.total)];
        currentRow++;
    });
    worksheet.getCell(`G${currentRow + 1}`).value = 'Subtotal';
    worksheet.getCell(`H${currentRow + 1}`).value = invoiceData.summary.subtotal;
    worksheet.getCell(`G${currentRow + 2}`).value = 'Tax Amount';
    worksheet.getCell(`H${currentRow + 2}`).value = invoiceData.summary.taxAmount;
    worksheet.getCell(`G${currentRow + 3}`).value = 'Grand Total';
    worksheet.getCell(`H${currentRow + 3}`).value = invoiceData.summary.grandTotal;
    worksheet.getCell(`G${currentRow + 3}`).font = { bold: true };
    worksheet.getCell(`H${currentRow + 3}`).font = { bold: true };
    await workbook.xlsx.write(stream);
};

// --- API Endpoints ---
app.post('/api/generate', upload.single('logo'), (req, res) => {
    const invoiceData = JSON.parse(req.body.invoiceData);
    const format = req.body.format;
    const logoPath = req.file ? req.file.path : null;

    if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.invoiceDetails.number}.pdf`);
        generatePdf(invoiceData, logoPath, res);
    } else if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoiceData.invoiceDetails.number}.xlsx`);
        generateExcel(invoiceData, res).then(() => res.end());
    } else {
        res.status(400).send('Invalid format requested');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
