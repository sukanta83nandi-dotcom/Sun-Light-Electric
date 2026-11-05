const qrCache: Record<string, string> = {};

export interface UpiDetails {
  upiId: string;
  payeeName: string;
  txnNote: string;
  amount: string;
  upiString: string;
  qrCodeUrl: string;
}

export function getUpiDetails(docType: string, docNumber: string, grandTotal: number): UpiDetails {
  const UPI_ID = "7908798079@upi";
  const PAYEE_NAME = "Sun Light Electric";
  const TXN_NOTE = `Payment for ${docType} ${docNumber || ''}`.trim();
  const AMOUNT = Math.max(0, Number(grandTotal || 0)).toFixed(2);

  const upiString = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${AMOUNT}&cu=INR&tn=${encodeURIComponent(TXN_NOTE)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiString)}&margin=1`;

  if (typeof window !== 'undefined' && !qrCache[qrCodeUrl]) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 160;
        canvas.height = img.naturalHeight || 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          qrCache[qrCodeUrl] = canvas.toDataURL('image/png');
        }
      } catch (e) {
        console.warn('QR canvas cache warning:', e);
      }
    };
    img.src = qrCodeUrl;
  }

  return {
    upiId: UPI_ID,
    payeeName: PAYEE_NAME,
    txnNote: TXN_NOTE,
    amount: AMOUNT,
    upiString,
    qrCodeUrl,
  };
}

export function getQrDataUrlFromCache(qrCodeUrl: string): string | null {
  if (qrCache[qrCodeUrl]) return qrCache[qrCodeUrl];
  if (typeof document !== 'undefined') {
    const imgs = Array.from(document.images);
    const qrImg = imgs.find((i) => i.src === qrCodeUrl && i.complete && i.naturalWidth > 0);
    if (qrImg) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = qrImg.naturalWidth;
        canvas.height = qrImg.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(qrImg, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          qrCache[qrCodeUrl] = dataUrl;
          return dataUrl;
        }
      } catch (e) {
        console.warn('QR sync convert failed:', e);
      }
    }
  }
  return null;
}
