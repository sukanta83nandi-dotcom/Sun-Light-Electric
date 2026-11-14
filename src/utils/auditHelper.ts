import { AuditLogEntry, Customer, FieldChange } from '../types';
import { Supplier } from '../types/supplier';

export const DEFAULT_AUDIT_USER = 'Haradhan Patra';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a Date object as "DD MMM YYYY, hh:mm A" (e.g., "14 Nov 2026, 09:54 PM").
 */
export const formatAuditTimestamp = (date: Date = new Date()): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS_SHORT[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hourStr = String(hours).padStart(2, '0');
  return `${day} ${month} ${year}, ${hourStr}:${minutes} ${ampm}`;
};

/**
 * Creates a standardized AuditLogEntry.
 */
export const createAuditEntry = (
  action: AuditLogEntry['action'],
  performedBy: string = DEFAULT_AUDIT_USER,
  changes?: FieldChange[],
  date: Date = new Date()
): AuditLogEntry => ({
  id: `AUD-${date.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
  action,
  timestamp: formatAuditTimestamp(date),
  isoTimestamp: date.toISOString(),
  performedBy: performedBy || DEFAULT_AUDIT_USER,
  ...(changes && changes.length > 0 ? { changes } : {}),
});

/**
 * Ensures any legacy / pre-loaded record has at least a baseline CREATED entry.
 */
export const ensureInitialAuditHistory = (
  history?: AuditLogEntry[],
  performedBy: string = DEFAULT_AUDIT_USER
): AuditLogEntry[] => {
  if (history && history.length > 0) return history;
  return [createAuditEntry('CREATED', performedBy)];
};

const norm = (val: unknown): string => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

const displayVal = (val: string): string => (val === '' ? '—' : val);

/**
 * Compares two Customer records and returns exact field-by-field changes.
 */
export const diffCustomerFields = (oldCust: Customer, newCust: Customer): FieldChange[] => {
  const changes: FieldChange[] = [];

  const compare = (label: string, prev: unknown, next: unknown) => {
    const p = norm(prev);
    const n = norm(next);
    if (p !== n) {
      changes.push({
        field: label,
        oldValue: displayVal(p),
        newValue: displayVal(n),
      });
    }
  };

  compare('Customer Name', oldCust.name, newCust.name);
  compare('Contact Person', oldCust.contactPerson, newCust.contactPerson);
  compare('Client Code', oldCust.code, newCust.code);
  compare('Type', oldCust.category, newCust.category);
  compare(
    'Status',
    oldCust.status === 'inactive' ? 'Inactive' : 'Active',
    newCust.status === 'inactive' ? 'Inactive' : 'Active'
  );
  compare('Phone / Mobile', oldCust.phone, newCust.phone);
  compare('Email', oldCust.email, newCust.email);
  compare('SPOC Email ID', oldCust.spocEmail, newCust.spocEmail);
  compare('Finance Email ID', oldCust.financeEmail, newCust.financeEmail);
  compare(
    'Site Survey / Inspection',
    oldCust.siteSurveyRequired || 'Required',
    newCust.siteSurveyRequired || 'Required'
  );
  compare('Last Invoice Dt.', oldCust.lastInvoiceDate, newCust.lastInvoiceDate);
  compare('Address', oldCust.address, newCust.address);
  compare('City', oldCust.city, newCust.city);
  compare('District', oldCust.district, newCust.district);
  compare('State', oldCust.state, newCust.state);
  compare('State Code', oldCust.stateCode, newCust.stateCode);
  compare('PIN Code', oldCust.pinCode || oldCust.pincode, newCust.pinCode || newCust.pincode);
  compare('Location', oldCust.locationType, newCust.locationType);
  compare('Currency', oldCust.currency || 'Rs.', newCust.currency || 'Rs.');
  compare('Credit Period (Days)', oldCust.creditPeriodDays ?? '0', newCust.creditPeriodDays ?? '0');
  compare('Terms of Payment', oldCust.termsOfPayment || 'Advance', newCust.termsOfPayment || 'Advance');
  compare(
    'Dispatch Through',
    oldCust.dispatchThrough || 'Company Vehicle',
    newCust.dispatchThrough || 'Company Vehicle'
  );
  compare(
    'Terms of Delivery',
    oldCust.termsOfDelivery || 'Site Delivery',
    newCust.termsOfDelivery || 'Site Delivery'
  );
  compare('TDS', oldCust.tds || 'No', newCust.tds || 'No');
  compare(
    'GST No Reqd',
    oldCust.gstNoRequired || (oldCust.gstin ? 'Yes' : 'No'),
    newCust.gstNoRequired || (newCust.gstin ? 'Yes' : 'No')
  );
  compare('GSTIN', oldCust.gstin, newCust.gstin);
  compare('PAN Number', oldCust.panNumber, newCust.panNumber);

  const oldDocsCount = (oldCust.documents || []).length;
  const newDocsCount = (newCust.documents || []).length;
  if (oldDocsCount !== newDocsCount) {
    changes.push({
      field: 'KYC Documents',
      oldValue: `${oldDocsCount} File${oldDocsCount === 1 ? '' : 's'}`,
      newValue: `${newDocsCount} File${newDocsCount === 1 ? '' : 's'}`,
    });
  }

  return changes;
};

/**
 * Compares two Supplier records and returns exact field-by-field changes.
 */
export const diffSupplierFields = (oldSup: Supplier, newSup: Supplier): FieldChange[] => {
  const changes: FieldChange[] = [];

  const compare = (label: string, prev: unknown, next: unknown) => {
    const p = norm(prev);
    const n = norm(next);
    if (p !== n) {
      changes.push({
        field: label,
        oldValue: displayVal(p),
        newValue: displayVal(n),
      });
    }
  };

  compare('Supplier Code', oldSup.supplierCode, newSup.supplierCode);
  compare('Company Name', oldSup.companyName, newSup.companyName);
  compare('Contact Person', oldSup.contactPerson, newSup.contactPerson);
  compare(
    'Status',
    oldSup.status === 'inactive' ? 'Inactive' : 'Active',
    newSup.status === 'inactive' ? 'Inactive' : 'Active'
  );
  compare('Phone / Mobile', oldSup.phone, newSup.phone);
  compare('Email Address', oldSup.email, newSup.email);
  compare('Category Supplied', oldSup.categorySupplied, newSup.categorySupplied);
  compare('Address', oldSup.address, newSup.address);
  compare('State', oldSup.state, newSup.state);
  compare('GSTIN', oldSup.gstin, newSup.gstin);
  compare(
    'Payment Terms (Days)',
    oldSup.paymentTermsDays ?? 30,
    newSup.paymentTermsDays ?? 30
  );
  compare('Bank Name', oldSup.bankDetails?.bankName, newSup.bankDetails?.bankName);
  compare('Bank Account No', oldSup.bankDetails?.accountNo, newSup.bankDetails?.accountNo);
  compare('Bank IFSC Code', oldSup.bankDetails?.ifscCode, newSup.bankDetails?.ifscCode);

  const oldBal = Number(oldSup.balancePayable) || 0;
  const newBal = Number(newSup.balancePayable) || 0;
  if (oldBal !== newBal) {
    changes.push({
      field: 'Balance Payable',
      oldValue: `₹${oldBal.toLocaleString('en-IN')}`,
      newValue: `₹${newBal.toLocaleString('en-IN')}`,
    });
  }

  const oldDocsCount = (oldSup.documents || []).length;
  const newDocsCount = (newSup.documents || []).length;
  if (oldDocsCount !== newDocsCount) {
    changes.push({
      field: 'KYC Documents',
      oldValue: `${oldDocsCount} File${oldDocsCount === 1 ? '' : 's'}`,
      newValue: `${newDocsCount} File${newDocsCount === 1 ? '' : 's'}`,
    });
  }

  return changes;
};
