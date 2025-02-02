export interface ICOData {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url?: string;
    symbol: string;
    start_date: string;
    end_date: string;
    total_supply: number;
    contract_id: bigint;
  }
  
  export interface Purchase {
    id: string;
    user_id: string;
    ico_id: string;
    amount: bigint;
    price_per_token: bigint;
    created_at: string;
    icos: {
      name: string;
      symbol: string;
      price: number;
    };
  }
  