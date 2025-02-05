/**
 * date.ts
 * 日付処理に関するユーティリティ関数群
 * すべての日時処理をJST（UTC+9）ベースで扱うためのヘルパー関数を提供
 */

// JSTのタイムゾーンオフセット（ミリ秒）
const JST_OFFSET = 9 * 60 * 60 * 1000;

/**
 * UTC日時文字列をJST日時文字列に変換
 */
export const convertToJST = (utcString: string): string => {
  const date = new Date(utcString);
  return new Date(date.getTime() + JST_OFFSET).toISOString();
};

/**
 * JST日時文字列をUTC日時文字列に変換
 */
export const convertToUTC = (jstString: string): string => {
  const date = new Date(jstString);
  return new Date(date.getTime() - JST_OFFSET).toISOString();
};

/**
 * 日付文字列をJST基準に変換する
 */
export const toJSTString = (date: Date): string => {
  const jstDate = new Date(date.getTime() + JST_OFFSET);
  return jstDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm形式
};

/**
 * JSTの現在時刻を取得
 * ブラウザのローカル時間に関係なく、常にJST（UTC+9）の時刻を返す
 */
export const getJSTNow = (): Date => {
  const now = new Date();
  // UTC時刻をJST（UTC+9）に変換
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + JST_OFFSET);
};

/**
 * 日付をJST表示用にフォーマット
 * 例: "2024-02-06 15:30"
 */
export const formatJSTDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo'
  });
};

/**
 * 日付文字列をJSTとして解釈してDateオブジェクトを返す
 * データベースから取得した日時文字列をJSTとして正しく解釈するために使用
 */
export const parseJSTDateTime = (dateString: string): Date => {
  const parsed = new Date(dateString);
  return new Date(parsed.getTime() - JST_OFFSET);
};

/**
 * 日付がJST基準で現在よりも未来かどうかを判定
 */
export const isFutureJST = (dateString: string): boolean => {
  const targetDate = parseJSTDateTime(dateString);
  const now = getJSTNow();
  return targetDate > now;
};

/**
 * 日付がJST基準で現在よりも過去かどうかを判定
 */
export const isPastJST = (dateString: string): boolean => {
  const targetDate = parseJSTDateTime(dateString);
  const now = getJSTNow();
  return targetDate < now;
};

/**
 * 2つの日付間のJST基準での時間差を取得（ミリ秒）
 */
export const getJSTTimeDifference = (date1: string, date2: string): number => {
  const d1 = parseJSTDateTime(date1);
  const d2 = parseJSTDateTime(date2);
  return d2.getTime() - d1.getTime();
};

/**
 * 日付文字列から時間部分のみを抽出してJST表示用にフォーマット
 * 例: "15:30"
 */
export const formatJSTTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Tokyo'
  });
};

/**
 * 日付文字列から日付部分のみを抽出してJST表示用にフォーマット
 * 例: "2024-02-06"
 */
export const formatJSTDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo'
  });
};