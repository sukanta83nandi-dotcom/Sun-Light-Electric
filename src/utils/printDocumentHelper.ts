import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';

/**
 * Downloads a DOM element directly as a crystal-clear, high-resolution PNG image (2x Retina DPI).
 * Uses html-to-image with html2canvas fallback, guaranteeing reliable pure client-side export.
 */
export async function downloadAsPng(
  elementIdOrNode: string | HTMLElement,
  filename: string,
  onToast?: (msg: string) => void
): Promise<void> {
  const node = typeof elementIdOrNode === 'string'
    ? document.getElementById(elementIdOrNode)
    : elementIdOrNode;

  if (!node) {
    console.error(`Document container "${elementIdOrNode}" not found for PNG export.`);
    if (onToast) onToast('Document container not found!');
    return;
  }

  const safeFilename = filename.toLowerCase().endsWith('.png') ? filename : `${filename}.png`;

  // Pre-load all <img> tags inside node (e.g. company logo, QR codes)
  const images = Array.from(node.querySelectorAll('img'));
  if (images.length > 0) {
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const onFinish = () => resolve();
          img.addEventListener('load', onFinish, { once: true });
          img.addEventListener('error', onFinish, { once: true });
          setTimeout(resolve, 800);
        });
      })
    );
  }

  try {
    const dataUrl = await htmlToImage.toPng(node, {
      quality: 1.0,
      pixelRatio: 2, // 2x High-DPI crystal clear resolution
      backgroundColor: '#ffffff',
      cacheBust: true,
    });

    const link = document.createElement('a');
    link.download = safeFilename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 1000);

    if (onToast) {
      onToast('PNG downloaded successfully!');
    }
  } catch (err) {
    console.warn('html-to-image failed, falling back to html2canvas for PNG export:', err);
    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = safeFilename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 1000);

      if (onToast) {
        onToast('PNG downloaded successfully!');
      }
    } catch (h2cError) {
      console.error('PNG export failed:', h2cError);
      if (onToast) {
        onToast('Failed to export PNG. Please try again or use Print.');
      }
    }
  }
}

/**
 * Specifically handles Delivery Challan PNG downloads:
 * - If "both" copies is active, triggers two sequential downloads for Original & Duplicate.
 * - If a single copy is active, downloads that specific copy.
 */
