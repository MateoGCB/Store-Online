import { parseCatalogParams, toApiQuery } from '@/lib/catalog/query';

describe('catalog query', () => {
  it('converts whole pesos in the URL to cents for the API and ignores invalid values', () => {
    const filters = parseCatalogParams({
      minPrice: '1000',
      maxPrice: 'abc',
      sort: 'evil',
      page: '-3',
      category: 'Cocina!',
    });
    expect(filters).toMatchObject({
      minPrice: 1000,
      maxPrice: null,
      sort: 'newest',
      page: 1,
      category: '',
    });
    expect(toApiQuery(filters)).toBe('minPrice=100000&sort=newest&page=1&pageSize=12');
  });
});
