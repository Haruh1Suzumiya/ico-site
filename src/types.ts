export interface ICOData {
  id: string;
  name: string;
  description: string;
  price: number;
  symbol: string;
  start_date: string;
  end_date: string;
  total_supply: number;
  contract_id: bigint;
  header_image_url: string;
  icon_image_url: string;
  min_purchase: number;
  max_purchase: number;
  is_active: boolean;
  is_visible: boolean;
  created_at: string;
}

export interface ICODetails {
  markdown_content: string;
  twitter_url?: string;
  discord_url?: string;
  instagram_url?: string;
  website_url?: string;
  whitepaper_url?: string;
}

export interface ExtendedICOData extends ICOData {
  details: ICODetails;
}

export interface Purchase {
  id: string;
  user_id: string;
  ico_id: string;
  amount: number;
  price_per_token: number;
  tx_hash: string;
  created_at: string;
  icos: {
    name: string;
    symbol: string;
    price: number;
    icon_image_url?: string;
  };
}