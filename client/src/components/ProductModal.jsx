import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';
import ImagePicker from './admin/ImagePicker';

export default function ProductModal({ product, onClose, onSaved }) {
  const { addToast } = useToast();
  const isEdit = !!product;

  const [form, setForm] = useState({
    name: '', description: '', price: '', category: '', imageUrl: '', stock: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description,
        price: String(product.price),
        category: product.category,
        imageUrl: product.imageUrl,
        stock: String(product.stock),
      });
    }
  }, [product]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.description.trim()) errs.description = 'Required';
    if (!form.price || isNaN(form.price) || Number(form.price) < 0) errs.price = 'Enter a valid price';
    if (!form.category.trim()) errs.category = 'Required';
    if (!form.imageUrl.trim()) errs.imageUrl = 'Required';
    if (form.stock === '' || isNaN(form.stock) || Number(form.stock) < 0) errs.stock = 'Enter a valid number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category.trim(),
      imageUrl: form.imageUrl.trim(),
      stock: parseInt(form.stock, 10),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.updateProduct(product._id, payload);
        addToast('Product updated');
      } else {
        await api.createProduct(payload);
        addToast('Product created');
      }
      await onSaved?.();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'name', label: 'Name', type: 'text', placeholder: 'Product name' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description' },
    { key: 'price', label: 'Price', type: 'number', placeholder: '0.00' },
    { key: 'category', label: 'Category', type: 'text', placeholder: 'e.g. Ninjago' },
    { key: 'stock', label: 'Stock', type: 'number', placeholder: '0' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-card w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-modal anim-scale">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-heading text-lg text-ink">{isEdit ? 'Edit product' : 'New product'}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-alt text-ink-light hover:text-ink transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-3.5">
          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-ink-light mb-1" htmlFor={`f-${key}`}>
                {label}
              </label>
              {type === 'textarea' ? (
                <textarea
                  id={`f-${key}`}
                  value={form[key]}
                  onChange={onChange(key)}
                  placeholder={placeholder}
                  rows={2}
                  className={`input-field resize-none ${errors[key] ? '!border-danger' : ''}`}
                />
              ) : (
                <input
                  id={`f-${key}`}
                  type={type}
                  step={type === 'number' ? '0.01' : undefined}
                  min={type === 'number' ? '0' : undefined}
                  value={form[key]}
                  onChange={onChange(key)}
                  placeholder={placeholder}
                  className={`input-field ${errors[key] ? '!border-danger' : ''}`}
                />
              )}
              {errors[key] && <p className="text-danger text-xs mt-0.5">{errors[key]}</p>}
            </div>
          ))}

          <div>
            <ImagePicker
              value={form.imageUrl}
              onChange={(url) => {
                setForm((prev) => ({ ...prev, imageUrl: url }));
                if (errors.imageUrl) setErrors((prev) => ({ ...prev, imageUrl: null }));
              }}
            />
            {errors.imageUrl && <p className="text-danger text-xs mt-0.5">{errors.imageUrl}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
