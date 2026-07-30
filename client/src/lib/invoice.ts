import api from './api';

/**
 * Fetches a PDF invoice from the backend (with the JWT attached via the
 * existing axios interceptor) and opens it in a new browser tab.
 * Using a blob + object URL keeps the auth token in the Authorization
 * header rather than exposing it in a plain URL.
 */
export async function viewInvoice(url: string, _fallbackFilename: string) {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    window.open(blobUrl, '_blank');
    // Revoke after a delay — give the new tab time to load it first
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
  } catch (err) {
    console.error('Failed to load invoice', err);
    alert('Could not load the invoice. Please try again.');
  }
}