const { Builder, Browser, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
require('chromedriver');

async function scrapeGitHubProfile(username) {
    
    let driver = await new Builder().forBrowser(Browser.CHROME).build();
    try {
        await driver.get(`https://github.com/${username}`);
        
        // Wait up to 5 seconds for the name element to appear in the DOM
        let nameElement = await driver.wait(until.elementLocated(By.css('.p-nickname')), 5000);
        
        
        // Extract the visible text from the elements
        let fullName = await nameElement.getText();
        
        
        console.log(`Extracted Name: ${fullName}`);
       ;
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await driver.quit();
    }
}

scrapeGitHubProfile('flxkers');