export async function downloadDeliveryChallanCopiesAsPng(
  containerId: string,
  invoiceNo: string,
  copyMode: 'both' | 'original' | 'duplicate',
  onToast?: (msg: string) => void
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Challan container "${containerId}" not found!`);
    return;
  }

  const cleanNo = invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const copyNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-challan-copy]'));

  if (copyMode === 'both' && copyNodes.length >= 2) {
    const originalNode = copyNodes[0];
    const duplicateNode = copyNodes[1];

    await downloadAsPng(originalNode, `Delivery_Challan_Original_${cleanNo}.png`);
    // Brief interval for smooth sequential downloads in browsers
    await new Promise((r) => setTimeout(r, 650));
    await downloadAsPng(duplicateNode, `Delivery_Challan_Duplicate_${cleanNo}.png`, onToast);
  } else if (copyNodes.length > 0) {
    const activeCopyType = copyNodes[0].getAttribute('data-challan-copy') || 'Copy';
    const label = activeCopyType.charAt(0).toUpperCase() + activeCopyType.slice(1).toLowerCase();
    await downloadAsPng(copyNodes[0], `Delivery_Challan_${label}_${cleanNo}.png`, onToast);
  } else {
    await downloadAsPng(container, `Delivery_Challan_${cleanNo}.png`, onToast);
  }
}

/**
 * Retrieves the html2pdf runner instance safely across bundling
 * and sandboxed WebContainer environments.
 */
async function getHtml2PdfInstance(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).html2pdf) {
    return (window as any).html2pdf;
  }
  try {
    return html2pdf;
  } catch (err) {
    console.warn('Direct html2pdf import check failed, loading dynamically:', err);
    try {
      const mod = await import('html2pdf.js');
      return mod.default || mod;
    } catch (e) {
      if (typeof document !== 'undefined') {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.crossOrigin = 'anonymous';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2pdf bundle from CDN'));
          document.head.appendChild(script);
        });
        return (window as any).html2pdf;
      }
      throw e;
    }
  }
}

/**
 * Downloads a DOM element strictly as an authentic .PDF file using html2pdf.js
 * (with jsPDF + html2canvas direct PDF fallback).
 */
export async function downloadAsTruePdf(
  elementId: string,
  filename: string,
  onToast?: (msg: string) => void
): Promise<void> {
  const targetEl = document.getElementById(elementId);
  if (!targetEl) {
    console.error(`Target element with id "${elementId}" not found for PDF download.`);
    return;
  }

  const safePdfName = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

  const images = Array.from(targetEl.querySelectorAll('img'));
  if (images.length > 0) {
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const onFinish = () => resolve();
          img.addEventListener('load', onFinish, { once: true });
          img.addEventListener('error', onFinish, { once: true });
          setTimeout(resolve, 800);
        });
      })
    );
  }

  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: safePdfName,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollY: 0,
      scrollX: 0,
      windowWidth: 1024,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.html2pdf__page-break',
      after: ['.html2pdf__page-break', '.challan-page-break'],
    },
  };

  try {
    const h2p = await getHtml2PdfInstance();
    if (typeof h2p === 'function') {
      await h2p().set(opt).from(targetEl).save();
      if (onToast) {
        onToast(`Downloaded ${safePdfName}`);
      }
      return;
    }
    throw new Error('html2pdf instance not callable');
  } catch (html2pdfError) {
    console.warn('html2pdf encounter issue, executing jsPDF direct PDF renderer:', html2pdfError);

    try {
      const copyNodes = Array.from(targetEl.querySelectorAll<HTMLElement>('[data-challan-copy]'));
      const elementsToCapture = copyNodes.length > 0 ? copyNodes : [targetEl];

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printableWidth = pageWidth - margin * 2;
      const maxPrintableHeight = pageHeight - margin * 2;

      for (let i = 0; i < elementsToCapture.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const el = elementsToCapture[i];
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1024,
          scrollY: 0,
          scrollX: 0,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        let renderWidth = printableWidth;
        let renderHeight = (canvas.height * printableWidth) / canvas.width;

        if (renderHeight > maxPrintableHeight) {
          const ratio = maxPrintableHeight / renderHeight;
          renderHeight = maxPrintableHeight;
          renderWidth = printableWidth * ratio;
        }

        const xPos = margin + (printableWidth - renderWidth) / 2;
        const yPos = margin;

        pdf.addImage(imgData, 'JPEG', xPos, yPos, renderWidth, renderHeight, undefined, 'FAST');
      }

      pdf.save(safePdfName);
      if (onToast) {
        onToast(`Downloaded ${safePdfName}`);
      }
    } catch (fallbackError) {
      console.error('Fatal PDF export error:', fallbackError);
      if (onToast) {
        onToast('Failed to generate PDF. Please try standard print.');
      }
    }
  }
}

export const downloadDocumentAsPdfOrHtml = downloadAsTruePdf;
export const downloadDomAsPdf = downloadAsTruePdf;

/**
 * Direct Print implementation via a hidden silent iframe (#silent-print-frame).
 * Avoids modal dismissal or main window reflow.
 */
export function printDocumentViaSilentIframe(
  elementId: string,
  documentTitle = 'Print Document'
): Promise<void> {
  return new Promise((resolve) => {
    try {
      const targetEl = document.getElementById(elementId);
      if (!targetEl) {
        console.error(`Target element with id "${elementId}" not found for printing.`);
        window.print();
        resolve();
        return;
      }

      let iframe = document.getElementById('silent-print-frame') as HTMLIFrameElement | null;
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }

      iframe = document.createElement('iframe');
      iframe.id = 'silent-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      iframe.setAttribute('title', documentTitle);

      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        window.print();
        resolve();
        return;
      }

      let stylesHtml = '';
      const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]');
      styleNodes.forEach((node) => {
        stylesHtml += node.outerHTML;
      });

      const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${documentTitle}</title>
  ${stylesHtml}
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .challan-page-break,
    .html2pdf__page-break {
      break-after: page !important;
      page-break-after: always !important;
    }
    .delivery-challan-card,
    .ewaybill-printable {
      margin: 0 auto !important;
      max-width: 100% !important;
      border-color: #0f172a !important;
      box-shadow: none !important;
    }
  </style>
</head>
<body class="bg-white text-slate-900">
  <div style="width: 100%; max-width: 900px; margin: 0 auto; padding: 12px;">
    ${targetEl.outerHTML}
  </div>
</body>
</html>`;

      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      const triggerPrint = () => {
        try {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        } catch (printErr) {
          console.error('Silent iframe printing error, falling back to window.print():', printErr);
          window.print();
        } finally {
          setTimeout(() => {
            if (iframe && iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
            resolve();
          }, 1500);
        }
      };

      const images = iframeDoc.getElementsByTagName('img');
      const totalImages = images.length;

      if (totalImages === 0) {
        setTimeout(triggerPrint, 250);
      } else {
        let loaded = 0;
        const checkDone = () => {
          loaded++;
          if (loaded >= totalImages) {
            setTimeout(triggerPrint, 200);
          }
        };

        for (let i = 0; i < totalImages; i++) {
          const img = images[i];
          if (img.complete) {
            checkDone();
          } else {
            img.onload = checkDone;
            img.onerror = checkDone;
          }
        }
        setTimeout(triggerPrint, 1200);
      }
    } catch (err) {
      console.error('Error launching silent iframe print:', err);
      window.print();
      resolve();
    }
  });
}

export const printElementInIsolatedIframe = printDocumentViaSilentIframe;
