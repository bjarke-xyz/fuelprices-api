import { format, parseISO } from "date-fns";
import { PriceRepository } from "./db";
import {
  FuelType,
  fuelTypeToOkItemNumber,
  PreviousPrice,
  Price,
} from "./types";

interface OkPriceHistoryItem {
  dato: string;
  pris: number;
}

interface OkPriceHistoryResponse {
  visPriserFor1000Liter: boolean;
  historik: OkPriceHistoryItem[];
}

export class DataFetcher {
  constructor(private readonly priceRepository: PriceRepository) {}

  public async fetchData(): Promise<void> {
    const allFuelTypes: FuelType[] = ["Diesel", "Octane100", "Unleaded95"];
    for (const fuelType of allFuelTypes) {
      await this.processOkPrices(fuelType);
    }
  }

  public async processOkPrices(fuelType: FuelType): Promise<void> {
    try {
      const jsonStr = await this.fetchOkJsonFromSource(fuelType);
      const prices = await this.processOkJson(fuelType, jsonStr);
      await this.storeProcessedOkPrices(fuelType, prices);
    } catch (error) {
      console.error("ok failed", error);
    }
  }

  private async fetchOkJsonFromSource(fuelType: FuelType): Promise<string> {
    const url =
      "https://www.ok.dk/privat/produkter/ok-kort/prisudvikling/getProduktHistorik";
    const requestBody = {
      varenr: fuelTypeToOkItemNumber(fuelType),
      pumpepris: "true",
    };
    const resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (resp.status > 299) {
      console.error(`fetch ok json failed: ${resp.status}`);
      throw new Error(`OK returned ${resp.status}`);
    }
    const jsonStr = await resp.text();
    return jsonStr;
  }

  private async processOkJson(
    fuelType: FuelType,
    jsonStr: string
  ): Promise<Price[]> {
    const okPriceResp: OkPriceHistoryResponse = JSON.parse(jsonStr);

    const dateFormat = "yyyy-MM-dd";

    const currentPrices = await this.priceRepository.getPrices(fuelType);
    const currentPricesByDate: Record<string, Price> = {};
    for (const price of currentPrices) {
      try {
        currentPricesByDate[format(price.date, dateFormat)] = price;
      } catch (error) {
        console.error(
          `currentPrices loop error: ${JSON.stringify(price)}`,
          error
        );
      }
    }
    const prices: Price[] = [];
    for (const okPrice of okPriceResp.historik) {
      try {
        const dateObj = parseISO(okPrice.dato);
        const currentPrice = currentPricesByDate[format(dateObj, dateFormat)];
        const prevPrices: PreviousPrice[] = [];
        // includePrice is used to check if we should update/insert this price at all
        let includePrice = false;
        if (currentPrice) {
          // We found a currentPrice, so carry its prevPrices along
          for (const prevPrice of currentPrice.prevPrices) {
            prevPrices.push(prevPrice);
          }
          if (currentPrice.price != okPrice.pris) {
            // The price for a rleady known date has changed, so it's an updated price
            includePrice = true;
            prevPrices.push({
              detectionTimestamp: new Date(),
              price: currentPrice.price,
            });
          }
        } else {
          // We did not find a price for this timestamp in the db, so it's a new price
          includePrice = true;
        }
        if (includePrice) {
          const price: Price = {
            fueltype: fuelType,
            date: dateObj,
            price: okPrice.pris,
            prevPrices: prevPrices,
          };
          prices.push(price);
        }
      } catch (error) {
        console.error(`loop in error: ${JSON.stringify(okPrice)} //`, error);
      }
    }

    return prices;
  }

  private async storeProcessedOkPrices(
    fuelType: FuelType,
    prices: Price[]
  ): Promise<void> {
    console.log(
      `OK data job: Found ${prices.length} new prices for ${fuelType}`
    );
    await this.priceRepository.upsertPrices(prices);
  }
}
