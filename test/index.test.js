const superstatic = require('superstatic').server;
const puppeteer = require('puppeteer');

describe('iStället', () => {
  let server, browser, page;
  const getInnerText = selector => page.$eval(selector, el => el.innerText.trim());

  const PORT = 3474;
  const url = `http://localhost:${PORT}`;

  beforeAll(done => {
    const app = superstatic({ port: PORT });
    server = app.listen(done);
  });

  afterAll(() => server.close());

  beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    page = await browser.newPage();
  });

  afterEach(() => {
    browser.close()
  });

  test('list', async () => {
    await page.goto(`${url}?favoriter=Östra%20Hamngatan`);
    await page.waitFor('[data-ta-id="loaded"]');

    expect(await getInnerText('[data-ta-id="favoriter"] [data-ta-id="name"]')).toBe('Östra Hamngatan');
    expect(await getInnerText('[data-ta-id="favoriter"] [data-ta-id="bikes"]')).toMatch(/^\d+$/);
    expect(await getInnerText('[data-ta-id="favoriter"] [data-ta-id="stands"]')).toMatch(/^\d+$/);

    await page.click('[data-ta-id="favoriter"] [data-ta-id="favorite-link"]');
    expect(await page.$('[data-ta-id="favoriter"]')).toBe(null);
    await page.click('[data-ta-id="favorite-link"]');
    expect(await page.$('[data-ta-id="favoriter"]')).not.toBe(null);

    await page.click('[data-ta-id="favoriter"] [data-ta-id="name"]');
    await page.waitFor('[data-ta-id="map"]');
  });

  test('tabs', async () => {
    await page.goto(`${url}?favoriter=Östra%20Hamngatan`);
    await page.waitFor('[data-ta-id="loaded"]');

    await page.click('[data-ta-id="map-link"]');
    await page.waitFor('[data-ta-id="map"]');

    await page.click('[data-ta-id="list-link"]');
    await page.waitFor('[data-ta-id="list"]');
  });

  test('map', async () => {
    await page.goto(`${url}/karta?favoriter=Östra%20Hamngatan`);
    await page.waitFor('[data-ta-id="loaded"]');

    await page.waitFor('.leaflet-container .marker');
    const { x, y } = await page.evaluate(() => ({ x: innerWidth / 2, y: innerHeight / 2 - 10 }));
    await page.mouse.click(x, y);
    await page.waitFor('.leaflet-popup-content');
    expect(await getInnerText('[data-ta-id="map"] [data-ta-id="marker-link"]')).toBe('Östra Hamngatan');
    await page.click('.leaflet-popup-content [data-ta-id="heart-icon-filled"]');

    await page.waitFor('.leaflet-popup-content [data-ta-id="heart-icon"]');

    expect(await page.evaluate(() => location.pathname)).toBe('/karta');
  });
});
