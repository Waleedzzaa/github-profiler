const { Builder, Browser, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
require('chromedriver');

async function scrapeGitHubProfile(username) {
    let driver = await new Builder().forBrowser(Browser.CHROME).build();
    try {
        await driver.get(`https://github.com/${username}`);
        
        let nameElement = await driver.wait(until.elementLocated(By.css('.p-nickname')), 5000);
        
        // Added the missing period (.) to correctly target the CSS class
        let contrElement = await driver.wait(until.elementLocated(By.css('#js-contribution-activity-description')), 5000);
        
        let fullName = await nameElement.getText();
        let contrib = await contrElement.getText();
        
        console.log(`Extracted Name: ${fullName}`);
        console.log(`Contributions: ${contrib}`);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await driver.quit();
    }
}

scrapeGitHubProfile('Mark');