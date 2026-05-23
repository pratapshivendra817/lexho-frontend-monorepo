import { API_BASE_URL } from '../constants/env';

const ASSET_PATH_MAP = {
  'asset://service-cleaning-dark-1': '/assets/images/services/cleaning-dark-1.png',
  'asset://party-birthday-dark': '/assets/images/party/birthday-dark.png',
  'asset://cuisine-thai-dark': '/assets/images/cuisine/thai-dark.png',
};

const CLEANING_DARK_1 = require('../../assets/images/services/cleaning-dark-1.png');
const PARTY_BIRTHDAY_DARK = require('../../assets/images/party/birthday-dark.png');
const CUISINE_THAI_DARK = require('../../assets/images/cuisine/thai-dark.png');

const ASSET_SOURCE_MAP = {
  'asset://service-cleaning-dark-1': CLEANING_DARK_1,
  '/assets/images/services/cleaning-dark-1.png': CLEANING_DARK_1,
  'asset://party-birthday-dark': PARTY_BIRTHDAY_DARK,
  '/assets/images/party/birthday-dark.png': PARTY_BIRTHDAY_DARK,
  'asset://cuisine-thai-dark': CUISINE_THAI_DARK,
  '/assets/images/cuisine/thai-dark.png': CUISINE_THAI_DARK,
};

const normalizeAssetKey = (value) => {
  if (value == null) return null;
  return String(value).trim();
};

const IMAGE_CANDIDATE_KEYS = [
  'imageUrl',
  'image',
  'imgUrl',
  'image_url',
  'img_url',
  'imagePath',
  'image_path',
  'thumbnail',
  'thumbnailUrl',
  'thumbnail_url',
  'icon',
  'iconUrl',
  'icon_url',
  'banner',
  'bannerUrl',
  'banner_url',
  'photo',
  'photoUrl',
  'photo_url',
  'picture',
  'pictureUrl',
  'picture_url',
  'serviceImage',
  'service_image',
  'categoryImage',
  'category_image',
];

export const extractImageValue = (value) => {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;

  for (const key of IMAGE_CANDIDATE_KEYS) {
    const candidate = value?.[key];
    if (candidate != null && candidate !== '') {
      return candidate;
    }
  }

  if (value?.media && typeof value.media === 'object') {
    for (const key of IMAGE_CANDIDATE_KEYS) {
      const candidate = value.media?.[key];
      if (candidate != null && candidate !== '') {
        return candidate;
      }
    }
    if (value.media?.url) return value.media.url;
  }

  return null;
};

export const resolveAssetPath = (value) => {
  const key = normalizeAssetKey(extractImageValue(value));
  if (!key) return null;
  return ASSET_PATH_MAP[key] ?? key;
};

export const resolveImageSource = (value) => {
  if (typeof value === 'number') return value;

  const key = normalizeAssetKey(extractImageValue(value));
  if (!key) return null;

  if (ASSET_SOURCE_MAP[key]) {
    return ASSET_SOURCE_MAP[key];
  }

  if (key.startsWith('/assets/images/') && ASSET_SOURCE_MAP[key]) {
    return ASSET_SOURCE_MAP[key];
  }

  if (/^https?:\/\//i.test(key)) {
    return { uri: key };
  }

  if (key.startsWith('/')) {
    return { uri: `${API_BASE_URL}${key}` };
  }

  return { uri: key };
};

export const getFallbackImageSource = (hint) => {
  const normalized = String(hint ?? '').toLowerCase();

  if (
    normalized.includes('party') ||
    normalized.includes('birthday') ||
    normalized.includes('celebration')
  ) {
    return PARTY_BIRTHDAY_DARK;
  }

  if (
    normalized.includes('thai') ||
    normalized.includes('cuisine') ||
    normalized.includes('food') ||
    normalized.includes('chef')
  ) {
    return CUISINE_THAI_DARK;
  }

  return CLEANING_DARK_1;
};

export const assetPathMap = ASSET_PATH_MAP;
