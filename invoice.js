// url = import.meta.env.APPS_SCRIPT_URL;
// console.log(url);

const form = document.getElementById('invoice-form');
const invoiceIdDisplay = document.getElementById('current-invoice-id');
const invoiceIdInput = document.getElementById('invoiceIdInput');
const totalPriceInput = document.getElementById('totalPriceInput');
const totalAmountDisplay = document.getElementById('total-amount');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');

//  GOOGLE SHEET APP SCRIPT
const formUrlElement = "https://script.google.com/macros/s/AKfycbzRmugMoxT5WXCzNO1eNaYMCgYwFTfjaEQ8U9IN_-vSWn2E1i-xbFFB2294vagY4hGRPQ/exec";

const searchInput = document.getElementById('invoice-search-input');
const searchResultsDiv = document.getElementById('search-results');
const resultContent = document.getElementById('result-content');

// Initialize Lucide icons
lucide.createIcons();

// Helper function for URL validation
function getFormUrl() {
    const url = formUrlElement;
    if (url === "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE" || !url.startsWith('https://script.google.com/')) {
        showMessage('error', 'Error: Please set up the Google Apps Script URL as described in the instructions!', 6000);
        return null;
    }
    return url;
}

// 1. INVOICE ID GENERATION
function generateInvoiceId() {
    // Simple timestamp-based ID
    const newId = `INV-${new Date().getTime()}`;
    invoiceIdDisplay.textContent = newId;
    invoiceIdInput.value = newId;
}

// 2. TOTAL CALCULATION (Manual Price Input)
function calculateTotal() {
    const price = parseFloat(totalPriceInput.value) || 0;
    totalAmountDisplay.textContent = `$${price.toFixed(2)}`;
}

// 3. PRINT VIEW UPDATE
function updatePrintView() {
    document.getElementById('print-customer-name').textContent = document.getElementById('customerName').value;
    document.getElementById('print-customer-address').textContent = document.getElementById('customerAddress').value;
    document.getElementById('print-customer-number').textContent = document.getElementById('customerNumber').value;
    document.getElementById('print-order-items').textContent = document.getElementById('orderItems').value;
    // Also update the total for print display (already handled by calculateTotal and totalAmountDisplay)

    // Show print view elements when printing (handled by media query)
    document.querySelectorAll('.print-only-view').forEach(el => el.classList.remove('hidden'));
}

function printInvoice() {
    updatePrintView(); // Ensure print view elements are populated
    window.print();
}

// 4. FORM SUBMISSION (Save to Google Sheet via POST)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formUrl = getFormUrl();
    if (!formUrl) return;

    showMessage('loading', 'Submitting invoice data to Google Sheet...');

    const formData = new FormData(form);
    const submissionData = new URLSearchParams({
        invoiceId: formData.get('invoiceId'),
        customerName: formData.get('customerName'),
        customerAddress: formData.get('customerAddress'),
        customerNumber: formData.get('customerNumber'),
        totalAmount: formData.get('totalAmount'),
        orderItems: formData.get('orderItems') // Text area content
    });
    console.log(submissionData.toString());

    // Exponential backoff retry logic
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response = await fetch(formUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: submissionData.toString()
            });

            if (response.ok) {
                const result = await response.json();
                showMessage('success', `Success! Invoice ${result.invoiceId} has been saved to your Google Sheet.`, 5000);
                // Generate a new ID for the next invoice
                generateInvoiceId();
                formData.set('invoiceId', '');
                formData.set('customerName', '');
                formData.set('customerAddress', '');
                formData.set('customerNumber', '');
                formData.set('totalAmount', '');
                formData.set('orderItems', '');

                return;
            } else {
                throw new Error(`Server returned status: ${response.status}`);
            }
        } catch (fetchError) {
            attempt++;
            if (attempt >= maxRetries) {
                console.error('Submission failed after retries:', fetchError);
                showMessage('error', 'Failed to save invoice. Check your Apps Script deployment/URL and console for errors.', 7000);
                return;
            }
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
});

// 5. INVOICE SEARCH (Retrieve from Google Sheet via GET)
async function searchInvoice() {
    const searchId = searchInput.value.trim();

    // --- UPDATED VALIDATION ---
    if (!searchId) {
        showMessage('error', 'Please enter a valid Invoice ID (e.g., INV-123456789) to search.', 5000);
        searchResultsDiv.classList.add('hidden');
        return;
    }

    const formUrl = getFormUrl();
    if (!formUrl) return;

    showMessage('loading', `Searching for Invoice ID: ${searchId}...`);
    searchResultsDiv.classList.add('hidden');

    const urlWithParams = `${formUrl}?invoiceId=${encodeURIComponent(searchId)}`;
    console.log("Attempting GET request to:", urlWithParams); // Log the URL being sent
    // --------------------------

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const response = await fetch(urlWithParams, { method: 'GET' });

            if (response.ok) {
                const result = await response.json();
                if (result.result === 'success') {
                    const data = result.invoice;
                    let details = `Invoice ID: ${data['Invoice ID']}\n`;
                    details += `Date: ${new Date(data['Timestamp']).toLocaleDateString()}\n\n`;
                    details += `Customer Name: ${data['Customer Name']}\n`;
                    details += `Customer Address: ${data['Customer Address']}\n`;
                    details += `Customer Phone: ${data['Customer Phone']}\n\n`;
                    details += `--- Order Items ---\n`;
                    details += `${data['Order Items Text']}\n\n`;
                    details += `TOTAL: $${parseFloat(data['Total Amount']).toFixed(2)}`;

                    resultContent.textContent = details;
                    searchResultsDiv.classList.remove('hidden');
                    showMessage('success', `Invoice ${searchId} found.`, 3000);
                } else {
                    resultContent.textContent = `Error: ${result.message}`;
                    searchResultsDiv.classList.remove('hidden');
                    showMessage('error', `Invoice not found.`, 5000);
                }
                return;
            } else {
                throw new Error(`Server returned status: ${response.status}`);
            }
        } catch (fetchError) {
            attempt++;
            if (attempt >= maxRetries) {
                console.error('Search failed after retries:', fetchError);
                showMessage('error', 'Search failed. Check your Apps Script permissions and deployment.', 7000);
                return;
            }
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}


// 6. UTILITY FUNCTIONS (Messaging)
function showMessage(type, message, duration = 0) {
    messageBox.classList.remove('hidden', 'bg-red-100', 'bg-green-100', 'bg-blue-100', 'text-red-700', 'text-green-700', 'text-blue-700');
    messageText.textContent = message;

    switch (type) {
        case 'success':
            messageBox.classList.add('bg-green-100', 'text-green-700');
            break;
        case 'error':
            messageBox.classList.add('bg-red-100', 'text-red-700');
            break;
        case 'loading':
        default:
            messageBox.classList.add('bg-blue-100', 'text-blue-700');
    }

    if (duration > 0) {
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, duration);
    }
}

// 7. INITIAL SETUP
window.onload = () => {
    generateInvoiceId();
    calculateTotal();
    // Initial update of print view for the empty state
    updatePrintView();
};