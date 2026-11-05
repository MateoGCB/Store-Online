import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { QuantitySelector } from '@/components/shop/quantity-selector';

function Harness({ maxPurchasable, initial = 1 }: { maxPurchasable: number; initial?: number }) {
  const [value, setValue] = useState(initial);
  return <QuantitySelector value={value} onChange={setValue} maxPurchasable={maxPurchasable} />;
}

const input = () => screen.getByRole('spinbutton', { name: 'Cantidad' });
const plus = () => screen.getByRole('button', { name: 'Sumar una unidad' });
const minus = () => screen.getByRole('button', { name: 'Restar una unidad' });

describe('QuantitySelector', () => {
  it('never goes below 1', async () => {
    render(<Harness maxPurchasable={5} />);
    expect(input()).toHaveValue(1);
    expect(minus()).toBeDisabled();
  });

  it('stops at maxPurchasable when it is lower than 20', async () => {
    const user = userEvent.setup();
    render(<Harness maxPurchasable={3} />);
    for (let i = 0; i < 6; i++) if (!plus().hasAttribute('disabled')) await user.click(plus());
    expect(input()).toHaveValue(3);
    expect(plus()).toBeDisabled();
    expect(screen.getByText('Máximo 3 unidades')).toBeInTheDocument();
  });

  it('never allows more than 20 even if more units are available', async () => {
    const user = userEvent.setup();
    render(<Harness maxPurchasable={500} initial={19} />);
    await user.click(plus());
    expect(input()).toHaveValue(20);
    expect(plus()).toBeDisabled();
  });

  it('clamps typed values to the allowed range', async () => {
    const user = userEvent.setup();
    render(<Harness maxPurchasable={4} />);
    await user.clear(input());
    await user.type(input(), '9');
    expect(input()).toHaveValue(4);
  });

  it('is disabled when nothing can be bought', () => {
    render(<Harness maxPurchasable={0} initial={0} />);
    expect(input()).toBeDisabled();
    expect(plus()).toBeDisabled();
  });
});
