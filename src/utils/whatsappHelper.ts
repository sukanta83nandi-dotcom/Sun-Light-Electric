import { QuotationInvoice, PaymentRecord, Language } from '../types';
import { COMPANY_CREDENTIALS } from '../data/mockData';

/**
 * Builds a formatted text message for Money Receipt / Payment Voucher sharing.
 */
export function buildReceiptWhatsAppMessage(
  receipt: PaymentRecord,
  doc: QuotationInvoice,
  lang: Language = 'en'
): string {
  const totalPaid = (doc.payments || []).reduce((sum, p) => sum + p.amountPaid, 0);
  const dueAmount = Math.max(0, doc.grandTotal - totalPaid);

  if (lang === 'bn') {
    return (
      `🧾 *টাকা প্রাপ্তি রসিদ (MONEY RECEIPT)*\n` +
      `*${COMPANY_CREDENTIALS.companyName}*\n\n` +
      `প্রিয় *${doc.customerName}*,\n` +
      `আপনার থেকে টাকা প্রাপ্তির বিবরণ নিচে দেওয়া হলো:\n\n` +
      `• রসিদ নম্বর: *${receipt.receiptNo}*\n` +
      `• ইনভয়েস নম্বর: *${doc.documentNumber}*\n` +
      `• তারিখ: ${receipt.date}\n` +
      `• প্রাপ্ত টাকা: *₹${receipt.amountPaid.toLocaleString('en-IN')}*\n` +
      `• পেমেন্ট মোড: *${receipt.paymentMode}*\n` +
      `${receipt.referenceNo ? `• ট্রানজ্যাকশন/ইউটিআর নম্বর: *${receipt.referenceNo}*\n` : ''}` +
      `\n📊 *হিসাব সংক্ষেপ:*\n` +
      `• মোট ইনভয়েস মূল্য: ₹${doc.grandTotal.toLocaleString('en-IN')}\n` +
      `• এযাবৎ মোট জমা: ₹${totalPaid.toLocaleString('en-IN')}\n` +
      `• অবশিষ্ট বকেয়া: *₹${dueAmount.toLocaleString('en-IN')}*\n\n` +
      `পেমেন্টের জন্য আপনাকে অনেক ধন্যবাদ।\n` +
      `📞 যোগাযোগ: +91 ${COMPANY_CREDENTIALS.mobile}\n` +
      `*${COMPANY_CREDENTIALS.ownerName} (সান লাইট ইলেকট্রিক)*`
    );
  }

  return (
    `🧾 *PAYMENT RECEIPT VOUCHER*\n` +
    `*${COMPANY_CREDENTIALS.companyName}*\n\n` +
    `Dear *${doc.customerName}*,\n` +
    `We acknowledge with thanks the receipt of your payment with details below:\n\n` +
    `• Receipt No: *${receipt.receiptNo}*\n` +
    `• Invoice Ref: *${doc.documentNumber}*\n` +
    `• Receipt Date: ${receipt.date}\n` +
    `• Amount Received: *₹${receipt.amountPaid.toLocaleString('en-IN')}*\n` +
    `• Payment Mode: *${receipt.paymentMode}*\n` +
    `${receipt.referenceNo ? `• Ref / UTR / Chq No: *${receipt.referenceNo}*\n` : ''}` +
    `\n📊 *Account Balance Summary:*\n` +
    `• Invoice Grand Total: ₹${doc.grandTotal.toLocaleString('en-IN')}\n` +
    `• Total Paid Till Date: ₹${totalPaid.toLocaleString('en-IN')}\n` +
    `• Balance Outstanding: *₹${dueAmount.toLocaleString('en-IN')}*\n\n` +
    `Thank you for your prompt payment!\n` +
    `📞 Mobile/WhatsApp: +91 ${COMPANY_CREDENTIALS.mobile}\n` +
    `*${COMPANY_CREDENTIALS.ownerName} (Sun Light Electric)*`
  );
}

/**
 * Creates deep links for WhatsApp sharing of Money Receipt.
 */
export function getReceiptWhatsAppDeepLinks(
  receipt: PaymentRecord,
  doc: QuotationInvoice,
  lang: Language = 'en'
) {
  const targetPhone = formatPhoneNumberForWhatsApp(doc.customerPhone);
  const messageText = buildReceiptWhatsAppMessage(receipt, doc, lang);
  const encodedText = encodeURIComponent(messageText);

  return {
    waMeUrl: `https://wa.me/${targetPhone}?text=${encodedText}`,
    appSchemeUrl: `whatsapp://send?phone=${targetPhone}&text=${encodedText}`,
    messageText,
  };
}

