import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, InputGroup, FormControl } from 'react-bootstrap';
import axios from 'axios';

const InvoiceForm = () => {
    const [logo, setLogo] = useState(null);
    const [invoiceType, setInvoiceType] = useState('Tax Invoice');
    const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now()}`);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));

    const [businessDetails, setBusinessDetails] = useState({
        name: '',
        address: '',
        contact: '',
        gstin: '',
        email: ''
    });

    const [customerDetails, setCustomerDetails] = useState({
        billTo: { name: '', address: '', gstin: '' },
    });

    const [items, setItems] = useState([{
        name: '',
        hsn: '',
        quantity: 1,
        unit: 'pcs',
        rate: 0,
        discount: 0,
        gst: 18,
        total: 0
    }]);

    const [summary, setSummary] = useState({
        subtotal: 0,
        taxAmount: 0,
        grandTotal: 0
    });

    const [bankDetails, setBankDetails] = useState({
        name: '',
        accountNumber: '',
        ifsc: '',
        upi: ''
    });

    const [terms, setTerms] = useState('Thank you for your business!');

    // --- Calculations ---
    useEffect(() => {
        let subtotal = 0;
        let taxAmount = 0;

        const newItems = items.map(item => {
            const itemTotal = item.quantity * item.rate * (1 - item.discount / 100);
            const itemTax = itemTotal * (item.gst / 100);
            subtotal += itemTotal;
            taxAmount += itemTax;
            item.total = itemTotal + itemTax;
            return item;
        });

        setItems(newItems);
        setSummary({
            subtotal: subtotal,
            taxAmount: taxAmount,
            grandTotal: subtotal + taxAmount
        });
    }, [items.map(i => `${i.quantity}-${i.rate}-${i.discount}-${i.gst}`).join(',')]);


    // --- Handlers ---
    const handleBusinessChange = (e) => {
        const { name, value } = e.target;
        setBusinessDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleCustomerChange = (e) => {
        const { name, value } = e.target;
        setCustomerDetails(prev => ({ ...prev, billTo: { ...prev.billTo, [name]: value } }));
    };

    const handleItemChange = (index, e) => {
        const { name, value } = e.target;
        const newItems = [...items];
        newItems[index][name] = value;
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, { name: '', hsn: '', quantity: 1, unit: 'pcs', rate: 0, discount: 0, gst: 18, total: 0 }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };
    
    const handleBankChange = (e) => {
        const { name, value } = e.target;
        setBankDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerate = async (format) => {
        const invoiceData = {
            businessDetails,
            customerDetails,
            invoiceDetails: { 
                type: invoiceType, 
                number: invoiceNumber, 
                date: new Date(invoiceDate).toLocaleDateString() 
            },
            items,
            summary,
            bankDetails,
            terms
        };

        const formData = new FormData();
        if (logo) {
            formData.append('logo', logo);
        }
        formData.append('invoiceData', JSON.stringify(invoiceData));
        formData.append('format', format);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await axios.post(`${apiUrl}/api/generate`, formData, {
                responseType: 'blob', // Important
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const extension = format === 'pdf' ? 'pdf' : 'xlsx';
            link.setAttribute('download', `invoice-${invoiceNumber}.${extension}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);

        } catch (error) {
            console.error(`Error generating ${format}:`, error);
            alert(`Failed to generate ${format}. See console for details.`);
        }
    };


    return (
        <Container>
            {/* --- Business Details --- */}
            <fieldset className="border p-3 mb-4">
                <legend className="w-auto px-2">Your Business</legend>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>Logo</Form.Label>
                            <Form.Control type="file" onChange={(e) => setLogo(e.target.files[0])} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Business Name</Form.Label>
                            <Form.Control type="text" name="name" value={businessDetails.name} onChange={handleBusinessChange} placeholder="e.g. Acme Corp" />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>GSTIN</Form.Label>
                            <Form.Control type="text" name="gstin" value={businessDetails.gstin} onChange={handleBusinessChange} />
                        </Form.Group>
                         <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" name="email" value={businessDetails.email} onChange={handleBusinessChange} />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>Address</Form.Label>
                            <Form.Control as="textarea" rows={3} name="address" value={businessDetails.address} onChange={handleBusinessChange} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Contact</Form.Label>
                            <Form.Control type="text" name="contact" value={businessDetails.contact} onChange={handleBusinessChange} />
                        </Form.Group>
                    </Col>
                </Row>
            </fieldset>

            {/* --- Invoice & Customer Details --- */}
            <Row>
                <Col md={6}>
                    <fieldset className="border p-3 mb-4">
                        <legend className="w-auto px-2">Invoice Details</legend>
                        <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={4}>Invoice Type</Form.Label>
                            <Col sm={8}>
                                <Form.Select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                                    <option>Tax Invoice</option>
                                    <option>Proforma Invoice</option>
                                    <option>Receipt</option>
                                </Form.Select>
                            </Col>
                        </Form.Group>
                        <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={4}>Invoice Number</Form.Label>
                            <Col sm={8}>
                                <Form.Control type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                            </Col>
                        </Form.Group>
                        <Form.Group as={Row} className="mb-3">
                            <Form.Label column sm={4}>Invoice Date</Form.Label>
                            <Col sm={8}>
                                <Form.Control type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                            </Col>
                        </Form.Group>
                    </fieldset>
                </Col>
                <Col md={6}>
                    <fieldset className="border p-3 mb-4">
                        <legend className="w-auto px-2">Customer Details (Bill To)</legend>
                        <Form.Control className="mb-2" type="text" name="name" placeholder="Customer Name" value={customerDetails.billTo.name} onChange={handleCustomerChange} />
                        <Form.Control className="mb-2" as="textarea" rows={2} name="address" placeholder="Customer Address" value={customerDetails.billTo.address} onChange={handleCustomerChange} />
                        <Form.Control type="text" name="gstin" placeholder="Customer GSTIN" value={customerDetails.billTo.gstin} onChange={handleCustomerChange} />
                    </fieldset>
                </Col>
            </Row>

            {/* --- Items Table --- */}
            <fieldset className="border p-3 mb-4">
                <legend className="w-auto px-2">Products / Services</legend>
                <Table striped bordered hover responsive>
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>HSN</th>
                            <th>Qty</th>
                            <th>Unit</th>
                            <th>Rate</th>
                            <th>Discount (%)</th>
                            <th>GST (%)</th>
                            <th>Total</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td style={{ minWidth: '150px' }}><Form.Control type="text" name="name" value={item.name} onChange={(e) => handleItemChange(index, e)} /></td>
                                <td><Form.Control type="text" name="hsn" value={item.hsn} onChange={(e) => handleItemChange(index, e)} /></td>
                                <td><Form.Control type="number" name="quantity" value={item.quantity} onChange={(e) => handleItemChange(index, e)} /></td>
                                <td><Form.Control type="text" name="unit" value={item.unit} onChange={(e) => handleItemChange(index, e)} /></td>
                                <td><Form.Control type="number" name="rate" value={item.rate} onChange={(e) => handleItemChange(index, e)} /></td>
                                <td><Form.Control type="number" name="discount" value={item.discount} onChange={(e) => handleItemChange(index, e)} /></td>
                                <td><Form.Control type="number" name="gst" value={item.gst} onChange={(e) => handleItemChange(index, e)} /></td>
                                <td><FormControl readOnly value={`Rs ${item.total.toFixed(2)}`} /></td>
                                <td><Button variant="danger" size="sm" onClick={() => handleRemoveItem(index)}>X</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
                <Button variant="primary" onClick={handleAddItem}>+ Add Item</Button>
            </fieldset>

            {/* --- Summary --- */}
            <Row className="justify-content-end">
                <Col md={4}>
                    <Table>
                        <tbody>
                            <tr>
                                <td><strong>Subtotal</strong></td>
                                <td className="text-end">Rs {summary.subtotal.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td><strong>Tax Amount (GST)</strong></td>
                                <td className="text-end">Rs {summary.taxAmount.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td><h5>Grand Total</h5></td>
                                <td className="text-end"><h5>Rs {summary.grandTotal.toFixed(2)}</h5></td>
                            </tr>
                        </tbody>
                    </Table>
                </Col>
            </Row>

            {/* --- Bank & Terms --- */}
            <Row>
                <Col md={6}>
                    <fieldset className="border p-3 mb-4">
                        <legend className="w-auto px-2">Bank Details</legend>
                        <Form.Control className="mb-2" type="text" name="name" placeholder="Bank Name" value={bankDetails.name} onChange={handleBankChange} />
                        <Form.Control className="mb-2" type="text" name="accountNumber" placeholder="Account Number" value={bankDetails.accountNumber} onChange={handleBankChange} />
                        <Form.Control className="mb-2" type="text" name="ifsc" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={handleBankChange} />
                        <Form.Control type="text" name="upi" placeholder="UPI ID" value={bankDetails.upi} onChange={handleBankChange} />
                    </fieldset>
                </Col>
                <Col md={6}>
                    <fieldset className="border p-3 mb-4">
                        <legend className="w-auto px-2">Terms & Conditions</legend>
                        <Form.Control as="textarea" rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
                    </fieldset>
                </Col>
            </Row>

            {/* --- Actions --- */}
            <div className="text-center my-4">
                <Button variant="success" className="me-2" onClick={() => handleGenerate('pdf')}>Download PDF</Button>
                <Button variant="info" onClick={() => handleGenerate('excel')}>Download Excel</Button>
            </div>
        </Container>
    );
};

export default InvoiceForm;
