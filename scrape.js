const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const companies = {
  RELIANCE:
    "https://www.moneycontrol.com/india/stockpricequote/refineries/relianceindustries/RI",
  TCS: "https://www.moneycontrol.com/india/stockpricequote/computers-software/tataconsultancyservices/TCS",
  INFY: "https://www.moneycontrol.com/india/stockpricequote/computers-software/infosys/IT",
  HDFCBANK:
    "https://www.moneycontrol.com/india/stockpricequote/banks-private-sector/hdfcbank/HDF01",
  ICICIBANK:
    "https://www.moneycontrol.com/india/stockpricequote/banks-private-sector/icicibank/ICI02",
  HINDUNILVR:
    "https://www.moneycontrol.com/india/stockpricequote/personal-care/hindustanunilever/HU",
  SBIN: "https://www.moneycontrol.com/india/stockpricequote/banks-public-sector/statebankindia/SBI",
  KOTAKBANK:
    "https://www.moneycontrol.com/india/stockpricequote/banks-private-sector/kotakmahindrabank/KMB",
  ITC: "https://www.moneycontrol.com/india/stockpricequote/cigarettes/itc/ITC",
  LT: "https://www.moneycontrol.com/india/stockpricequote/constructioncontracting-civil/larsentoubro/LT",
  TECH_MAHINDRA:
    "https://www.moneycontrol.com/india/stockpricequote/computers-software/techmahindra/TM4",
};

// Google Sheets
const { google } = require("googleapis");

// Load credentials
const fs = require("fs");
let credentials;

if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
  // On GitHub Actions - parse and write to file
  const decoded = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
  fs.writeFileSync("credentials.json", JSON.stringify(decoded, null, 2));
  credentials = decoded;
} else {
  // Local machine - load the already present file
  credentials = require("./credentials.json");
}

// Function to write data to Google Sheets
async function writeToSheet(data) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth: await auth.getClient() });

  const spreadsheetId = "1BoLT_UZgvD2XHdZnNwDjMELSO983sv-Vb9mawJfSRoc";

  const headers = [
    [
      "Name",
      "Strength",
      "Weakness",
      "Opportunity",
      "Threat",
      "MC Essential Score",
      "Timestamp",
    ],
  ];

  const values = data.map((item) => [
    item.name,
    item.Strengths,
    item.Weakness,
    item.Opportunity,
    item.Threat,
    item.Mc_Essentials,
    new Date().toLocaleString(),
  ]);

  // Combine header + data
  const allRows = [...headers, ...values];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: allRows,
    },
  });
}

// Web Scraping
async function scrapeCompany(page, name, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });

    // Waiting for the Strength element to appear
    await page.waitForSelector("#swot_ls strong", { timeout: 10000 });

    // Extracting SWOT data by only one function because the structure is similar just need to change the id
    const swotData = await page.evaluate(() => {
      const extractCount = (id) => {
        const el = document.querySelector(`#${id} strong`);
        if (!el) return null;
        const match = el.innerText.match(/\((\d+)\)/);
        return match ? parseInt(match[1]) : null;
      };

      return {
        Strengths: extractCount("swot_ls"),
        Weakness: extractCount("swot_lw"),
        Opportunity: extractCount("swot_lo"),
        Threat: extractCount("swot_lt"),
      };
    });

    const Mc_Essentials = await page.evaluate(() => {
      const mcEssElement = document.querySelector(".esbx");
      return mcEssElement ? mcEssElement.innerText.trim() : "N/A";
    });

    return {
      name,
      ...swotData,
      Mc_Essentials,
    };
  } catch (error) {
    console.error(`Error scraping ${name}: ${error.message}`);
    return {
      name,
      Strengths: "Error",
      Weakness: "Error",
      Opportunity: "Error",
      Threat: "Error",
      Mc_Essentials: "Error",
    };
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: 180000, // extend protocol timeout
    timeout: 120000, // extend launch timeout
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
  );

  await page.setViewport({ width: 1280, height: 800 });

  const results = [];

  for (const [name, url] of Object.entries(companies)) {
    console.log(`Scraping ${name}...`);
    const result = await scrapeCompany(page, name, url);
    results.push(result);
    await delay(3000);
  }
  writeToSheet(results);

  console.table(results);

  await browser.close();
})();
