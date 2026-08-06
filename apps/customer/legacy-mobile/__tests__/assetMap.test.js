import {
  assetPathMap,
  extractImageValue,
  getFallbackImageSource,
  resolveAssetPath,
  resolveImageSource,
} from '../src/utils/assetMap';
import { API_BASE_URL } from '../src/constants/env';

describe('assetMap', () => {
  it('maps supported asset identifiers to frontend image paths', () => {
    expect(assetPathMap['asset://service-cleaning-dark-1']).toBe(
      '/assets/images/services/cleaning-dark-1.png'
    );
    expect(assetPathMap['asset://party-birthday-dark']).toBe(
      '/assets/images/party/birthday-dark.png'
    );
    expect(assetPathMap['asset://cuisine-thai-dark']).toBe(
      '/assets/images/cuisine/thai-dark.png'
    );
  });

  it('resolves known asset identifiers and leaves remote urls intact', () => {
    expect(resolveAssetPath('asset://service-cleaning-dark-1')).toBe(
      '/assets/images/services/cleaning-dark-1.png'
    );
    expect(resolveAssetPath('https://example.com/image.png')).toBe(
      'https://example.com/image.png'
    );
    expect(resolveImageSource('asset://party-birthday-dark')).toBeTruthy();
    expect(resolveImageSource('https://example.com/image.png')).toEqual({
      uri: 'https://example.com/image.png',
    });
  });

  it('extracts alternate image fields and expands backend relative urls', () => {
    expect(extractImageValue({ image_path: '/uploads/banner.png' })).toBe('/uploads/banner.png');
    expect(resolveImageSource({ image_path: '/uploads/banner.png' })).toEqual({
      uri: `${API_BASE_URL}/uploads/banner.png`,
    });
  });

  it.each([
    [null, null],
    [undefined, null],
    [' image.png ', ' image.png '],
    [42, 42],
    [{ imageUrl: '' }, null],
    [{ thumbnail_url: 'thumb.png' }, 'thumb.png'],
    [{ media: { photoUrl: 'media-photo.png' } }, 'media-photo.png'],
    [{ media: { url: 'media-fallback.png' } }, 'media-fallback.png'],
    [{ media: null }, null],
    [{ unknown: 'value' }, null],
  ])('extracts image value from %#', (input, expected) => {
    expect(extractImageValue(input)).toBe(expected);
  });

  it('resolves empty, numeric, local, relative, and remote image values', () => {
    expect(resolveAssetPath(null)).toBeNull();
    expect(resolveAssetPath('   ')).toBeNull();
    expect(resolveAssetPath({ icon: ' custom-icon.png ' })).toBe(
      'custom-icon.png',
    );

    expect(resolveImageSource(null)).toBeNull();
    expect(resolveImageSource('   ')).toBeNull();
    expect(resolveImageSource(17)).toBe(17);
    expect(
      resolveImageSource('/assets/images/services/cleaning-dark-1.png'),
    ).toBeTruthy();
    expect(resolveImageSource('HTTP://example.com/photo.png')).toEqual({
      uri: 'HTTP://example.com/photo.png',
    });
    expect(resolveImageSource('uploads/photo.png')).toEqual({
      uri: 'uploads/photo.png',
    });
  });

  it.each([
    ['party event', 'asset://party-birthday-dark'],
    ['Birthday package', 'asset://party-birthday-dark'],
    ['celebration', 'asset://party-birthday-dark'],
    ['Thai cook', 'asset://cuisine-thai-dark'],
    ['world cuisine', 'asset://cuisine-thai-dark'],
    ['food service', 'asset://cuisine-thai-dark'],
    ['private chef', 'asset://cuisine-thai-dark'],
    ['cleaning', 'asset://service-cleaning-dark-1'],
    [null, 'asset://service-cleaning-dark-1'],
  ])('chooses a fallback image for %s', (hint, expectedAsset) => {
    expect(getFallbackImageSource(hint)).toBe(
      resolveImageSource(expectedAsset),
    );
  });
});
