import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FiltersPanel } from '@/components/shop/filters-panel';

function setup() {
  render(
    <FiltersPanel>
      <label>
        Categoría <select />
      </label>
    </FiltersPanel>,
  );
  const toggle = screen.getByRole('button', { name: 'Filtros y orden' });
  const content = document.getElementById(toggle.getAttribute('aria-controls')!)!;
  return { toggle, content };
}

describe('FiltersPanel (catalog filters)', () => {
  it('starts collapsed on mobile and is always shown from the lg breakpoint', () => {
    const { toggle, content } = setup();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(content).toHaveClass('hidden');
    expect(content).toHaveClass('lg:block');
    // The toggle only exists on small screens.
    expect(toggle).toHaveClass('lg:hidden');
  });

  it('opens and closes with the toggle button', async () => {
    const user = userEvent.setup();
    const { toggle, content } = setup();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(content).not.toHaveClass('hidden');
    expect(content).toHaveClass('block');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(content).toHaveClass('hidden');
  });
});
