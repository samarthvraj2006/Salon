export * from './constants';
export * from './schemas';

export type HomeFeedCardType =
  | 'NextAppointmentCard'
  | 'HeroCard'
  | 'PromoBannerCarousel'
  | 'CategoryGrid'
  | 'NearbySalonsCarousel'
  | 'OfferCard'
  | 'TrendingServiceCard'
  | 'TopRatedSalonCard'
  | 'BookAgainCard'
  | 'NewOnSalonSlotCard'
  | 'QuickSlotCard'
  | 'TipCard'
  | 'ReferralCard';

export type HomeFeedCard = {
  type: HomeFeedCardType;
  id: string;
  payload: Record<string, unknown>;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
