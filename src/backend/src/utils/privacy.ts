export function maskPhone(phone?: string | null): string {
  if (!phone) {
    return '';
  }

  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}
