import { addDays, parse, startOfDay } from "date-fns";
import { Context, Hono, HonoRequest } from "hono";
import { cors } from "hono/cors";
import { DataFetcher } from "./data-fetcher";
import { PriceRepository } from "./db";
import { getErrorText, getText, Language } from "./localization";
import { Env, FuelType } from "./types";

export const h = new Hono<{ Bindings: Env }>();
h.use("*", cors());

export async function scheduled(env: Env) {
  const priceRepository = new PriceRepository(env.DB);
  const dataFetcher = new DataFetcher(priceRepository);
  await dataFetcher.fetchData();
}

h.get("/prices", async (c) => {
  const args = parseArguments(c.req);
  const priceRepository = new PriceRepository(c.env.DB);
  try {
    const prices = await priceRepository.getPricesForDate(
      args.fuelType,
      args.date
    );
    if (!prices) {
      return createError(c, getErrorText(args.language));
    }
    return c.json({
      message: getText(args.language, prices, args.fuelType),
      prices,
    });
  } catch (error) {
    return createError(c, getErrorText(args.language), JSON.stringify(error));
  }
});

h.get("/prices/all", async (c) => {
  const from = parseDate(
    c.req.query("from"),
    startOfDay(addDays(new Date(), -1))
  );
  const to = parseDate(c.req.query("to"), startOfDay(new Date()));
  const fuelType = parseFuelType(c.req.query("type"));
  const priceRepository = new PriceRepository(c.env.DB);
  try {
    const prices = await priceRepository.getPricesBetweenDates(
      fuelType,
      from,
      to
    );
    if (!prices) {
      return createError(c, "could not get prices");
    }
    return c.json(prices);
  } catch (error) {
    return createError(c, "get all prices failed", JSON.stringify(error));
  }
});

h.get("/job", async (c) => {
  if (c.env.JOB_KEY !== c.req.query("key")) {
    return c.json("missing key", 401);
  }
  await scheduled(c.env);
  return c.json("job done");
});

function createError(c: Context, msg: string, error?: string): Response {
  if (error) {
    console.error("error", error);
  }
  return c.json({
    message: msg,
    error: msg,
  });
}

interface GetPricesArguments {
  date: Date;
  fuelType: FuelType;
  language: Language;
}
function parseArguments(req: HonoRequest<any>): GetPricesArguments {
  return {
    date: parseDate(req.query("now"), startOfDay(new Date())),
    fuelType: parseFuelType(req.query("type") ?? req.query("fueltype")),
    language: parseLanguage(req.query("lang") ?? req.query("language")),
  };
}

function parseDate(dateStr: string | undefined, defaultDate: Date): Date {
  let date = defaultDate;
  if (dateStr) {
    try {
      const format = "yyyy-MM-dd";
      date = parse(dateStr, format, new Date());
    } catch (error) {
      console.error(`failed to parse date. input=${dateStr}`, error);
    }
  }
  return date;
}

function parseLanguage(langStr?: string): Language {
  switch (langStr?.toLowerCase()) {
    case "da":
      return "da";
    default:
      return "en";
  }
}

function parseFuelType(fuelTypeStr?: string): FuelType {
  switch (fuelTypeStr?.toLowerCase()) {
    case "octane100":
      return "Octane100";
    case "diesel":
      return "Diesel";
    default:
      return "Unleaded95";
  }
}