/**
 * Builds a formatted text message for WhatsApp sharing in Bengali or English.
 */
export function buildWhatsAppMessage(doc: QuotationInvoice, lang: Language = 'en'): string {
  const isQuote = doc.type === 'Quotation';
  const docTitle = isQuote ? 'Solar Quotation' : 'Tax Invoice';

  if (lang === 'bn') {
    return (
      `প্রিয় *${doc.customerName}*,\n\n` +
      `শুভেচ্ছা নেবেন! *${COMPANY_CREDENTIALS.companyName}*-এর পক্ষ থেকে আপনার জন্য *${doc.systemCapacityKw ? `${doc.systemCapacityKw}kW ` : ''}সোলার সিস্টেমের* ${docTitle} তৈরি করা হয়েছে।\n\n` +
      `📄 *ডকুমেন্ট বিবরণ:*\n` +
      `• নম্বর: *${doc.documentNumber}*\n` +
      `• তারিখ: ${doc.date}\n` +
      `• মোট মূল্য: *₹${doc.grandTotal.toLocaleString('en-IN')}*\n` +
      `${doc.subsidyEstimate ? `• সরকারি ভর্তুকি (প্রাক্কলন): ₹${doc.subsidyEstimate.toLocaleString('en-IN')}\n` : ''}` +
      `• প্রস্তুতকারক: ${COMPANY_CREDENTIALS.ownerName} (সান লাইট ইলেকট্রিক)\n\n` +
      `কোটেশনটি সম্পর্কে বিস্তারিত জানতে যোগাযোগ করুন:\n` +
      `📞 ফোন/হোয়াটসঅ্যাপ: +91 ${COMPANY_CREDENTIALS.mobile}\n` +
      `✉️ ইমেইল: ${COMPANY_CREDENTIALS.email}\n` +
      `ধন্যবাদ,\n*${COMPANY_CREDENTIALS.companyName}*`
    );
  }

  return (
    `Dear *${doc.customerName}*,\n\n` +
    `Greetings from *${COMPANY_CREDENTIALS.companyName}*! Here is your official *${doc.systemCapacityKw ? `${doc.systemCapacityKw}kW ` : ''}${docTitle}* for solar setup.\n\n` +
    `📄 *Document Details:*\n` +
    `• Document No: *${doc.documentNumber}*\n` +
    `• Date: ${doc.date}\n` +
    `• Net Payable: *₹${doc.grandTotal.toLocaleString('en-IN')}*\n` +
    `${doc.subsidyEstimate ? `• Est. Govt. Subsidy: ₹${doc.subsidyEstimate.toLocaleString('en-IN')}\n` : ''}` +
    `• GSTIN: ${COMPANY_CREDENTIALS.gstin}\n` +
    `• Prepared by: ${COMPANY_CREDENTIALS.ownerName} (Sun Light Electric)\n\n` +
    `Please review the generated document or contact us for any technical queries:\n` +
    `📞 Mobile / WhatsApp: +91 ${COMPANY_CREDENTIALS.mobile}\n` +
    `✉️ Email: ${COMPANY_CREDENTIALS.email}\n` +
    `Thank you,\n*${COMPANY_CREDENTIALS.companyName}*`
  );
}

/**
 * Clean phone number to WhatsApp international standard (e.g., 919876543210)
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  return digitsOnly;
}

/**
 * Creates deep links for WhatsApp web and native mobile application.
 */
export function getWhatsAppDeepLinks(doc: QuotationInvoice, lang: Language = 'en') {
  const targetPhone = formatPhoneNumberForWhatsApp(doc.customerPhone);
  const messageText = buildWhatsAppMessage(doc, lang);
  const encodedText = encodeURIComponent(messageText);

  return {
    waMeUrl: `https://wa.me/${targetPhone}?text=${encodedText}`,
    appSchemeUrl: `whatsapp://send?phone=${targetPhone}&text=${encodedText}`,
    messageText,
  };
}

/**
 * Attempts Web Share API (mobile native share drawer for PDF files)
 * fallback to wa.me deep link.
 */
