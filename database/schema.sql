-- ユーザープロフィール
CREATE TABLE profiles (
  id uuid references auth.users primary key,
  username text,
  wallet_address text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- ICO情報
CREATE TABLE icos (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  symbol text not null,
  description text,
  price numeric not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  total_supply numeric not null,
  header_image_url text,
  icon_image_url text,
  contract_id bigint not null,
  is_active boolean default true,
  min_purchase numeric not null default 0,
  max_purchase numeric not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ICOの詳細情報
CREATE TABLE ico_details (
  id uuid primary key default uuid_generate_v4(),
  ico_id uuid references icos not null,
  markdown_content text,
  twitter_url text,
  discord_url text,
  instagram_url text,
  website_url text,
  whitepaper_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 販売フェーズ
CREATE TABLE sale_phases (
  id uuid primary key default uuid_generate_v4(),
  ico_id uuid references icos not null,
  phase_number integer not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  price numeric not null,
  max_allocation numeric not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ベスティングスケジュール
CREATE TABLE vesting_schedules (
  id uuid primary key default uuid_generate_v4(),
  ico_id uuid references icos not null,
  release_date timestamp with time zone not null,
  release_percent numeric not null,
  created_at timestamp with time zone default now()
);

-- 管理者テーブル
CREATE TABLE admins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default now(),
  role_type text not null default 'ADMIN' -- 'OWNER', 'ADMIN'など
);

-- ブラックリスト
CREATE TABLE blacklist (
  id uuid primary key default uuid_generate_v4(),
  wallet_address text not null unique,
  reason text,
  added_by uuid references auth.users not null,
  created_at timestamp with time zone default now()
);

-- 購入履歴
CREATE TABLE purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  ico_id uuid references icos not null,
  phase_id uuid references sale_phases,
  amount numeric not null,
  price_per_token numeric not null,
  tx_hash text not null,
  status text not null default 'PENDING',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- インデックス
CREATE INDEX idx_icos_contract_id ON icos(contract_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_ico_id ON purchases(ico_id);
CREATE INDEX idx_sale_phases_ico_id ON sale_phases(ico_id);
CREATE INDEX idx_vesting_schedules_ico_id ON vesting_schedules(ico_id);
CREATE INDEX idx_blacklist_wallet_address ON blacklist(wallet_address);

-- トリガー関数: updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガーの適用
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_icos_updated_at
    BEFORE UPDATE ON icos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ico_details_updated_at
    BEFORE UPDATE ON ico_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_phases_updated_at
    BEFORE UPDATE ON sale_phases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシー
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE icos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ico_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vesting_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;

-- プロフィールのポリシー
CREATE POLICY "プロフィールは本人のみ編集可能"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "プロフィールは本人のみ閲覧可能"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- ICO情報のポリシー
CREATE POLICY "ICO情報は全ユーザーが閲覧可能"
    ON icos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "ICO情報は管理者のみ編集可能"
    ON icos FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE user_id = auth.uid()
        )
    );

-- ICO詳細情報のポリシー
CREATE POLICY "ICO詳細情報は全ユーザーが閲覧可能"
    ON ico_details FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "ICO詳細情報は管理者のみ編集可能"
    ON ico_details FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE user_id = auth.uid()
        )
    );

-- 販売フェーズのポリシー
CREATE POLICY "販売フェーズは全ユーザーが閲覧可能"
    ON sale_phases FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "販売フェーズは管理者のみ編集可能"
    ON sale_phases FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE user_id = auth.uid()
        )
    );

-- ベスティングスケジュールのポリシー
CREATE POLICY "ベスティングスケジュールは全ユーザーが閲覧可能"
    ON vesting_schedules FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "ベスティングスケジュールは管理者のみ編集可能"
    ON vesting_schedules FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE user_id = auth.uid()
        )
    );

-- 購入履歴のポリシー
CREATE POLICY "購入履歴は本人のみ閲覧可能"
    ON purchases FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "管理者は全ての購入履歴を閲覧可能"
    ON purchases FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE user_id = auth.uid()
        )
    );

-- ブラックリストのポリシー
CREATE POLICY "ブラックリストは管理者のみアクセス可能"
    ON blacklist FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admins
            WHERE user_id = auth.uid()
        )
    );

-- 関数: ICOの有効性チェック
CREATE OR REPLACE FUNCTION check_ico_valid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_date >= NEW.end_date THEN
        RAISE EXCEPTION 'start_date must be before end_date';
    END IF;
    
    IF NEW.min_purchase >= NEW.max_purchase THEN
        RAISE EXCEPTION 'min_purchase must be less than max_purchase';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ICO作成時の有効性チェックトリガー
CREATE TRIGGER check_ico_validity
    BEFORE INSERT OR UPDATE ON icos
    FOR EACH ROW
    EXECUTE FUNCTION check_ico_valid();

-- 関数: 販売フェーズの重複チェック
CREATE OR REPLACE FUNCTION check_phase_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM sale_phases
        WHERE ico_id = NEW.ico_id
        AND id != NEW.id
        AND (
            (NEW.start_date BETWEEN start_date AND end_date)
            OR (NEW.end_date BETWEEN start_date AND end_date)
            OR (start_date BETWEEN NEW.start_date AND NEW.end_date)
        )
    ) THEN
        RAISE EXCEPTION 'Phase dates overlap with existing phases';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 販売フェーズの重複チェックトリガー
CREATE TRIGGER check_phase_overlapping
    BEFORE INSERT OR UPDATE ON sale_phases
    FOR EACH ROW
    EXECUTE FUNCTION check_phase_overlap();

-- 関数: ベスティングの合計パーセンテージチェック
CREATE OR REPLACE FUNCTION check_vesting_total_percent()
RETURNS TRIGGER AS $$
DECLARE
    total_percent numeric;
BEGIN
    SELECT COALESCE(SUM(release_percent), 0)
    INTO total_percent
    FROM vesting_schedules
    WHERE ico_id = NEW.ico_id;

    total_percent := total_percent + NEW.release_percent;
    
    IF total_percent > 100 THEN
        RAISE EXCEPTION 'Total vesting percentage cannot exceed 100%%';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ベスティングパーセンテージチェックトリガー
CREATE TRIGGER check_vesting_percent
    BEFORE INSERT OR UPDATE ON vesting_schedules
    FOR EACH ROW
    EXECUTE FUNCTION check_vesting_total_percent();