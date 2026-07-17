import { COUNTRIES } from '../../utils/countries';

const FIELDS = [
  { key: 'fullName', label: 'Full name', placeholder: 'Jane Citizen', autoComplete: 'name' },
  { key: 'line1', label: 'Address line 1', placeholder: '123 Brick Lane', autoComplete: 'address-line1' },
  { key: 'line2', label: 'Address line 2 (optional)', placeholder: 'Apartment, suite, etc.', autoComplete: 'address-line2' },
  { key: 'city', label: 'City', placeholder: 'Sydney', autoComplete: 'address-level2', half: true },
  { key: 'state', label: 'State / Province', placeholder: 'NSW', autoComplete: 'address-level1', half: true },
  { key: 'postcode', label: 'Postcode', placeholder: '2000', autoComplete: 'postal-code', half: true },
  { key: 'country', label: 'Country', autoComplete: 'country-name', half: true, type: 'select' },
  { key: 'phone', label: 'Phone (optional)', placeholder: '0400 000 000', autoComplete: 'tel' },
];

export default function ShippingStep({ state, dispatch }) {
  const { shipping, errors } = state;

  const onNext = (e) => {
    e.preventDefault();
    dispatch({ type: 'NEXT' });
  };

  return (
    <form onSubmit={onNext} className="card p-6">
      <h2 className="font-heading text-xl text-ink mb-5">Shipping address</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, placeholder, autoComplete, half, type }) => (
          <div key={key} className={half ? '' : 'sm:col-span-2'}>
            <label className="block text-xs font-medium text-ink-light mb-1" htmlFor={`ship-${key}`}>
              {label}
            </label>
            {type === 'select' ? (
              <select
                id={`ship-${key}`}
                value={shipping[key]}
                onChange={(e) => dispatch({ type: 'SET_SHIPPING_FIELD', field: key, value: e.target.value })}
                autoComplete={autoComplete}
                className={`input-field ${errors[key] ? '!border-danger' : ''}`}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`ship-${key}`}
                type="text"
                value={shipping[key]}
                onChange={(e) => dispatch({ type: 'SET_SHIPPING_FIELD', field: key, value: e.target.value })}
                placeholder={placeholder}
                autoComplete={autoComplete}
                inputMode={key === 'phone' ? 'numeric' : undefined}
                className={`input-field ${errors[key] ? '!border-danger' : ''}`}
              />
            )}
            {errors[key] && <p className="text-danger text-xs mt-0.5">{errors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <button type="submit" className="btn-primary !px-8">
          Continue to payment
        </button>
      </div>
    </form>
  );
}
