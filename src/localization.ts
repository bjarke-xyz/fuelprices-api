import { DayPrices, FuelType, Price } from "./types";

export type Language = "da" | "en";

export function getErrorText(l: Language): string {
  switch (l) {
    case "da":
      return "Der blev ikke fundet priser for den dato";
    default:
      return "No prices were found for that date";
  }
}

export function getText(
  l: Language,
  prices: DayPrices,
  fuelType: FuelType
): string {
  switch (l) {
    case "da":
      return getTextDanish(prices, fuelType);
    default:
      return getTextEnglish(prices, fuelType);
  }
}

function getTextEnglish(prices: DayPrices, fuelType: FuelType): string {
  const lang: Language = "en";
  let text = `Today, the price of ${fuelTypeString(lang, fuelType)} is ${
    prices.today!.price
  } kroner.`;
  if (prices.yesterday && prices.yesterday.price > 0) {
    const diffText = getDiffText(lang, prices.today!, prices.yesterday);
    text = `${text} Yesterday the price was ${diffText}: ${prices.yesterday.price} kroner.`;
  }
  if (prices.tomorrow && prices.tomorrow.price > 0) {
    const diffText = getDiffText(lang, prices.today!, prices.tomorrow);
    text = `${text} Tomorrow the price will be ${diffText}: ${prices.tomorrow.price} kroner.`;
  }
  return text;
}

function getTextDanish(prices: DayPrices, fuelType: FuelType): string {
  const lang: Language = "da";
  let { kroner, orer, error } = priceToKronerAndOrer(prices.today!);
  if (error) {
    console.error("failed to convert today price to kroner and orer", error);
    return getErrorText(lang);
  }

  let text = `${fuelTypeString(
    lang,
    fuelType
  )} koster ${kroner} kroner og ${orer} ører i dag.`;
  if (prices.yesterday && prices.yesterday.price > 0) {
    let { kroner, orer, error } = priceToKronerAndOrer(prices.yesterday);
    if (error) {
      console.error(
        "failed to convert yesterday price to kroner and orer",
        error
      );
      return getErrorText(lang);
    }
    const diffText = getDiffText(lang, prices.today!, prices.yesterday);
    text = `${text} I går var prisen ${diffText}: ${kroner} kroner og ${orer} ører.`;
  }
  if (prices.tomorrow && prices.tomorrow.price > 0) {
    let { kroner, orer, error } = priceToKronerAndOrer(prices.tomorrow);
    if (error) {
      console.error(
        "failed to convert tomorrow price to kroner and orer",
        error
      );
      return getErrorText(lang);
    }
    const diffText = getDiffText(lang, prices.today!, prices.tomorrow);
    text = `${text} I morgen vil prisen være ${diffText}: ${kroner} kroner og ${orer} ører.`;
  }
  return text;
}

function getDiffText(l: Language, today: Price, otherDay: Price): string {
  switch (l) {
    case "da":
      if (otherDay.price > today.price) {
        return "højere";
      } else if (otherDay.price < today.price) {
        return "lavere";
      } else {
        return "den samme";
      }
    default:
      if (otherDay.price > today.price) {
        return "higher";
      } else if (otherDay.price < today.price) {
        return "lower";
      } else {
        return "the same";
      }
  }
}

interface KronerAndOrerResponse {
  kroner: string;
  orer: string;
  error?: string;
}
function priceToKronerAndOrer(price: Price): KronerAndOrerResponse {
  const parts = price.price.toString().split(".");
  if (parts.length != 2) {
    return {
      kroner: "",
      orer: "",
      error: `Failed to parse price: ${price.price}`,
    };
  }
  const kronerNumber = parseInt(parts[0]);
  if (isNaN(kronerNumber)) {
    return {
      kroner: "",
      orer: "",
      error: `Failed to parse kroner: ${parts[0]}`,
    };
  }
  const kroner = kronerNumber.toFixed(0);
  let orer = parts[1].trimStart();
  while (orer.startsWith("0")) {
    orer = orer.substring(1);
  }
  return {
    kroner,
    orer,
  };
}

function fuelTypeString(l: Language, fuelType: FuelType): string {
  switch (l) {
    case "da": {
      switch (fuelType) {
        case "Octane100":
          return "Oktan 100";
        case "Diesel":
          return "Diesel";
        default:
          return "Blyfri oktan 95";
      }
    }
    default: {
      switch (fuelType) {
        case "Octane100":
          return "Octane 100";
        case "Diesel":
          return "Diesel";
        default:
          return "Unleaed octane 95";
      }
    }
  }
}
