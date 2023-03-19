CREATE TABLE IF NOT EXISTS fuelprices(
    fueltype INTEGER not null,
    date DATETIME not null,
    price REAL NOT NULL,
    prevPrices JSON NOT NULL,
    PRIMARY KEY(fueltype, date)
);

CREATE INDEX IF NOT EXISTS fuelprices_date_index ON fuelprices(date);

CREATE INDEX IF NOT EXISTS fuelprices_fueltype_index ON fuelprices(fueltype);