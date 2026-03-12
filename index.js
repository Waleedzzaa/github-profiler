const readline = require('readline');
const { Builder, Browser, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
require('chromedriver');

async function scrapeGitHubProfile(username) {
    let options = new chrome.Options();
    
    // --- CHROME OPTIONS EXPLAINED ---
    // Run Chrome invisibly in the background
    options.addArguments('--headless=new');
    
    // Suppress general browser console warnings and errors
    options.addArguments('--log-level=3');
    options.addArguments('--disable-logging');
    
    // Specifically block the "DevTools listening" message
    options.excludeSwitches(['enable-logging']);
    
    // Speed up execution by scraping as soon as the HTML DOM loads (ignores images/heavy scripts)
    options.setPageLoadStrategy('eager');

    // Route underlying ChromeDriver background logs to the Windows null device (complete silence)
    let service = new chrome.ServiceBuilder().loggingTo('NUL');

    let driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .setChromeOptions(options)
        .setChromeService(service) 
        .build();

    try {
        await driver.get(`https://github.com/${username}`);

        let nameElement = await driver.wait(until.elementLocated(By.css('.p-nickname')), 5000);
        let contrElement = await driver.wait(until.elementLocated(By.css('#js-contribution-activity-description')), 5000);

        let fullName = await nameElement.getText();
        let contrib = await contrElement.getText();
      // --- Simplified Bio Extraction ---
        let bioText = "No bio available"; // 1. Set a default
        try {
            // 2. Try to overwrite it with the real bio
            bioText = await driver.findElement(By.css('.user-profile-bio')).getText();
        } catch (e) {
            // 3. Do nothing if it fails. It keeps the default.
        }
        console.log(`\n--- Profile Data ---`);
        console.log(` Name: ${fullName}`);
        console.log(`Bio: ${bioText}`);
        console.log(`Contributions: ${contrib}`);
        console.log(`--------------------\n`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await driver.quit();
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.clear(); 

rl.question("Enter GitHub Username: ", (username) => {
    console.log("retrieving info, please wait.");
    scrapeGitHubProfile(username.trim()).then(() => {
        rl.close();
    });
});