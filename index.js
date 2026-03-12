const readline = require('readline');
const { Builder, Browser, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
require('chromedriver');

async function scrapeGitHubProfile(username) {
    let options = new chrome.Options();
    
    // --- CHROME OPTIONS ---
    options.addArguments('--headless=new');
    options.addArguments('--log-level=3');
    options.addArguments('--disable-logging');
    options.excludeSwitches(['enable-logging']);
    options.setPageLoadStrategy('eager');

    let service = new chrome.ServiceBuilder().loggingTo('NUL');

    let driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .setChromeOptions(options)
        .setChromeService(service) 
        .build();

    try {
        await driver.get(`https://github.com/${username}`);

        // Wait for core elements
        let nameElement = await driver.wait(until.elementLocated(By.css('.p-nickname')), 5000);
        let contrElement = await driver.wait(until.elementLocated(By.css('#js-contribution-activity-description')), 5000);

        let fullName = await nameElement.getText();
        let contrib = await contrElement.getText();

        // --- Bio Extraction ---
        let bioText = "No bio available";
        try {
            bioText = await driver.findElement(By.css('.user-profile-bio')).getText();
        } catch (e) {}

        // --- Repositories and Stars Extraction (Regex Method) ---
        let repoCount = "0";
        let starCount = "0";
        try {
            // 1. Wait for the Repositories tab to load, grab all text inside it, and extract the digits
            let repoTab = await driver.wait(until.elementLocated(By.css('a[data-tab-item="repositories"]')), 5000);
            let repoText = await repoTab.getAttribute('textContent'); 
            let repoMatch = repoText.match(/\d+/); 
            if (repoMatch) repoCount = repoMatch[0];

            // 2. Find the Stars tab, grab all text inside it, and extract the digits
            let starTab = await driver.findElement(By.css('a[data-tab-item="stars"]'));
            let starText = await starTab.getAttribute('textContent');
            let starMatch = starText.match(/\d+/);
            if (starMatch) starCount = starMatch[0];
        } catch (e) {
            // Silently keep default "0" if elements aren't found
        }

        // --- Print Results ---
        console.log(`\n--- Profile Data ---`);
        console.log(`Name: ${fullName}`);
        console.log(`Bio: ${bioText}`);
        console.log(`Repositories: ${repoCount}`);
        console.log(`Stars: ${starCount}`);
        console.log(`Contributions: ${contrib}`);
        console.log(`--------------------\n`);

    } catch (error) {
        console.error("\nError:", error.message);
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
    console.log("Retrieving info, please wait...");
    scrapeGitHubProfile(username.trim()).then(() => {
        rl.close();
    });
});