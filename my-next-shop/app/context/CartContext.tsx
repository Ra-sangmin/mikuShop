"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  id: number;
  url: string;
  price: number;
  quantity: number;
  option: string;
  request: string;
  photoService: string;
  packingService: string;
  category: string;
  status: string;
  date: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: Omit<CartItem, 'id' | 'date' | 'status'>) => void;
  removeFromCart: (id: number) => void;
  updateItemStatus: (ids: number[], newStatus: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<CartItem, 'id' | 'date' | 'status'>) => {
    const newItem: CartItem = {
      ...item,
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      status: '장바구니'
    };
    setCartItems(prev => [...prev, newItem]);
  };

  const removeFromCart = (id: number) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateItemStatus = (ids: number[], newStatus: string) => {
    setCartItems(prev => prev.map(item => 
      ids.includes(item.id) ? { ...item, status: newStatus } : item
    ));
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateItemStatus }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
