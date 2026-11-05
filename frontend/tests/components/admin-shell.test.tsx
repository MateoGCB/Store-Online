import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { AdminShell } from '@/components/admin/admin-shell';
import { storeInfo } from '../support/fixtures';
import { navigation } from '../support/next-mocks';
import { renderWithProviders } from '../support/render';
import { API, server } from '../support/server';

describe('admin sidebar header', () => {
  it('shows the store name as title and "Administración" as subtitle, once', async () => {
    navigation.pathname = '/admin';
    server.use(http.get(`${API}/store-info`, () => HttpResponse.json(storeInfo)));
    renderWithProviders(<AdminShell>Contenido</AdminShell>);
    const aside = within(screen.getByRole('complementary'));
    expect(await aside.findByText(storeInfo.storeName)).toHaveClass('font-display');
    expect(aside.getAllByText('Administración')).toHaveLength(1);
    expect(aside.getByText('Administración')).not.toHaveClass('font-display');
  });

  it('a new name saved in the settings shows up without reloading', async () => {
    navigation.pathname = '/admin';
    server.use(http.get(`${API}/store-info`, () => HttpResponse.json(storeInfo)));
    const { client } = renderWithProviders(<AdminShell>Contenido</AdminShell>);
    expect(await screen.findByText(storeInfo.storeName)).toBeInTheDocument();
    // The settings mutation writes the saved settings into this same query.
    client.setQueryData(['store-info'], { ...storeInfo, storeName: 'Casa Nueva' });
    expect(await screen.findByText('Casa Nueva')).toBeInTheDocument();
  });
});
