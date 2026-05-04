import { assetPathMap, resolveAssetPath, resolveImageSource } from '../src/utils/assetMap';
import { API_BASE_URL } from '../src/api/api';
import { extractImageValue } from '../src/utils/assetMap';

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
});
