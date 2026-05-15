const express = require('express');
const { Builder, Browser, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const app = express();
const PORT = 3000;

app.use(express.static('public'));

// Add CORS headers so Live Server (port 5500) can access the API
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

async function scrapeGitHubProfile(username) {
    let options = new chrome.Options();

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

        let nameElement = await driver.wait(until.elementLocated(By.css('.p-nickname')), 4000);
        let contrElement = await driver.wait(until.elementLocated(By.css('#js-contribution-activity-description')), 4000);

        let fullName = await nameElement.getText();
        let contrib = await contrElement.getText();

        let bioText = "No bio available";
        try {
            bioText = await driver.findElement(By.css('.user-profile-bio')).getText();
        } catch (error) { }

        let repoCount = "0";
        let starCount = "0";
        try {
            await driver.wait(until.elementLocated(By.css('a[data-tab-item="repositories"]')), 3000);

            repoCount = await driver.executeScript(`
                let counterElement = document.querySelector('a[data-tab-item="repositories"] span[data-component="counter"] span');
                return counterElement ? counterElement.textContent.trim() : "0";
            `);

            starCount = await driver.executeScript(`
                let counterElement = document.querySelector('a[data-tab-item="stars"] span[data-component="counter"] span');
                return counterElement ? counterElement.textContent.trim() : "0";
            `);
        } catch (error) { }

        let pinnedRepos = [];
        try {
            let repoLinks = await driver.findElements(By.css('.pinned-item-list-item a.Link'));

            for (let repoLink of repoLinks) {
                let name = await repoLink.getText();
                let url = await repoLink.getAttribute('href');
                if (name && url) pinnedRepos.push({ name, url });
            }
        } catch (error) { }

        let repoDescriptions = [];
        if (pinnedRepos.length > 0) {
            for (let repo of pinnedRepos) {
                try {
                    await driver.get(repo.url);
                    await driver.sleep(1500);

                    let descText = "No description available.";
                    try {
                        let firstParagraph = await driver.wait(until.elementLocated(By.css('article.markdown-body p')), 2000);
                        descText = await firstParagraph.getText();
                    } catch (err) { }

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
                    } catch (err) { }

                    repoDescriptions.push({
                        name: repo.name,
                        description: descText.trim(),
                        languages: langsText
                    });
                } catch (error) {
                    repoDescriptions.push({
                        name: repo.name,
                        description: "Failed to load",
                        languages: "N/A"
                    });
                }
            }
        }

        return {
            name: fullName,
            bio: bioText,
            repositories: repoCount,
            stars: starCount,
            contributions: contrib,
            topRepositories: repoDescriptions
        };

    } catch (error) {
        throw new Error("Failed to scrape profile.");
    } finally {
        await driver.quit();
    }
}

// --- EXPRESS API ---
app.get('/scrape', async (req, res) => {
    const username = req.query.username;

    if (!username) {
        return res.status(400).json({ error: "Please provide a username." });
    }

    try {
        console.log(`Scraping data for ${username}...`);
        const profileData = await scrapeGitHubProfile(username);

        res.json(profileData);
        console.log("Data sent to client.");
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});