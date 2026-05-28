export interface PricePoint {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjClose: number | null;
  volume: number | null;
}

export interface EarningRow {
  date: string;
  epsEstimate: number | null;
  epsActual: number | null;
  surprisePct: number | null;
}

export interface StatementPeriod {
  period: string; // ISO date YYYY-MM-DD
  items: Record<string, number | null>;
}

export interface Statement {
  annual: StatementPeriod[];
  quarterly: StatementPeriod[];
}

export interface TickerInfo {
  marketCap?: number | null;
  enterpriseValue?: number | null;
  trailingPE?: number | null;
  forwardPE?: number | null;
  priceToBook?: number | null;
  priceToSalesTrailing12Months?: number | null;
  pegRatio?: number | null;
  trailingEps?: number | null;
  forwardEps?: number | null;
  profitMargins?: number | null;
  operatingMargins?: number | null;
  grossMargins?: number | null;
  ebitdaMargins?: number | null;
  returnOnAssets?: number | null;
  returnOnEquity?: number | null;
  revenueGrowth?: number | null;
  earningsGrowth?: number | null;
  earningsQuarterlyGrowth?: number | null;
  totalRevenue?: number | null;
  ebitda?: number | null;
  netIncomeToCommon?: number | null;
  totalCash?: number | null;
  totalDebt?: number | null;
  freeCashflow?: number | null;
  operatingCashflow?: number | null;
  dividendYield?: number | null;
  dividendRate?: number | null;
  payoutRatio?: number | null;
  beta?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  fiftyDayAverage?: number | null;
  twoHundredDayAverage?: number | null;
  averageVolume?: number | null;
  regularMarketPrice?: number | null;
  currentPrice?: number | null;
  targetMeanPrice?: number | null;
  targetHighPrice?: number | null;
  targetLowPrice?: number | null;
  recommendationMean?: number | null;
  recommendationKey?: string | null;
  numberOfAnalystOpinions?: number | null;
  sharesOutstanding?: number | null;
  floatShares?: number | null;
  bookValue?: number | null;
  longBusinessSummary?: string;
  shortName?: string;
  longName?: string;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  website?: string;
  country?: string;
  city?: string;
}

export interface TickerData {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  exchange: string | null;
  currency: string | null;
  asOf: string;
  info: TickerInfo;
  income: Statement;
  balance: Statement;
  cashflow: Statement;
  earnings: EarningRow[];
  prices: PricePoint[];
}

export interface IndexEntry {
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  asOf: string | null;
}

export interface IndexFile {
  generatedAt: string;
  tickers: IndexEntry[];
}

export type FaTab = "fa" | "ta";
