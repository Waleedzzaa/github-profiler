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
        } catch (error) {}

        // --- Repositories and Stars Extraction ---
        let repoCount = "0";
        let starCount = "0";
        try {
            await driver.wait(until.elementLocated(By.css('a[data-tab-item="repositories"]')), 5000);

            repoCount = await driver.executeScript(`
                let counterElement = document.querySelector('a[data-tab-item="repositories"] span[data-component="counter"] span');
                return counterElement ? counterElement.textContent.trim() : "0";
            `);

            starCount = await driver.executeScript(`
                let counterElement = document.querySelector('a[data-tab-item="stars"] span[data-component="counter"] span');
                return counterElement ? counterElement.textContent.trim() : "0";
            `);
        } catch (error) {}

        // --- 1. Gather Pinned Repo Names and Links ---
        let pinnedRepos = [];
        try {
            let repoLinks = await driver.findElements(By.css('.pinned-item-list-item a.Link'));
            
            for (let repoLink of repoLinks) {
                let name = await repoLink.getText();
                let url = await repoLink.getAttribute('href');
                if (name && url) pinnedRepos.push({ name, url });
            }
        } catch (error) {}

        // --- 2. Navigate to each Repo and Extract README & Languages ---
        let repoDescriptions = [];
        if (pinnedRepos.length > 0) {
            console.log(`\nScanning ${pinnedRepos.length} repositories for data...`);
            
            for (let repo of pinnedRepos) {
                try {
                    await driver.get(repo.url);
                    
                    // Allow GitHub's dynamic DOM to settle
                    await driver.sleep(1500); 

                    // Extract README First Paragraph
                    let descText = "No description available.";
                    try {
                        let firstParagraph = await driver.wait(until.elementLocated(By.css('article.markdown-body p')), 3000);
                        descText = await firstParagraph.getText();
                    } catch (err) {}

                    // Extract Languages & Percentages
                    let langsText = "Not specified";
                    try {
                        let langElements = await driver.findElements(By.css('.BorderGrid-cell li.d-inline'));
                        let langArray = [];
                        
                        for (let langEl of langElements) {
                            let text = await langEl.getAttribute('textContent'); 
                            
                            if (text && text.includes('%')) {
                                langArray.push(text.replace(/\s+/g, ' ').trim()); 
                            }
                        }
                        
                        if (langArray.length > 0) langsText = langArray.join(', ');
                    } catch (err) {}
                    
                    repoDescriptions.push(`- ${repo.name}: ${descText.trim()}\n  Languages: ${langsText}`);
                } catch (error) {
                    repoDescriptions.push(`- ${repo.name}: Failed to load repository data.`);
                }
            }
        }

        // --- Print Results ---
        console.log(`\n--- Profile Data ---`);
        console.log(`Name: ${fullName}`);
        console.log(`Bio: ${bioText}`);
        console.log(`Repositories: ${repoCount}`);
        console.log(`Stars: ${starCount}`);
        console.log(`Contributions: ${contrib}`);
        console.log(`\nTop Repositories:`);
        repoDescriptions.forEach(repo => console.log(repo));
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