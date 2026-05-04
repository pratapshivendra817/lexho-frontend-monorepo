export const isValidMobile = (mobile: string) => {
  return /^[6-9]\d{9}$/.test(mobile);
};