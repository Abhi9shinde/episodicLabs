const puppeteer = require("puppeteer");

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
};

async function scrapeCompany(page, name, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

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
  }

  console.table(results);

  await browser.close();
})();
