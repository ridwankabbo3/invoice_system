/**
 * Global function to get the 'Invoices' sheet.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} The sheet object.
 */
function getInvoicesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Invoices');
  if (!sheet) {
    Logger.log("Error: Sheet named 'Invoices' not found.");
  }
  return sheet;
}

/**
 * Handles GET requests (used for searching/retrieving data).
 */
function doGet(e) {
  const sheet = getInvoicesSheet();
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "Invoices sheet not found." })).setMimeType(ContentService.MimeType.JSON);
  }

  const invoiceId = e.parameter.invoiceId;

  if (!invoiceId) {
    // If no ID is provided, return an error or placeholder message
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "Missing invoiceId parameter for GET request." }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Get all data from the sheet (excluding header)
  const range = sheet.getDataRange();
  const values = range.getValues();
  const headers = values[0]; // Assuming row 1 is headers

  let foundInvoice = null;

  // Start searching from row 2 (index 1)
  for (let i = 1; i < values.length; i++) {
    // Assuming Invoice ID is in the second column (index 1)
    if (values[i][1] === invoiceId) {
      // Map the values to an object using headers
      foundInvoice = {};
      for (let j = 0; j < headers.length; j++) {
        foundInvoice[headers[j]] = values[i][j];
      }
      break; // Found it, stop searching
    }
  }

  if (foundInvoice) {
    return ContentService.createTextOutput(JSON.stringify({ result: "success", invoice: foundInvoice }))
      .setMimeType(ContentService.MimeType.JSON);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ result: "not found", message: `Invoice ID ${invoiceId} not found.` }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles POST requests to receive form data (used for saving).
 */
function doPost(e) {
  const sheet = getInvoicesSheet();
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: "Invoices sheet not found." })).setMimeType(ContentService.MimeType.JSON);
  }

  // Check if headers are present (Row 1) and add them if not
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Timestamp', 'Invoice ID', 'Customer Name', 'Customer Email', 'Customer Phone',
      'Total Amount', 'Order Items Text'
    ]);
  }

  const data = e.parameter;
  const timestamp = new Date();

  // We now accept the ID from the client form (data.invoiceId)
  const invoiceId = data.invoiceId || `INV-${timestamp.getTime()}`;

  // Log the data row
  sheet.appendRow([
    timestamp,
    invoiceId,
    data.customerName || '',
    data.customerEmail || '',
    data.customerNumber || '',
    parseFloat(data.totalAmount) || 0,
    data.orderItems || '' // This is the text area content
  ]);

  // Return a success JSON response to the client
  return ContentService.createTextOutput(JSON.stringify({
    result: "success",
    invoiceId: invoiceId,
    message: "Invoice successfully recorded."
  })).setMimeType(ContentService.MimeType.JSON);
}
