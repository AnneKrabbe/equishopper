export type InboxMessage = {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
};

export type InboxListingImage = {
  image_url: string;
  sort_order: number | null;
};

export type InboxListing = {
  id: string;
  title: string;
  listing_images: InboxListingImage[];
};

export type InboxProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type InboxConversation = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string | null;
  listing: InboxListing | null;
  messages: InboxMessage[];
  otherProfile: InboxProfile | null;
};