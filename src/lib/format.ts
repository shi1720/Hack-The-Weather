export const kes = (n: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(n);
export const number = (n: number) =>
  new Intl.NumberFormat('en-KE', { maximumFractionDigits: 1 }).format(n);
export const time = (s: string) =>
  new Date(s).toLocaleTimeString('en-GB', {
    timeZone: 'Africa/Nairobi',
    hour: '2-digit',
    minute: '2-digit',
  });
export const day = (s: string, long = false) =>
  new Date(s.length === 10 ? s + 'T09:00:00Z' : s).toLocaleDateString('en-GB', {
    timeZone: 'Africa/Nairobi',
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: 'short',
    ...(long ? { year: 'numeric' } : {}),
  });
export function download(name: string, text: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          const s = String(v ?? '');
          return '"' + (/^[=+\-@\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"';
        })
        .join(','),
    )
    .join('\r\n');
}
