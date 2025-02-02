/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_CONTRACT_ADDRESS: string
    readonly VITE_USDT_ADDRESS: string
    readonly VITE_WALLET_CONNECT_PROJECT_ID: string
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
  