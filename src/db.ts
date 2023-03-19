import { addDays, formatISO } from "date-fns";
import {
  DayPrices,
  FuelType,
  mapPrevPriceDto,
  mapPrice,
  mapPriceDto,
  Price,
  PriceDto,
} from "./types";

export class PriceRepository {
  private readonly db: D1Database;
  constructor(db: D1Database) {
    this.db = db;
  }

  async getPricesForDate(
    fuelType: FuelType,
    date: Date
  ): Promise<DayPrices | null> {
    const yesterday = addDays(date, -1);
    const tomorrow = addDays(date, 1);

    const prices = await this.getPricesBetweenDates(
      fuelType,
      yesterday,
      tomorrow
    );
    const dayPrices: DayPrices = {
      today: null,
      tomorrow: null,
      yesterday: null,
    };
    if (prices.length === 0) {
      return dayPrices;
    }

    for (let i = 0; i < prices.length; i++) {
      const price = prices[i];
      if (price.date.getDate() === date.getDate()) {
        dayPrices.today = price;
      } else if (price.date.getDate() === yesterday.getDate()) {
        dayPrices.yesterday = price;
      } else if (price.date.getDate() === tomorrow.getDate()) {
        dayPrices.tomorrow = price;
      }
    }
    if (!dayPrices.today) {
      return null;
    }
    return dayPrices;
  }

  async getPricesBetweenDates(
    fuelType: FuelType,
    from: Date,
    to: Date
  ): Promise<Price[]> {
    const pricesResp = await this.db
      .prepare(
        "SELECT * FROM fuelprices WHERE fueltype = ? AND date between ? and ?"
      )
      .bind(fuelType, formatISO(from), formatISO(to))
      .all<PriceDto>();
    if (pricesResp.error) {
      throw new Error(pricesResp.error);
    }
    const priceDtos = pricesResp.results ?? [];
    const prices = priceDtos.map(mapPrice);
    return prices;
  }

  async getPrices(fuelType: FuelType): Promise<Price[]> {
    const pricesResp = await this.db
      .prepare("SELECT * FROM fuelprices WHERE fueltype = ?")
      .bind(fuelType)
      .all<PriceDto>();
    if (pricesResp.error) {
      throw new Error(pricesResp.error);
    }
    const priceDtos = pricesResp.results ?? [];
    const prices = priceDtos.map((x) => mapPrice(x));
    return prices;
  }

  async upsertPrices(prices: Price[]): Promise<void> {
    if (prices.length === 0) {
      return;
    }

    const stmt = this.db.prepare(
      `INSERT INTO fuelprices (fueltype, date, price, prevPrices)
                                    VALUES (?, ?, ?, ?)
                                    ON CONFLICT(fueltype,date)
                                    DO UPDATE SET price = excluded.price, prevPrices = excluded.prevPrices`
    );

    const statements: D1PreparedStatement[] = prices.map((price) => {
      const dto = mapPriceDto(price);
      return stmt.bind(dto.fuelType, dto.date, dto.price, dto.prevPrices);
    });
    const resp = await this.db.batch(statements);
    if (resp.some((x) => x.error)) {
      throw new Error(resp.find((x) => !!x.error)?.error);
    }
  }
}
