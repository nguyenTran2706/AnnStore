export const STATUS_STYLES = {
  processing: 'bg-accent-light text-accent',
  shipped: 'bg-blue-50 text-blue-700',
  delivered: 'bg-green-50 text-green-700',
  cancelled: 'bg-danger-light text-danger',
};

export const METHOD_LABELS = {
  card: 'Card (Stripe)',
  applepay: 'Apple Pay',
  zip: 'Zip',
  afterpay: 'Afterpay',
  paypal: 'PayPal',
};

/* Shipping carriers staff can lodge parcels with */
export const CARRIERS = {
  auspost: {
    label: 'AusPost',
    trackUrl: (num) => `https://auspost.com.au/mypost/track/#/details/${encodeURIComponent(num)}`,
  },
  cainiao: {
    label: 'Cainiao Global',
    trackUrl: (num) => `https://global.cainiao.com/newDetail.htm?mailNoList=${encodeURIComponent(num)}`,
  },
};
