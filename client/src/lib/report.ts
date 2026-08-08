import api from './api';

export async function downloadReport(url: string, params: Record<string, string>, filename: string) {
  try {
    const res = await api.get(url, { params, responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    console.error('Failed to download report', err);
    alert('Could not generate the report. Please try again.');
  }
}