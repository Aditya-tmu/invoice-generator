import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, InputGroup, FormControl, Accordion, Card, Spinner } from 'react-bootstrap';
import axios from 'axios';
import InvoicePreview from './InvoicePreview';

const InvoiceForm = () => {
    const [loading, setLoading] = useState(false);
    const [logo, setLogo] = useState(null);
    const [signature, setSignature] = useState(null);
    const [generateQr, setGenerateQr] = useState(true);
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
        billTo: { name: '', address: '', gstin: '', contact: '' },
    });

    const [items, setItems] = useState([{
        name: '',
        hsn: '',
        quantity: 1,
        unit: 'pcs',
        rate: 0,
        discount: 0,
        cgst: 9,
        sgst: 9,
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
        let totalGstAmount = 0;

        items.forEach(item => {
            const taxableValue = (item.quantity || 0) * (item.rate || 0) * (1 - (item.discount || 0) / 100);
            const cgstAmount = taxableValue * (item.cgst || 0) / 100;
            const sgstAmount = taxableValue * (item.sgst || 0) / 100;
            const totalGst = cgstAmount + sgstAmount;

            subtotal += taxableValue;
            totalGstAmount += totalGst;
        });

        setSummary({
            subtotal: subtotal,
            taxAmount: totalGstAmount,
            grandTotal: subtotal + totalGstAmount
        });
    }, [items]);

    const itemsWithAmounts = items.map(item => {
        const taxableValue = (item.quantity || 0) * (item.rate || 0) * (1 - (item.discount || 0) / 100);
        const cgstAmount = taxableValue * (item.cgst || 0) / 100;
        const sgstAmount = taxableValue * (item.sgst || 0) / 100;
        const amount = taxableValue + cgstAmount + sgstAmount;
        return { ...item, amount };
    });

    const invoiceDataForPreview = {
        businessDetails,
        customerDetails,
        invoiceDetails: {
            type: invoiceType,
            number: invoiceNumber,
            date: invoiceDate
        },
        items: itemsWithAmounts,
        summary,
        bankDetails,
        terms,
        generateQr
    };

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
        if (name === 'cgst' || name === 'sgst') {
            newItems[index]['cgst'] = value;
            newItems[index]['sgst'] = value;
        }
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, {
            name: '', hsn: '', quantity: 1, unit: 'pcs', rate: 0, discount: 0,
            cgst: 9, sgst: 9
        }]);
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
        setLoading(true);
        const postData = {
            ...invoiceDataForPreview,
            invoiceDetails: { 
                ...invoiceDataForPreview.invoiceDetails,
                date: new Date(invoiceDataForPreview.invoiceDetails.date).toLocaleDateString() 
            },
        }

        const formData = new FormData();
        if (logo) {
            formData.append('logo', logo);
        }
        if (signature) {
            formData.append('signature', signature);
        }
        formData.append('invoiceData', JSON.stringify(postData));
        formData.append('format', format);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await axios.post(`${apiUrl}/api/generate`, formData, {
                responseType: 'blob',
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
        } finally {
            setLoading(false);
        }
    };

    const handleSendWhatsApp = () => {
        const contactNumber = customerDetails.billTo.contact;
        if (!contactNumber) {
            alert('Please enter a customer mobile number.');
            return;
        }

        let phoneNumber = contactNumber.replace(/\D/g, '');
        if (phoneNumber.startsWith('0')) {
            phoneNumber = phoneNumber.substring(1);
        }
        if (phoneNumber.length === 10) {
            phoneNumber = '91' + phoneNumber;
        }

        if (phoneNumber) {
            const businessName = businessDetails.name || 'your business';
            const customerName = customerDetails.billTo.name || 'there';
            const totalAmount = Math.round(summary.grandTotal).toFixed(2);

            const message = `Hello ${customerName},\n\nThank you for doing business with ${businessName}.\n\nThis is regarding your invoice #${invoiceNumber} for a total amount of Rs ${totalAmount}.\n\nWe appreciate your business!`;

            const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        } else {
            alert('Please enter a valid customer mobile number.');
        }
    };


    return (
        <Container fluid>
            {loading && (
                <div className="loading-overlay">
                    <Spinner animation="border" variant="light" />
                </div>
            )}
            <h1 className="my-4 text-center">Invoice Generator</h1>
            <Row>
                <Col md={7}>
                    <Accordion defaultActiveKey="0" alwaysOpen>
                        <Accordion.Item eventKey="0">
                            <Accordion.Header>Business & Customer Details</Accordion.Header>
                            <Accordion.Body>
                                <Row>
                                    <Col md={6}>
                                        <Card className="mb-4">
                                            <Card.Header>Your Business</Card.Header>
                                            <Card.Body>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Logo</Form.Label>
                                                    <Form.Control type="file" onChange={(e) => setLogo(e.target.files[0])} />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Authorised Signature</Form.Label>
                                                    <Form.Control type="file" onChange={(e) => setSignature(e.target.files[0])} />
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
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Address</Form.Label>
                                                    <Form.Control as="textarea" rows={3} name="address" value={businessDetails.address} onChange={handleBusinessChange} />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Contact</Form.Label>
                                                    <Form.Control type="text" name="contact" value={businessDetails.contact} onChange={handleBusinessChange} />
                                                </Form.Group>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card className="mb-4">
                                            <Card.Header>Customer Details (Bill To)</Card.Header>
                                            <Card.Body>
                                                <Form.Control className="mb-2" type="text" name="name" placeholder="Customer Name" value={customerDetails.billTo.name} onChange={handleCustomerChange} />
                                                <Form.Control className="mb-2" as="textarea" rows={2} name="address" placeholder="Customer Address" value={customerDetails.billTo.address} onChange={handleCustomerChange} />
                                                <Form.Control className="mb-2" type="text" name="gstin" placeholder="Customer GSTIN" value={customerDetails.billTo.gstin} onChange={handleCustomerChange} />
                                                <Form.Control type="text" name="contact" placeholder="Customer Mobile Number" value={customerDetails.billTo.contact} onChange={handleCustomerChange} />
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="1">
                            <Accordion.Header>Invoice Details</Accordion.Header>
                            <Accordion.Body>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group as={Row} className="mb-3">
                                            <Form.Label column sm={4}>Invoice Type</Form.Label>
                                            <Col sm={8}>
                                                <Form.Select value={invoiceType} onChange={(e) => setInvoiceType(e.target.value)}>
                                                    <option>Rough Estimate</option>
                                                    <option>Tax Invoice</option>
                                                    <option>Proforma Invoice</option>
                                                    <option>Receipt</option>
                                                </Form.Select>
                                            </Col>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
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
                                    </Col>
                                </Row>
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="2">
                            <Accordion.Header>Products / Services</Accordion.Header>
                            <Accordion.Body>
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <Table striped bordered hover responsive>
                                        <thead>
                                            <tr>
                                                <th style={{ minWidth: '150px' }}>Item</th>
                                                <th style={{ minWidth: '100px' }}>HSN</th>
                                                <th style={{ minWidth: '70px' }}>Qty</th>
                                                <th style={{ minWidth: '80px' }}>Unit</th>
                                                <th style={{ minWidth: '120px' }}>G.Rate</th>
                                                <th style={{ minWidth: '80px' }}>Disc(%)</th>
                                                <th style={{ minWidth: '90px' }}>CGST(%)</th>
                                                <th style={{ minWidth: '90px' }}>SGST(%)</th>
                                                <th style={{ minWidth: '120px' }}>Amount</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => {
                                                const taxableValue = (item.quantity || 0) * (item.rate || 0) * (1 - (item.discount || 0) / 100);
                                                const cgstAmount = taxableValue * (item.cgst || 0) / 100;
                                                const sgstAmount = taxableValue * (item.sgst || 0) / 100;
                                                const amount = taxableValue + cgstAmount + sgstAmount;
                                                return (
                                                    <tr key={index}>
                                                        <td style={{ minWidth: '140px' }}>
                                                            <Form.Control type="text" name="name" value={item.name} onChange={(e) => handleItemChange(index, e)} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="text" name="hsn" value={item.hsn} onChange={(e) => handleItemChange(index, e)} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="number" name="quantity" value={item.quantity} onChange={(e) => handleItemChange(index, e)} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="text" name="unit" value={item.unit} onChange={(e) => handleItemChange(index, e)} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="number" name="rate" value={item.rate} onChange={(e) => handleItemChange(index, e)} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="number" name="discount" value={item.discount} onChange={(e) => handleItemChange(index, e)} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="number" name="cgst" value={item.cgst} onChange={(e) => handleItemChange(index, e)} />
                                                        </td>
                                                        <td>
                                                            <Form.Control type="number" name="sgst" value={item.sgst} onChange={(e) => handleItemChange(index, e)} />
                                                        </td>
                                                        <td>
                                                            <FormControl readOnly value={amount.toFixed(2)} />
                                                        </td>
                                                        <td>
                                                            <Button variant="danger" size="sm" onClick={() => handleRemoveItem(index)}>X</Button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </Table>
                                </div>
                                <Button variant="primary" className="mt-2" onClick={handleAddItem}>+ Add Item</Button>
                            </Accordion.Body>
                        </Accordion.Item>
                        <Accordion.Item eventKey="3">
                            <Accordion.Header>Payment & Terms</Accordion.Header>
                            <Accordion.Body>
                                <Row>
                                    <Col md={6}>
                                        <Card className="mb-4">
                                            <Card.Header>Bank Details</Card.Header>
                                            <Card.Body>
                                                <Form.Control className="mb-2" type="text" name="name" placeholder="Bank Name" value={bankDetails.name} onChange={handleBankChange} />
                                                <Form.Control className="mb-2" type="text" name="accountNumber" placeholder="Account Number" value={bankDetails.accountNumber} onChange={handleBankChange} />
                                                <Form.Control className="mb-2" type="text" name="ifsc" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={handleBankChange} />
                                                <Form.Control type="text" name="upi" placeholder="UPI ID" value={bankDetails.upi} onChange={handleBankChange} />
                                                <Form.Check 
                                                    type="checkbox"
                                                    id="generate-qr-checkbox"
                                                    label="Generate QR for UPI"
                                                    checked={generateQr}
                                                    onChange={(e) => setGenerateQr(e.target.checked)}
                                                    className="mt-2"
                                                />
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={6}>
                                        <Card className="mb-4">
                                            <Card.Header>Terms & Conditions</Card.Header>
                                            <Card.Body>
                                                <Form.Control as="textarea" rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>

                    {/* --- Actions --- */}
                    <div className="text-center my-4">
                        <Button variant="success" className="me-2" onClick={() => handleGenerate('pdf')} disabled={loading}>Download PDF</Button>
                        <Button variant="info" className="me-2" onClick={() => handleGenerate('excel')} disabled={loading}>Download Excel</Button>
                        <Button variant="primary" onClick={handleSendWhatsApp} disabled={loading}>Send via WhatsApp</Button>
                    </div>
                </Col>
                <Col md={5}>
                    <div style={{ position: 'sticky', top: '2rem' }}>
                        <InvoicePreview invoiceData={invoiceDataForPreview} />
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default InvoiceForm;