export async function sharePdfToWhatsApp(
  pdfBlob: Blob,
  doc: QuotationInvoice,
  lang: Language = 'en'
): Promise<{ method: 'web_share' | 'deep_link'; success: boolean }> {
  const fileName = `${doc.documentNumber.replace(/\//g, '_')}.pdf`;
  const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
  const { waMeUrl, messageText } = getWhatsAppDeepLinks(doc, lang);

  // Check if Web Share API with file support is available
  if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        title: `Sun Light Electric - ${doc.documentNumber}`,
        text: messageText,
        files: [pdfFile],
      });
      return { method: 'web_share', success: true };
    } catch (err) {
      console.warn('Web Share API cancelled or failed, falling back to wa.me URL', err);
    }
  }

  // Fallback to opening wa.me deep link
  window.open(waMeUrl, '_blank');
  return { method: 'deep_link', success: true };
}

/**
 * 1-Click WhatsApp Payment Due Reminder for unpaid/partially paid invoices.
 */
export function sendPaymentDueReminderWhatsApp(invoice: {
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  grandTotal: number;
  totalPaid: number;
  dueAmount: number;
}, language: 'en' | 'bn' = 'en') {
  const UPI_ID = "7908798079@upi";
  const PAYEE_NAME = encodeURIComponent("Sun Light Electric");
  const AMOUNT = invoice.dueAmount.toFixed(2);
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${PAYEE_NAME}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(`Balance for Inv ${invoice.invoiceNo}`)}`;

  let message = "";

  if (language === 'bn') {
    message = 
`*পেমেন্ট বকেয়া রিমাইন্ডার - SUN LIGHT ELECTRIC* ☀️
----------------------------------
নমস্কার *${invoice.customerName}* মহাশয়/মহাশয়া,

আপনার সোলার সেটআপ সংক্রান্ত ট্যাক্স ইনভয়েসের বকেয়া পেমেন্টের বিবরণ নিচে দেওয়া হলো:

📄 *ইনভয়েস নম্বর:* ${invoice.invoiceNo}
📅 *ইনভয়েস তারিখ:* ${invoice.date}
💰 *মোট বিলের পরিমাণ:* ₹${invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
✅ *মোট জমা পড়েছে:* ₹${invoice.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
⚠️ *বর্তমান বকেয়া টাকা:* ₹${invoice.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
----------------------------------
*ব্যাঙ্ক পেমেন্ট বিবরণী:*
• ব্যাঙ্ক: *HDFC BANK (DEHIBATPUR BRANCH)*
• অ্যাকাউন্ট নাম: *Sun Light Electric / Haradhan Patra*
• অ্যাকাউন্ট নং: *50200058552107*
• IFSC কোড: *HDFC0003506*
• UPI ID: *7908798079@upi*

📲 *UPI দিয়ে দ্রুত পেমেন্ট করতে ক্লিক করুন:*
${upiLink}
----------------------------------
অনুগ্রহ করে বকেয়া অর্থ পরিশোধ করে সহযোগিতা করুন। ইতিমধ্যে পরিশোধ করে থাকলে এই বার্তাটি এড়িয়ে চলুন।

ধন্যবাদান্তে,
*Sun Light Electric* | হারাধন পাত্র
📞 +91 7908798079`;
  } else {
    message = 
`*PAYMENT BALANCE DUE REMINDER - SUN LIGHT ELECTRIC* ☀️
----------------------------------
Dear *${invoice.customerName}*,

This is a gentle reminder regarding the outstanding balance for your solar installation project:

📄 *Invoice No:* ${invoice.invoiceNo}
📅 *Invoice Date:* ${invoice.date}
💰 *Total Invoice Amount:* ₹${invoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
✅ *Amount Received:* ₹${invoice.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
⚠️ *Outstanding Balance Due:* ₹${invoice.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
----------------------------------
*Official Bank Payment Details:*
• Bank: *HDFC BANK, DEHIBATPUR BRANCH*
• A/c Name: *Sun Light Electric / Haradhan Patra*
• A/c No: *50200058552107*
• IFSC Code: *HDFC0003506*
• UPI ID: *7908798079@upi*

📲 *Pay Directly via UPI:*
${upiLink}
----------------------------------
Kindly clear the balance at your earliest convenience. If already paid, please disregard this message.

Warm regards,
*Sun Light Electric* | Haradhan Patra
📞 +91 7908798079`;
  }

  const cleanPhone = invoice.customerPhone.replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
  window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`, '_blank');
}
