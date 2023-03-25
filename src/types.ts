import { format, formatISO, parseISO } from "date-fns";

export type Env = {
  DB: D1Database;
  JOB_KEY: string;
};

export type FuelType = "Unleaded95" | "Octane100" | "Diesel";

export function fuelTypeToOkItemNumber(f: FuelType): number {
  switch (f) {
    case "Octane100":
      return 533;
    case "Diesel":
      return 231;
    default:
      return 536;
  }
}

export interface PreviousPrice {
  detectionTimestamp: Date;
  price: number;
}
export function mapPrevPriceDto(prevPrice: PreviousPrice): PreviousPriceDto {
  return {
    ...prevPrice,
    detectionTimestamp: formatISO(prevPrice.detectionTimestamp),
  };
}
export interface PreviousPriceDto {
  detectionTimestamp: string;
  price: number;
}
export function mapPrevPrice(prevPriceDto: PreviousPriceDto): PreviousPrice {
  return {
    ...prevPriceDto,
    detectionTimestamp: parseISO(prevPriceDto.detectionTimestamp),
  };
}

export interface Price {
  fueltype: FuelType;
  date: Date;
  price: number;
  prevPrices: PreviousPrice[];
}
export function mapPriceDto(price: Price): PriceDto {
  const prevPriceDtos = price.prevPrices.map(mapPrevPriceDto);
  return {
    ...price,
    date: formatISO(price.date),
    prevPrices: JSON.stringify(prevPriceDtos),
  };
}
export interface PriceDto {
  fueltype: FuelType;
  date: string;
  price: number;
  prevPrices: string;
}
export function mapPrice(priceDto: PriceDto): Price {
  let prevPriceDtos: PreviousPriceDto[] = [];
  try {
    prevPriceDtos = JSON.parse(priceDto.prevPrices) as PreviousPriceDto[];
  } catch (error) {
    console.error("mapPrice failed", error, priceDto);
  }
  return {
    ...priceDto,
    date: parseISO(priceDto.date),
    prevPrices: prevPriceDtos.map(mapPrevPrice),
  };
}

export interface DayPrices {
  today: Price | null;
  yesterday: Price | null;
  tomorrow: Price | null;
}
