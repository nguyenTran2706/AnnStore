import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const GUEST_KEY = 'annz_guest_cart';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

const readGuestCart = () => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY)) || [];
  } catch {
    return [];
  }
};

const writeGuestCart = (items) => localStorage.setItem(GUEST_KEY, JSON.stringify(items));

/* Server cart items are populated CartItem docs; guest items are product
   snapshots. Both are normalized to one shape so the UI renders a single way:
   { _id, productId, name, price, imageUrl, stock, quantity } */
const normalizeServerItem = (i) => ({
  _id: i._id,
  productId: i.productId._id,
  name: i.productId.name,
  price: i.productId.price,
  imageUrl: i.productId.imageUrl,
  stock: i.productId.stock,
  quantity: i.quantity,
});

export function CartProvider({ children }) {
  const { user, initializing } = useAuth();
  const { addToast } = useToast();

  const [items, setItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api.fetchCart();
    setItems(data.map(normalizeServerItem));
  }, []);

  // On login: merge the guest cart into the server cart, then mirror the server.
  // On logout (or as guest): mirror localStorage.
  useEffect(() => {
    if (initializing) return;

    const sync = async () => {
      if (user) {
        // Claim the guest cart synchronously (before any await) so a
        // double-fired effect can't merge the same items twice.
        const guest = readGuestCart();
        if (guest.length > 0) localStorage.removeItem(GUEST_KEY);
        try {
          if (guest.length > 0) {
            const merged = await api.mergeCart(
              guest.map(({ productId, quantity }) => ({ productId, quantity }))
            );
            setItems(merged.map(normalizeServerItem));
          } else {
            await refresh();
          }
        } catch {
          if (guest.length > 0) writeGuestCart(guest);
          addToast('Failed to load cart', 'error');
        }
      } else {
        setItems(readGuestCart());
      }
    };
    sync();
  }, [user, initializing, refresh, addToast]);

  const addToCart = async (product, quantity = 1) => {
    try {
      if (user) {
        await api.addToCart(product._id, quantity);
        await refresh();
      } else {
        const guest = readGuestCart();
        const existing = guest.find((i) => i.productId === product._id);
        const requested = (existing ? existing.quantity : 0) + quantity;
        if (requested > product.stock) {
          addToast(`Only ${product.stock} in stock`, 'error');
          return false;
        }
        let next;
        if (existing) {
          next = guest.map((i) =>
            i.productId === product._id ? { ...i, quantity: requested } : i
          );
        } else {
          next = [
            {
              _id: product._id,
              productId: product._id,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
              stock: product.stock,
              quantity,
            },
            ...guest,
          ];
        }
        writeGuestCart(next);
        setItems(next);
      }
      addToast('Added to cart');
      return true;
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add to cart', 'error');
      return false;
    }
  };

  const updateQty = async (item, quantity) => {
    if (quantity < 1) return removeItem(item);
    if (quantity > item.stock) {
      addToast(`Only ${item.stock} in stock`, 'error');
      return;
    }
    try {
      if (user) {
        await api.updateCartItem(item._id, quantity);
        await refresh();
      } else {
        const next = readGuestCart().map((i) =>
          i.productId === item.productId ? { ...i, quantity } : i
        );
        writeGuestCart(next);
        setItems(next);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update quantity', 'error');
    }
  };

  const removeItem = async (item) => {
    try {
      if (user) {
        await api.removeCartItem(item._id);
        await refresh();
      } else {
        const next = readGuestCart().filter((i) => i.productId !== item.productId);
        writeGuestCart(next);
        setItems(next);
      }
      addToast('Removed from cart');
    } catch {
      addToast('Failed to remove item', 'error');
    }
  };

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        subtotal,
        cartOpen,
        setCartOpen,
        addToCart,
        updateQty,
        removeItem,
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
