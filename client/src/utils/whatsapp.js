/**
 * Helper to redirect to both WhatsApp Desktop Application and WhatsApp Web
 * with a normalized phone number and optional message.
 *
 * 1. Dispatches `whatsapp://send?phone=...` to directly trigger the installed WhatsApp Desktop App.
 * 2. Opens `https://web.whatsapp.com/send?phone=...` in a new browser tab for WhatsApp Web.
 *
 * @param {string|number} phone - Contact phone number
 * @param {string} [message] - Optional pre-filled message text
 * @returns {boolean} True if redirected, false if invalid number
 */
export function redirectToWhatsAppWeb(phone, message = '') {
  if (!phone) return false;
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length === 11 && clean.startsWith('0')) {
    clean = '91' + clean.slice(1);
  } else if (clean.length === 10) {
    clean = '91' + clean;
  }
  if (!clean) return false;

  const query = message ? `&text=${encodeURIComponent(message)}` : '';
  const desktopAppUrl = `whatsapp://send?phone=${clean}${query}`;
  const webUrl = `https://web.whatsapp.com/send?phone=${clean}${query}`;

  // 1. Trigger the native Desktop WhatsApp App via custom protocol
  try {
    const link = document.createElement('a');
    link.href = desktopAppUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch (_) {}
    }, 1000);
  } catch (err) {
    console.warn('Could not launch WhatsApp desktop application protocol:', err);
  }

  // 2. Also open WhatsApp Web in a new browser tab
  try {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  } catch (err) {
    console.warn('Could not open WhatsApp Web in new tab:', err);
  }

  return true;
}

export const redirectToWhatsApp = redirectToWhatsAppWeb;
