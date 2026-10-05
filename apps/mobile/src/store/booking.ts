import { create } from 'zustand';

type BookingDraft = {
  salonId?: string;
  salonName?: string;
  serviceIds: string[];
  services: { id: string; name: string; priceInr: number; durationMin: number }[];
  staffId?: string | null;
  staffName?: string;
  date?: string;
  startTime?: string;
  paymentMethod: 'PAY_AT_SALON' | 'ONLINE';
  couponCode?: string;
  discount?: number;
};

type DraftState = BookingDraft & {
  reset: () => void;
  setSalon: (salonId: string, salonName: string) => void;
  toggleService: (svc: BookingDraft['services'][0]) => void;
  setStaff: (staffId: string | null, staffName: string) => void;
  setSlot: (date: string, startTime: string) => void;
  setPayment: (method: BookingDraft['paymentMethod']) => void;
  setCoupon: (code?: string, discount?: number) => void;
};

const empty: BookingDraft = {
  serviceIds: [],
  services: [],
  paymentMethod: 'PAY_AT_SALON',
  staffId: null,
};

export const useBookingDraft = create<DraftState>((set, get) => ({
  ...empty,
  reset: () => set({ ...empty }),
  setSalon: (salonId, salonName) => set({ salonId, salonName, ...empty, paymentMethod: 'PAY_AT_SALON' }),
  toggleService: (svc) => {
    const cur = get().services;
    const exists = cur.find((s) => s.id === svc.id);
    const services = exists ? cur.filter((s) => s.id !== svc.id) : [...cur, svc];
    set({ services, serviceIds: services.map((s) => s.id) });
  },
  setStaff: (staffId, staffName) => set({ staffId, staffName }),
  setSlot: (date, startTime) => set({ date, startTime }),
  setPayment: (paymentMethod) => set({ paymentMethod }),
  setCoupon: (couponCode, discount) => set({ couponCode, discount }),
}));
