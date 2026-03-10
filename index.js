const { Builder, Browser } = require('selenium-webdriver');
require('chromedriver');

async function scrapeGitHubProfile(username) {
    // 1. Build and launch the Chrome browser instance
    let driver = await new Builder().forBrowser(Browser.CHROME).build();

    try {
        // 2. Construct the URL and navigate to it
        const targetUrl = `https://github.com/${username}`;
        console.log(`Navigating to: ${targetUrl}`);
        
        await driver.get(targetUrl);
        
        console.log("Page loaded successfully.");

    } catch (error) {
        console.error("Error during execution:", error);
    } finally {
        // 3. Close the browser session to free up system resources
        await driver.quit();
    }
}

// Execute the function with a test username
scrapeGitHubProfile('torvalds');